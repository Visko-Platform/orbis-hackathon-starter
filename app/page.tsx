import { OrbisDemo } from "@/components/orbis-demo";
import { Icon } from "@/components/ui";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#studio">
        Skip to studio
      </a>
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="#studio" aria-label="Orbis Studio home">
            <span className="brand-symbol">
              <Icon name="orbit" />
            </span>
            <span>
              orbis<span className="brand-suffix">studio</span>
            </span>
          </a>
          <nav className="top-nav" aria-label="Studio navigation">
            <a href="#studio" className="nav-active">
              <Icon name="play" />
              Studio
            </a>
            <a href="#heart-world">
              <Icon name="activity" />
              Heart world
            </a>
            <a href="#image-lab">
              <Icon name="sparkles" />
              Image lab
            </a>
          </nav>
          <span className="header-note caption">Powered by Reactor</span>
        </div>
      </header>
      <main id="studio">
        <header className="page-header">
          <div>
            <p className="eyebrow">Your creative workspace</p>
            <h1 className="heading-4">Create in motion.</h1>
            <p className="body-sm muted">
              One continuous video. Endless possibilities. You direct what
              happens next.
            </p>
          </div>
          <div className="model-label">
            <span className="model-icon">
              <Icon name="orbit" />
            </span>
            <span>
              <strong className="body-sm">Visko Orbis Stable</strong>
              <span className="caption muted">Real-time video generation</span>
            </span>
          </div>
        </header>
        <OrbisDemo />
        <footer className="app-footer">
          <span className="caption">Orbis Studio</span>
          <span className="caption">Made for exploration.</span>
        </footer>
      </main>
    </>
  );
}
