"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { UpNext } from "./up-next";
import { VideoPlayer } from "./video-player";
import { comments, featured } from "./watch-data";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";
import { DEFAULT_AD_AT_S, readWatchOptions } from "@/lib/watch/schedule";

// The viewer's side of the demo: a video page in the style of a familiar
// video site, with the interactive ad break inside the player. The live
// session is created only when the ad warms up.

export function WatchPage() {
  const token = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    token.current ??= requestReactorJwt().catch((error) => { token.current = null; throw error; });
    return token.current;
  }, []);
  const [options, setOptions] = useState({ adAt: DEFAULT_AD_AT_S, live: true });
  useEffect(() => { setOptions(readWatchOptions(window.location.search)); }, []);
  return <ReactorProvider apiUrl="https://api.reactor.inc" modelName={ORBIS_MODEL_NAME} modelTracks={[...ORBIS_TRACKS]} connectOptions={{ autoConnect: false }} jwtToken={getJwt}>
    <WatchShell adAt={options.adAt} live={options.live} />
  </ReactorProvider>;
}

function Glyph({ d, size = 24 }: { d: string; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path fill="currentColor" d={d} /></svg>;
}

const GLYPH = {
  menu: "M21 6H3V5h18v1zm0 5H3v1h18v-1zm0 6H3v1h18v-1z",
  search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  mic: "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3h2a7 7 0 0 1-6 6.92V21h-2v-3.08A7 7 0 0 1 5 11h2a5 5 0 0 0 10 0z",
  create: "M14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2zm3-8H3v14h18v-4l4 4V5l-4 4V5z",
  bell: "M10 20h4c0 1.1-.9 2-2 2s-2-.9-2-2zm10-2.65V19H4v-1.65l2-1.88v-5.15C6 7.4 7.56 5.1 10 4.34v-.38c0-1.42 1.49-2.5 2.99-1.76.65.32 1.01 1.03 1.01 1.76v.39c2.44.75 4 3.06 4 5.98v5.15l2 1.87zm-1-.42-2-1.88v-5.47c0-2.47-1.19-4.36-3.13-5.1-1.26-.53-2.64-.5-3.84.03C8.15 5.26 7 7.13 7 9.59v5.47l-2 1.88V18h14v-1.07z",
  like: "M18.77 11h-4.23l1.52-4.94C16.38 5.03 15.54 4 14.38 4c-.58 0-1.14.24-1.52.65L7 11H3v10h4h1h9.43c1.06 0 1.98-.67 2.19-1.61l1.34-6C21.23 12.15 20.18 11 18.77 11zM7 20H4v-8h3v8zm12.98-6.83-1.34 6C18.54 19.65 18.03 20 17.43 20H8v-8.61l5.6-6.06c.19-.21.48-.33.78-.33.26 0 .5.11.63.3.07.1.15.26.09.47l-1.52 4.94-.4 1.29h5.58c.41 0 .8.17 1.03.46.12.15.25.4.19.71z",
  dislike: "M17 4h-1H6.57C5.5 4 4.59 4.67 4.38 5.61l-1.34 6C2.77 12.85 3.82 14 5.23 14h4.23l-1.52 4.94C7.62 19.97 8.46 21 9.62 21c.58 0 1.14-.24 1.52-.65L17 14h4V4h-4zm-6.6 15.67c-.19.21-.48.33-.78.33-.26 0-.5-.11-.63-.3-.07-.1-.15-.26-.09-.47l1.52-4.94.4-1.29H5.23c-.41 0-.8-.17-1.03-.46-.12-.15-.25-.4-.19-.71l1.34-6C5.46 5.35 5.97 5 6.57 5H16v8.61l-5.6 6.06zM20 13h-3V5h3v8z",
  share: "M15 5.63 20.66 12 15 18.37V14h-1c-3.96 0-7.14 1-9.75 3.09 1.84-4.07 5.11-6.4 9.89-7.1l.86-.13V5.63M14 3v6C6.22 10.13 3.11 15.33 2 21c2.78-3.97 6.44-6 12-6v6l8-9-8-9z",
  download: "M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z",
  more: "M7.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm6 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm6 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
  sort: "M21 6H3V5h18v1zm-6 5H3v1h12v-1zm-6 5H3v1h6v-1z",
};

function WatchShell({ adAt, live }: { adAt: number; live: boolean }) {
  return <div className="yt-page">
    <header className="yt-header">
      <div className="yt-header-start">
        <button type="button" className="yt-round" aria-label="Guide"><Glyph d={GLYPH.menu} /></button>
        <a className="yt-logo" href="/watch" aria-label="ViewTube home"><span className="yt-logo-mark" aria-hidden="true"><i /></span><span className="yt-logo-text">ViewTube</span><sup>US</sup></a>
      </div>
      <form className="yt-search" role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="yt-search-box"><input type="search" placeholder="Search" aria-label="Search" /><button type="submit" aria-label="Search"><Glyph d={GLYPH.search} /></button></div>
        <button type="button" className="yt-round filled" aria-label="Search with your voice"><Glyph d={GLYPH.mic} /></button>
      </form>
      <div className="yt-header-end">
        <button type="button" className="yt-pill ghost"><Glyph d={GLYPH.create} size={22} />Create</button>
        <button type="button" className="yt-round" aria-label="Notifications"><Glyph d={GLYPH.bell} /><span className="yt-dot">9+</span></button>
        <span className="yt-avatar" aria-label="Your account">B</span>
      </div>
    </header>

    <main className="yt-main">
      <section className="yt-primary">
        <VideoPlayer src={featured.src} poster={featured.poster} adAt={adAt} live={live} />
        <h1 className="yt-title">{featured.title}</h1>
        <div className="yt-owner-row">
          <div className="yt-owner">
            <span className="yt-avatar big" aria-hidden="true">{featured.channel.initial}</span>
            <div><strong>{featured.channel.name}</strong><span>{featured.channel.subscribers}</span></div>
            <button type="button" className="yt-pill solid">Subscribe</button>
          </div>
          <div className="yt-actions">
            <div className="yt-segment"><button type="button"><Glyph d={GLYPH.like} />{featured.likes}</button><button type="button" aria-label="Dislike"><Glyph d={GLYPH.dislike} /></button></div>
            <button type="button" className="yt-pill"><Glyph d={GLYPH.share} />Share</button>
            <button type="button" className="yt-pill"><Glyph d={GLYPH.download} />Download</button>
            <button type="button" className="yt-round" aria-label="More actions"><Glyph d={GLYPH.more} /></button>
          </div>
        </div>
        <div className="yt-description">
          <p className="yt-meta"><strong>{featured.views}</strong><strong>{featured.posted}</strong>{featured.tags.map((tag) => <a key={tag} href="#">{tag}</a>)}</p>
          {featured.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p className="yt-credit">{featured.credit}</p>
        </div>
        <section className="yt-comments" aria-label="Comments">
          <div className="yt-comments-head"><h2>{featured.commentCount}</h2><button type="button"><Glyph d={GLYPH.sort} size={22} />Sort by</button></div>
          <form className="yt-add-comment" onSubmit={(event) => event.preventDefault()}><span className="yt-avatar">B</span><input type="text" placeholder="Add a comment…" aria-label="Add a comment" /></form>
          {comments.map((comment) => <article className="yt-comment" key={comment.author}>
            <span className="yt-avatar" style={{ "--hue": comment.hue } as React.CSSProperties} aria-hidden="true">{comment.author.slice(1, 2).toUpperCase()}</span>
            <div><p className="yt-comment-head"><strong>{comment.author}</strong><span>{comment.when}</span></p><p>{comment.text}</p><p className="yt-comment-foot"><Glyph d={GLYPH.like} size={16} /><span>{comment.likes}</span><Glyph d={GLYPH.dislike} size={16} /><button type="button">Reply</button></p></div>
          </article>)}
        </section>
      </section>
      <UpNext />
    </main>
  </div>;
}
