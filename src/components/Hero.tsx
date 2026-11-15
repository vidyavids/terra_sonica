import { useMemo } from 'react';
import { mulberry32 } from '../utils/random';

function WaveAccent() {
  const bars = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: 28 }, () => ({
      height: `${30 + Math.floor(rand() * 70)}%`,
      delay: `${(rand() * 1.8).toFixed(2)}s`,
      duration: `${(1.4 + rand() * 0.8).toFixed(2)}s`,
    }));
  }, []);
  return (
    <div aria-hidden="true" className="flex h-8 items-end gap-1">
      {bars.map((b, i) => (
        <span
          key={i}
          className="ts-wave-bar w-1 rounded bg-atmos/70"
          style={{
            height: b.height,
            animationDelay: b.delay,
            animationDuration: b.duration,
          }}
        />
      ))}
    </div>
  );
}

export default function Hero() {
  return (
    <header id="top" className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:pt-14">
        <div className="grid min-h-[80svh] items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <h1 className="text-6xl font-bold tracking-tight text-cloud sm:text-7xl lg:text-8xl">
              TERRA SONICA
            </h1>
            <p className="mt-3 text-2xl text-atmos">The Sounding Earth</p>
            <p className="mt-5 max-w-xl text-slate-300">
              Real Earth observations, converted to sound — an
              accessible, artistic way to experience a changing planet.
            </p>
            <div className="mt-8">
              <WaveAccent />
            </div>
            <a
              href="#experiences"
              className="mt-8 inline-block rounded bg-atmos px-8 py-3 font-semibold text-slate-950 shadow-[0_0_28px_rgba(86,199,245,0.45)] hover:shadow-[0_0_36px_rgba(86,199,245,0.65)]"
            >
              Enter the Jukebox
            </a>
            <p className="mt-3 text-xs text-slate-400">
              NASA Space Apps Challenge 2026 · The Earth Information Jukebox
            </p>
          </div>
          <figure className="md:col-span-7">
            <img
              src="/images/hero-blue-marble.jpg"
              alt="The Blue Marble: full-disk Earth showing Africa, the Atlantic Ocean, and Antarctica"
              className="w-full rounded-lg [mask-image:radial-gradient(circle,black_60%,transparent_72%)] drop-shadow-[0_0_120px_rgba(86,199,245,0.55)]"
              fetchPriority="high"
            />
            <figcaption className="mt-1 text-center font-mono text-xs text-slate-400">
              The Blue Marble (remastered), Apollo 17 photograph, 1972.
              Credit: NASA.
            </figcaption>
          </figure>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div>
            <h2 className="font-semibold text-cloud">Science to Sound</h2>
            <p className="mt-1 text-sm text-slate-300">
              Earth data mapped to music.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-cloud">Inclusive by Design</h2>
            <p className="mt-1 text-sm text-slate-300">
              Experience climate through listening.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-cloud">Real NASA Data</h2>
            <p className="mt-1 text-sm text-slate-300">
              Trusted, open observations.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
