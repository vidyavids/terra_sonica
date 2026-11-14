export default function Nav() {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-10 border-b border-slate-800 bg-abyss/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <a
          href="#top"
          className="text-sm font-bold tracking-widest text-cloud"
        >
          TERRA SONICA
        </a>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <a className="text-slate-300 hover:text-atmos" href="#project">
            The Project
          </a>
          <a className="text-slate-300 hover:text-atmos" href="#how-it-works">
            How It Works
          </a>
          <a className="text-slate-300 hover:text-atmos" href="#data-methods">
            Data &amp; Methods
          </a>
          <a className="text-slate-300 hover:text-atmos" href="#accessibility">
            Accessibility
          </a>
        </div>
        <a
          className="ml-auto font-mono text-xs text-slate-400 hover:text-atmos"
          href="https://www.nasa.gov/"
          target="_blank"
          rel="noreferrer"
        >
          NASA
        </a>
      </div>
    </nav>
  );
}
