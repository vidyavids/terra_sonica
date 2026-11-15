import { ELEMENTS, elementHash } from '../data/elements';

function ElementIcon({ element }: { element: string }) {
  const cls =
    'h-6 w-6 shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]';
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  switch (element) {
    case 'AIR':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...stroke}>
          <path d="M3 8h12M3 12h18M3 16h8" />
        </svg>
      );
    case 'WATER':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...stroke}>
          <path d="M2 9q2.5-3 5 0t5 0t5 0t5 0" />
          <path d="M2 15q2.5-3 5 0t5 0t5 0t5 0" />
        </svg>
      );
    case 'EARTH':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...stroke}>
          <circle cx="12" cy="9" r="5" />
          <path d="M12 14v7" />
        </svg>
      );
    case 'FIRE':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...stroke}>
          <path d="M12 22c4.4 0 7-2.8 7-6.5 0-4-3.5-6-4.5-9C13 4 12 2 12 2S5 9 5 15.5C5 19.2 7.6 22 12 22Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...stroke}>
          <path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" />
        </svg>
      );
  }
}

function previewLabel(element: string): string {
  const word = element.split(' ')[0].toLowerCase();
  return `Preview ${word.charAt(0).toUpperCase() + word.slice(1)}`;
}

export function Legend() {
  return (
    <ul
      className="mt-6 flex w-fit flex-wrap items-center gap-x-5 gap-y-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-5 py-2.5 text-sm"
      aria-label="Legend"
    >
      <li className="flex items-center gap-2">
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4 shrink-0 text-emerald-400"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M6.5 5.8v4.4L10 8Z" fill="currentColor" stroke="none" />
        </svg>
        <span>
          <strong className="text-cloud">▶ Playable Now</strong>{' '}
          <span className="text-slate-300">
            — Explore a working sonification
          </span>
        </span>
      </li>
      <li
        aria-hidden="true"
        className="hidden h-5 w-px bg-slate-600 sm:block"
      />
      <li className="flex items-center gap-2">
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4 shrink-0 text-slate-300"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 5v3.2l2.2 1.3" strokeLinecap="round" />
        </svg>
        <span>
          <strong className="text-cloud">Planned Experience</strong>{' '}
          <span className="text-slate-300">
            — Part of our full Earth Jukebox vision
          </span>
        </span>
      </li>
    </ul>
  );
}

export default function Experiences() {
  return (
    <section
      id="experiences"
      aria-label="Experiences"
      className="mx-auto max-w-7xl px-4 py-10"
    >
      <p className="text-sm font-semibold tracking-widest text-atmos [font-variant:small-caps]">
        The Earth Jukebox
      </p>
      <h2 className="mt-1 text-4xl font-bold tracking-tight text-cloud">
        Hear Our <span className="italic text-atmos">Planet</span>
      </h2>
      <p className="mt-3 max-w-3xl text-slate-300">
        Explore Earth through sound. Each experience turns real Earth
        observations into music, revealing a different story about our changing
        planet.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {ELEMENTS.map((el, i) => {
          const playableSub = el.subs.find((s) => s.status === 'playable');
          const cardClass = `relative block overflow-hidden rounded-xl border ${
            playableSub
              ? 'border-forest/60 shadow-[0_0_24px_rgba(54,168,134,0.25)] transition-colors hover:border-forest'
              : 'border-atmos/20 shadow-[0_0_18px_rgba(86,199,245,0.10)]'
          }`;
          const cardBody = (
            <div className="relative h-96">
              <img
                src={el.image}
                alt={el.imageAlt}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/60 to-abyss/10"
              />
              {!playableSub && (
                <span className="absolute left-4 top-4 whitespace-nowrap rounded-full border border-slate-500/50 bg-slate-700/60 px-2.5 py-1 font-mono text-xs text-slate-200">
                  Planned
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="flex items-center gap-2 text-cloud drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  <ElementIcon element={el.element} />
                  <h3 className="text-lg font-bold">
                    {i + 1}. {el.element} — {el.experience}
                  </h3>
                </div>
                <p className="mt-2 text-base text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {el.strapline}
                </p>
                <ul className="mt-3 space-y-2">
                  {el.subs.map((s) =>
                    s.status === 'playable' ? (
                      <li key={s.label}>
                        <span className="text-atmos drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                          {s.label}
                        </span>{' '}
                        <span className="whitespace-nowrap rounded-full border border-forest/50 bg-forest/20 px-2 py-0.5 font-mono text-xs text-emerald-200 shadow-[0_0_12px_rgba(54,168,134,0.35)]">
                          ▶ Playable Now
                        </span>
                      </li>
                    ) : (
                      <li
                        key={s.label}
                        data-planned="true"
                        className="text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                      >
                        {s.label}
                        {s.detail ? ` — ${s.detail}` : ''}{' '}
                        <span className="whitespace-nowrap rounded-full bg-slate-700/50 px-2 py-0.5 font-mono text-xs text-slate-200">
                          {s.statusLabel ?? 'Planned — coming soon'}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
                {!playableSub && (
                  <a
                    href={elementHash(el.slug)}
                    className="mt-3 inline-block text-sm text-atmos drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] hover:text-cloud hover:underline"
                  >
                    {previewLabel(el.element)} →
                  </a>
                )}
              </div>
            </div>
          );
          const label = `${el.element}: ${el.experience}`;
          return playableSub?.href ? (
            <a key={el.element} href={playableSub.href} className={cardClass}>
              <article aria-label={label}>{cardBody}</article>
            </a>
          ) : (
            <article key={el.element} aria-label={label} className={cardClass}>
              {cardBody}
            </article>
          );
        })}
      </div>
      <div
        data-planned="true"
        className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
      >
        <p className="text-slate-200">
          <span className="font-semibold text-cloud">
            A second documented musical layer for each element.
          </span>{' '}
          <span className="whitespace-nowrap rounded-full bg-slate-700/50 px-2 py-0.5 font-mono text-xs text-slate-200">
            Planned — coming soon
          </span>
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Fire and Sky already have a second data-driven voice (the FRP
          drone and the growth voice). Air, Water, and Earth will each
          get one too, documented the same way in Explain My Sound.
        </p>
      </div>
      <Legend />
    </section>
  );
}
