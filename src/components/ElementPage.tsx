import { elementHash, findElement, playerHash } from '../data/elements';
import type { ElementSlug, PanelTrack } from '../data/elements';
import { TrackPanel } from './PlayerSection';

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
          <h1 className="text-3xl font-bold tracking-tight text-cloud">
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
                <TrackPanel track={track} />
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
                        className="block rounded-lg border border-forest/60 bg-slate-900/40 p-5 shadow-[0_0_24px_rgba(54,168,134,0.25)] transition-colors hover:border-forest"
                      >
                        <span className="text-lg font-semibold text-atmos">
                          {s.label}
                        </span>{' '}
                        <span className="whitespace-nowrap rounded border border-forest/50 bg-forest/20 px-2 py-0.5 font-mono text-xs text-emerald-200 shadow-[0_0_12px_rgba(54,168,134,0.35)]">
                          ▶ Playable Now
                        </span>
                        <span className="mt-2 block text-sm text-slate-300">
                          Open the player →
                        </span>
                      </a>
                    </li>
                  ) : (
                    <li
                      key={s.label}
                      data-planned="true"
                      className="rounded-lg border border-atmos/20 bg-slate-900/40 p-5"
                    >
                      <span className="text-lg font-semibold text-slate-200">
                        {s.label}
                      </span>
                      {s.detail ? (
                        <span className="text-slate-300"> — {s.detail}</span>
                      ) : null}{' '}
                      <span className="whitespace-nowrap rounded bg-slate-700/50 px-2 py-0.5 font-mono text-xs text-slate-300">
                        {s.statusLabel ?? 'Planned — coming soon'}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
