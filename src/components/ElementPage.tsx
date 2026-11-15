import { elementHash, findElement, playerHash } from '../data/elements';
import type { ElementSlug, PanelTrack } from '../data/elements';
import { Legend } from './Experiences';
import { FireTrackPanel } from './FirePanel';
import { ForestTrackPanel } from './ForestPanel';
import { TrackPanel } from './PlayerSection';
import { SkyTrackPanel } from './SkyPanel';

interface ElementPageProps {
  slug: ElementSlug;
  track: PanelTrack | null;
}

export default function ElementPage({ slug, track }: ElementPageProps) {
  const el = findElement(slug);
  if (!el) return null;
  const playable = el.subs.find((s) => s.status === 'playable');
  const showPlayer = track !== null && playable?.track === track;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <a
        href="#experiences"
        className="inline-block text-atmos hover:text-cloud hover:underline"
      >
        ← Back to the Jukebox
      </a>
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight text-cloud">
            {el.element} — {el.experience}
          </h1>
          <p className="mt-2 text-atmos">{el.strapline}</p>
          <img
            src={el.image}
            alt={el.imageAlt}
            className="mt-5 h-64 w-full rounded-lg border border-atmos/20 object-cover md:h-[340px]"
          />
          <p className="mt-4 text-slate-200">{el.description}</p>
          <h2 className="mt-6 text-lg font-semibold text-cloud">
            Scientific context
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {el.context}
          </p>
        </div>
        <div className="lg:col-span-7">
          {showPlayer && track ? (
            <>
              <a
                href={elementHash(el.slug)}
                className="inline-block text-atmos hover:text-cloud hover:underline"
              >
                ← {el.element} tracks
              </a>
              <div className="mt-4">
                {track === 'fire' ? (
                  <FireTrackPanel />
                ) : track === 'sky' ? (
                  <SkyTrackPanel />
                ) : track === 'forest' ? (
                  <ForestTrackPanel />
                ) : (
                  <TrackPanel track={track} />
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-cloud">
                Tracks on this element
              </h2>
              <ul className="mt-4 space-y-4">
                {el.subs.map((s) =>
                  s.status === 'playable' && s.track ? (
                    <li key={s.label}>
                      <a
                        href={playerHash(el.slug, s.track)}
                        className="block overflow-hidden rounded-xl border border-forest/60 shadow-[0_0_24px_rgba(54,168,134,0.25)] transition-colors hover:border-forest"
                      >
                        <span className="relative block h-44">
                          <img
                            src={el.image}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/60 to-abyss/10"
                          />
                          <span className="absolute inset-x-0 bottom-0 block p-4">
                            <span className="font-semibold text-atmos drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                              {s.label}
                            </span>{' '}
                            <span className="whitespace-nowrap rounded-full border border-forest/50 bg-forest/20 px-2 py-0.5 font-mono text-xs text-emerald-200 shadow-[0_0_12px_rgba(54,168,134,0.35)]">
                              ▶ Playable Now
                            </span>
                            <span className="mt-1 block text-sm text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                              Open the player →
                            </span>
                          </span>
                        </span>
                      </a>
                    </li>
                  ) : (
                    <li
                      key={s.label}
                      data-planned="true"
                      className="relative h-44 overflow-hidden rounded-xl border border-atmos/20"
                    >
                      <img
                        src={el.image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover saturate-50 brightness-75"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/80 to-abyss/40"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <span className="font-semibold text-slate-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                          {s.label}
                        </span>
                        {s.detail ? (
                          <span className="text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                            {' '}
                            — {s.detail}
                          </span>
                        ) : null}{' '}
                        <span className="whitespace-nowrap rounded-full bg-slate-700/50 px-2 py-0.5 font-mono text-xs text-slate-200">
                          {s.statusLabel ?? 'Planned — coming soon'}
                        </span>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
        </div>
      </div>
      {!showPlayer && <Legend />}
    </div>
  );
}
