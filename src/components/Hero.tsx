import { useMemo } from 'react';

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  left: string;
  top: string;
  size: number;
  opacity: number;
  duration: string;
  delay: string;
}

function makeStars(seed: number, count: number): Star[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    left: `${(rand() * 100).toFixed(2)}%`,
    top: `${(rand() * 100).toFixed(2)}%`,
    size: rand() > 0.85 ? 2 : 1,
    opacity: 0.25 + rand() * 0.55,
    duration: `${(3 + rand() * 3).toFixed(2)}s`,
    delay: `${(rand() * 4).toFixed(2)}s`,
  }));
}

function Starfield() {
  const dim = useMemo(() => makeStars(42, 110), []);
  const bright = useMemo(() => makeStars(7, 26), []);
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {dim.map((s, i) => (
        <span
          key={`d${i}`}
          className="absolute rounded-full bg-cloud"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
          }}
        />
      ))}
      {bright.map((s, i) => (
        <span
          key={`b${i}`}
          className="ts-star-twinkle absolute rounded-full bg-cloud"
          style={{
            left: s.left,
            top: s.top,
            width: s.size + 1,
            height: s.size + 1,
            opacity: s.opacity,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}

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
    <div
      aria-hidden="true"
      className="flex h-8 items-end gap-1"
    >
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
      <Starfield />
      <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-10 sm:pt-14">
        <div className="grid min-h-[80svh] items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-6xl font-bold tracking-tight text-cloud sm:text-7xl">
              TERRA SONICA
            </h1>
            <p className="mt-2 text-2xl text-atmos">The Sounding Earth</p>
            <p className="mt-4 max-w-xl text-slate-300">
              Real NASA Earth observations, converted to sound — an
              accessible, artistic way to experience a changing planet.
            </p>
            <div className="mt-6">
              <WaveAccent />
            </div>
            <a
              href="#experiences"
              className="mt-6 inline-block rounded bg-atmos px-8 py-3 font-semibold text-slate-950 shadow-[0_0_28px_rgba(86,199,245,0.45)] hover:shadow-[0_0_36px_rgba(86,199,245,0.65)]"
            >
              Enter the Jukebox
            </a>
            <p className="mt-3 text-xs text-slate-400">
              NASA Space Apps Challenge 2026 · The Earth Information Jukebox
            </p>
          </div>
          <figure>
            <img
              src="/images/hero-blue-marble.jpg"
              alt="The Blue Marble: full-disk Earth showing Africa, the Atlantic Ocean, and Antarctica"
              className="w-full rounded-lg [mask-image:radial-gradient(circle,black_60%,transparent_72%)] drop-shadow-[0_0_80px_rgba(86,199,245,0.35)]"
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
