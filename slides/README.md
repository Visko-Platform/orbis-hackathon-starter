# Teaching AI how to live — pitch deck

Ten-slide deck for the generative-simulator pitch.

- `src/` — the editable slide sources. Each `*.dc.html` is one slide;
  `canvas.json` sets their order. Images live in `src/assets/`
  (`assets/grid/` holds the sampled episode frames).
- `site/` — the built static site. Deploy this folder as-is; it needs no
  build step or server.
- `site-artifact.html` — the same page with the document wrapper stripped,
  used for publishing as a Claude artifact.

## Rebuild the site after editing a slide

```bash
node slides/src/build-site.mjs slides/site
```

Slides scroll vertically with snap; arrow keys, PageUp/PageDown, Home and
End navigate, and `#1`…`#10` deep-link to a slide.

## Deploy

Any static host works. With the Netlify CLI:

```bash
netlify deploy --dir=slides/site --prod
```
