"use client";

import { filterChips, upNext } from "./watch-data";

// The "Up next" column: filter chips and a list of fictional videos.
export function UpNext() {
  return <aside className="yt-side" aria-label="Up next">
    <div className="yt-filters" role="list">{filterChips.map((chip, index) => <button key={chip} type="button" role="listitem" className={index === 0 ? "on" : ""}>{chip}</button>)}</div>
    <div className="yt-cards">
      {upNext.map((item) => <article className="yt-card" key={item.id}>
        <div className="yt-thumb" style={{ "--hue": item.hue } as React.CSSProperties}>
          {item.poster ? <img src={item.poster} alt="" /> : <span className="yt-thumb-art" aria-hidden="true" />}
          <span className="yt-duration">{item.duration}</span>
        </div>
        <div className="yt-card-body">
          <h3>{item.title}</h3>
          <p>{item.channel}{item.verified && <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Verified"><path fill="currentColor" d="M12 2 9.2 4.3 5.6 4.1 4.9 7.6 2 9.7l1.5 3.3L2 16.3l2.9 2.1.7 3.5 3.6-.2L12 24l2.8-2.3 3.6.2.7-3.5 2.9-2.1-1.5-3.3 1.5-3.3-2.9-2.1-.7-3.5-3.6.2Zm-1.4 15.4-3.9-3.9 1.4-1.4 2.5 2.5 5.6-5.6 1.4 1.4Z" /></svg>}</p>
          <p>{item.meta}</p>
        </div>
        <button type="button" className="yt-more" aria-label="More options"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 16.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" /></svg></button>
      </article>)}
    </div>
  </aside>;
}
