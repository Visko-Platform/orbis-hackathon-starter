import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";

import "@/styles/carvuk-tokens.css";
import "./styles.css";

const manrope = localFont({
  src: "./fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orbis Studio — Create in motion",
  description:
    "Create continuous live video, shape your scene, and let your heart rate guide the world with Orbis Studio.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
