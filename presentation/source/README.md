# CUTLINE presentation source

Copy this folder to `presentation/source`. It contains one authoring/rendering script and only the eight images used by the approved ten-slide deck. 

The source preserves the cosmic black, navy, starlight, and amber design. Its 390 spoken words occupy ten cue slots totaling exactly 180 seconds. A continuous Three.js canvas forms the opening: clickable projected destinations, a NASA-textured Earth sphere, and an original San Francisco aerial plane at cinematic compressed scales. The slide gallery contains source references, not app screenshots. Live Orbis generation begins inside the fictional film. Notes retain the official starter commit, image classifications, and application evidence. One combined local audience → Nebius → Orbis run is verified: 93 ms prompt acknowledgment, 1,927 ms next chunk, and 18 fps. These are observations from one run, not a performance benchmark.

## Required runtime

Use the Codex bundled workspace runtime. Call `load_workspace_dependencies` to locate its executables and Node modules. This source requires the bundled `@oai/artifact-tool`, `sharp`, and the presentations skill's finalization utilities. It does not install packages, use `python-pptx`, or fall back to another presentation library.

Set these environment variables to the absolute paths returned by that runtime:

- `RUNTIME_NODE`: bundled Node executable, used to invoke the command below.
- `RUNTIME_NODE_MODULES`: bundled Node modules directory. The script resolves its imports directly from this directory, so no local `node_modules` symlink is necessary.
- `RUNTIME_PYTHON`: bundled Python executable, used by the presentation validators.
- `PRESENTATIONS_SKILL_DIR`: installed presentations skill directory containing `container_tools/artifact_tool_utils.mjs`.
- `RUNTIME_SOFFICE`: bundled LibreOffice `soffice` executable, required only with `--pdf`. Do not use the user's desktop LibreOffice.

The approved design uses `Helvetica Neue`. The runtime must have this font available to preserve the design. For PDF export, ensure the bundled LibreOffice font configuration can see the same font. If needed, set `FONTCONFIG_FILE` to a local fontconfig file that lists the available font directories and a writable cache directory. Do not silently accept a substitute font in the final PDF.

Runtime paths belong in environment configuration. The source and asset manifest contain no machine-specific paths.

## Build

Run from this folder after setting the runtime variables:

```sh
"$RUNTIME_NODE" build.mjs build --out ../rebuild
```

To include a PDF:

```sh
"$RUNTIME_NODE" build.mjs build --out ../rebuild --pdf
```

The chosen directory contains finalized PPTX/PDF files under `output/`, plus the speaker script, timing JSON, individual slide renders, a contact sheet, and private `.build` validation files. A build never replaces the approved documents automatically. Use a fresh output directory for each revision because finalization refuses to overwrite an existing final deck or validation receipt.

## Render an existing deck

The same script can render the approved deck without changing it:

```sh
"$RUNTIME_NODE" build.mjs render ../CUTLINE-3-minute-pitch.pptx --out ../preview
```

This mode only requires `RUNTIME_NODE_MODULES`; add `RUNTIME_SOFFICE` and `--pdf` for a PDF export. Rendering creates individual PNGs and assembles the contact sheet from those PNGs. This avoids the Artifact Tool montage bug that affected slides containing connectors.

## Editing

Edit the `talk` array for narration and speaker notes, and the numbered slide blocks for content and layout. Text, architecture, and evidence tables remain native editable slide objects. The source resolves `assets/` relative to itself, so it works after the folder moves. Project-source citations labeled `repository/` refer to the application repository root.

`assets/provenance.json` contains the official source URLs, full institutional credits, classifications, and SHA-256 checksums for the six NASA assets. `multiverse.png` and `train.png` are original speculative AI artwork. The illustrations do not represent observed events. NASA material includes photographs/composites, a scientific simulation, and a Milky Way artist concept. The source frames remain unaltered.

Before delivering a rebuilt deck, inspect every rendered slide and check PDF font fidelity. Automated package checks do not establish visual quality or validate current provider status.
