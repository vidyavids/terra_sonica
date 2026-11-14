export default function Nav() {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-10 border-b border-slate-800 bg-abyss/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <a href="#top" className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-atmos"
            aria-hidden="true"
            fill="currentColor"
          >
            <rect x="3" y="9" width="3" height="6" rx="1" />
            <rect x="8" y="5" width="3" height="14" rx="1" />
            <rect x="13" y="8" width="3" height="8" rx="1" />
            <rect x="18" y="11" width="3" height="5" rx="1" />
          </svg>
          <span className="text-base font-bold tracking-widest text-white">
            Terra Sonica
          </span>
        </a>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <a className="text-slate-300 hover:text-atmos" href="#experiences">
            Jukebox
          </a>
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
          className="ml-auto"
          href="https://www.nasa.gov/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="/images/nasa-meatball.svg"
            alt="NASA"
            className="h-8 w-auto"
          />
        </a>
      </div>
    </nav>
  );
}
