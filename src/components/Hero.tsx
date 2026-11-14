export default function Hero() {
  return (
    <header id="top" className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:pt-14">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-cloud sm:text-6xl">
            TERRA SONICA
          </h1>
          <p className="mt-2 text-2xl text-atmos">The Sounding Earth</p>
          <p className="mt-4 text-slate-300">
            Real NASA Earth observations, converted to sound — an accessible,
            artistic way to experience a changing planet.
          </p>
          <a
            href="#player"
            className="mt-6 inline-block rounded bg-atmos px-6 py-2 font-semibold text-slate-950 hover:brightness-110"
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
            className="w-full rounded-lg border border-slate-800"
            fetchPriority="high"
          />
          <figcaption className="mt-1 font-mono text-xs text-slate-400">
            The Blue Marble (remastered), Apollo 17 photograph, 1972. Credit:
            NASA.
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
    </header>
  );
}
