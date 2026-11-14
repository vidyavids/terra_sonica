import { useEffect, useRef, useState } from 'react';
import { TRACK_TITLES, findElement, trackFromRouteId } from '../data/elements';
import type { ElementSlug, PanelTrack } from '../data/elements';

export type Route =
  | { name: 'home'; anchor: string | null }
  | { name: 'element'; slug: ElementSlug }
  | { name: 'player'; slug: ElementSlug; track: PanelTrack };

const HOME_TITLE = 'Terra Sonica — The Sounding Earth';

function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '' || raw === '/') return { name: 'home', anchor: null };
  if (raw.startsWith('/')) {
    const [, slug, trackId] = raw.split('/');
    const el = findElement(slug ?? '');
    if (!el) return { name: 'home', anchor: null };
    if (trackId === undefined || trackId === '') {
      return { name: 'element', slug: el.slug };
    }
    const track = trackFromRouteId(trackId);
    const playable = el.subs.find((s) => s.status === 'playable');
    if (track && playable?.track === track) {
      return { name: 'player', slug: el.slug, track };
    }
    return { name: 'element', slug: el.slug };
  }
  // Legacy in-page player anchors redirect to the element player views.
  if (raw === 'track-1') return { name: 'player', slug: 'air', track: 'temp' };
  if (raw === 'track-2')
    return { name: 'player', slug: 'water', track: 'nino' };
  return { name: 'home', anchor: raw };
}

function sameView(a: Route, b: Route): boolean {
  if (a.name !== b.name) return false;
  if (a.name === 'home' || b.name === 'home') return true;
  if (a.slug !== b.slug) return false;
  if (a.name === 'player' && b.name === 'player') {
    return a.track === b.track;
  }
  return a.name === b.name;
}

function titleFor(route: Route): string {
  if (route.name === 'home') return HOME_TITLE;
  const el = findElement(route.slug);
  if (!el) return HOME_TITLE;
  if (route.name === 'player') {
    return `${TRACK_TITLES[route.track]} · ${el.element} | Terra Sonica`;
  }
  return `${el.element} — ${el.experience} | Terra Sonica`;
}

export function useHashRoute(): { route: Route; fading: boolean } {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(window.location.hash),
  );
  const [fading, setFading] = useState(false);
  const routeRef = useRef(route);
  const genRef = useRef(0);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    const onChange = () => {
      const next = parseHash(window.location.hash);
      if (sameView(next, routeRef.current)) return;
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      if (reduced) {
        setRoute(next);
        return;
      }
      genRef.current += 1;
      const gen = genRef.current;
      setFading(true);
      window.setTimeout(() => {
        if (genRef.current !== gen) return;
        setRoute(next);
        setFading(false);
      }, 220);
    };
    window.addEventListener('hashchange', onChange);
    return () => {
      genRef.current += 1;
      window.removeEventListener('hashchange', onChange);
    };
  }, []);

  useEffect(() => {
    if (route.name === 'home' && route.anchor) {
      const el = document.getElementById(route.anchor);
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);

  useEffect(() => {
    document.title = titleFor(route);
  }, [route]);

  return { route, fading };
}
