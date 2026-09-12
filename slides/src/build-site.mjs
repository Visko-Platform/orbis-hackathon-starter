// Builds a standalone static deck site from the .dc.html artboards.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";

const SRC = dirname(new URL(import.meta.url).pathname);
const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node build-site.mjs <out-dir>");

const canvas = JSON.parse(readFileSync(join(SRC, "canvas.json"), "utf8"));
const files = canvas.artboards.map((a) => a.file);

const styles = [];
const sections = [];

for (const [i, file] of files.entries()) {
  const raw = readFileSync(join(SRC, file), "utf8");

  const helmet = raw.match(/<helmet>([\s\S]*?)<\/helmet>/);
  if (helmet) {
    const css = helmet[1].replace(/<\/?style>/g, "");
    styles.push(
      css
        .split("\n")
        .filter((l) => !l.includes("@import") && !/^\s*(html, body|\*)\s*\{/.test(l))
        .join("\n")
    );
  }

  let body = raw
    .replace(/[\s\S]*<\/helmet>/, "")
    .replace(/<\/x-dc>[\s\S]*/, "")
    .trim();

  // slides reference images by bare filename; serve them from assets/
  body = body.replace(/src="([^"/]+\.(?:jpg|jpeg|png|webp))"/g, 'src="assets/$1"');
  // each artboard is a full-viewport slide
  body = body.replace(/<section /, `<section id="${i + 1}" class="slide" `);

  sections.push(body);
}

mkdirSync(join(OUT, "assets"), { recursive: true });
for (const f of readdirSync(join(SRC, "assets"))) {
  if (f.endsWith(".jpg")) copyFileSync(join(SRC, "assets", f), join(OUT, "assets", f));
}
for (const f of readdirSync(join(SRC, "assets", "grid"))) {
  copyFileSync(join(SRC, "assets", "grid", f), join(OUT, "assets", f));
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Teaching AI how to live</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: #0d1117;
    font-family: 'Baloo 2', system-ui, sans-serif;
    scroll-snap-type: y mandatory;
    overflow-x: hidden;
  }
  .slide {
    scroll-snap-align: start;
    scroll-snap-stop: always;
    height: 100vh;
    width: 100vw;
  }
  .nav {
    position: fixed; right: 18px; top: 50%; transform: translateY(-50%);
    display: flex; flex-direction: column; gap: 9px; z-index: 50;
  }
  .nav a {
    width: 9px; height: 9px; border-radius: 50%;
    background: rgba(43,58,74,.25); transition: background .2s, transform .2s;
  }
  .nav a.on { background: #1D6FD1; transform: scale(1.45); }
  @media print {
    body { scroll-snap-type: none; }
    .slide { page-break-after: always; height: 100vh; }
    .nav { display: none; }
  }
${styles.join("\n")}
</style>
</head>
<body>

${sections.join("\n\n")}

<nav class="nav">
${files.map((_, i) => `  <a href="#${i + 1}" aria-label="Slide ${i + 1}"></a>`).join("\n")}
</nav>

<script>
  const slides = Array.from(document.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('.nav a'));

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const i = slides.indexOf(e.target);
        dots.forEach((d, j) => d.classList.toggle('on', i === j));
        history.replaceState(null, '', '#' + (i + 1));
      }
    }
  }, { threshold: 0.5 });
  slides.forEach((s) => io.observe(s));

  function current() {
    return slides.findIndex((s) => {
      const r = s.getBoundingClientRect();
      return r.top >= -window.innerHeight / 2 && r.top < window.innerHeight / 2;
    });
  }
  function go(delta) {
    const i = current();
    const next = Math.min(slides.length - 1, Math.max(0, (i < 0 ? 0 : i) + delta));
    slides[next].scrollIntoView({ behavior: 'smooth' });
  }
  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    if (e.key === 'Home') { e.preventDefault(); slides[0].scrollIntoView({ behavior: 'smooth' }); }
    if (e.key === 'End') { e.preventDefault(); slides[slides.length - 1].scrollIntoView({ behavior: 'smooth' }); }
  });

  if (location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView());
  }
</script>

</body>
</html>
`;

writeFileSync(join(OUT, "index.html"), html);
console.log(`wrote ${join(OUT, "index.html")} — ${files.length} slides`);
