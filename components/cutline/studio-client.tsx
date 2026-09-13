"use client";
import dynamic from "next/dynamic";

// The studio is a browser-only surface (WebGL, WebRTC, speech recognition).
// Rendering it only on the client avoids a server-render error in dev.
const Studio = dynamic(() => import("./studio"), { ssr: false });
export default Studio;
