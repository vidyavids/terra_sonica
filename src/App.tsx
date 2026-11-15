import { useEffect, useRef } from 'react';
import ElementPage from './components/ElementPage';
import HomePage from './components/HomePage';
import Nav from './components/Nav';
import SiteFooter from './components/SiteFooter';
import Starfield from './components/Starfield';
import { trackRouteId } from './data/elements';
import { useHashRoute } from './hooks/useHashRoute';
import type { Route } from './hooks/useHashRoute';

function focusEl(selector: string): void {
  const el = document.querySelector(selector);
  if (el instanceof HTMLElement) el.focus({ preventScroll: true });
}

export default function App() {
  const { route, fading } = useHashRoute();
  const prevRoute = useRef<Route | null>(null);
  useEffect(() => {
    const prev = prevRoute.current;
    prevRoute.current = route;
    if (route.name === 'player') {
      focusEl(`#${trackRouteId(route.track)} h3`);
    } else if (route.name === 'element') {
      if (prev?.name === 'player' && prev.slug === route.slug) {
        focusEl(`a[href="#/${route.slug}/${trackRouteId(prev.track)}"]`);
      } else {
        focusEl('main h1');
      }
    } else if (prev !== null && prev.name !== 'home') {
      focusEl(`#experiences a[href="#/${prev.slug}"]`);
    }
  }, [route]);
  return (
    <>
      <a
        href="#main"
        onClick={() => document.getElementById('main')?.focus()}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-atmos focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-950"
      >
        Skip to main content
      </a>
      <Starfield />
      <Nav />
      <main
        id="main"
        tabIndex={-1}
        className={`ts-fade ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        {route.name === 'home' ? (
          <HomePage />
        ) : (
          <ElementPage
            slug={route.slug}
            track={route.name === 'player' ? route.track : null}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
