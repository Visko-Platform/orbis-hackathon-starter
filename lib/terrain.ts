// Terrain converter: CSV survey points -> triangulated relief image for Orbis.
// Runs entirely in the browser (no backend, no native deps). Uses delaunator.

import Delaunator from "delaunator";

export type Point = { x: number; y: number; z: number };

export type TerrainData = {
  points: Point[];
  triangles: Uint32Array; // flat triples of vertex indices
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type TerrainStats = {
  width: number;
  height: number;
  relief: number;
  minZ: number;
  maxZ: number;
  descriptor: string; // e.g. "gently sloping, softly undulating terrain"
  steep: string; // short word for the UI
};

const X_ALIASES = ["x", "easting", "east", "e", "lon", "longitude", "px"];
const Y_ALIASES = ["y", "northing", "north", "n", "lat", "latitude", "py"];
const Z_ALIASES = ["z", "elevation", "elev", "height", "alt", "altitude", "h"];

const isNum = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));

/** Detect the most likely delimiter from the first non-empty line. */
function detectDelimiter(line: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    const count = line.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  // Fall back to whitespace-splitting if no delimiter produced >= 3 fields.
  if (bestCount < 3) return /\s+/.source; // marker; handled below
  return best;
}

function splitLine(line: string, delim: string): string[] {
  if (delim === /\s+/.source) return line.trim().split(/\s+/);
  return line.split(delim).map((c) => c.trim());
}

/**
 * Parse a survey CSV into points. Auto-detects delimiter, header, and the
 * X/Y/Z columns by common names; falls back to the first three columns.
 * Throws with a helpful message on failure.
 */
export function parseSurveyCSV(
  text: string,
  override?: { x?: string; y?: string; z?: string },
): Point[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length < 3) throw new Error("Need at least 3 points to build a terrain.");

  const delim = detectDelimiter(lines[0]);
  const firstFields = splitLine(lines[0], delim);
  if (firstFields.length < 3)
    throw new Error("Each row needs at least 3 columns (X, Y, Z).");

  // Header if the first row's first three fields are not all numeric.
  const hasHeader = !firstFields.slice(0, 3).every(isNum);

  let xi = 0,
    yi = 1,
    zi = 2;
  if (hasHeader) {
    const lower = firstFields.map((f) => f.toLowerCase());
    const findCol = (aliases: string[], explicit?: string) => {
      if (explicit) {
        const idx = lower.indexOf(explicit.toLowerCase());
        if (idx >= 0) return idx;
      }
      for (const a of aliases) {
        const idx = lower.indexOf(a);
        if (idx >= 0) return idx;
      }
      return -1;
    };
    const fx = findCol(X_ALIASES, override?.x);
    const fy = findCol(Y_ALIASES, override?.y);
    const fz = findCol(Z_ALIASES, override?.z);
    xi = fx >= 0 ? fx : 0;
    yi = fy >= 0 ? fy : 1;
    zi = fz >= 0 ? fz : 2;
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const points: Point[] = [];
  for (const line of dataLines) {
    const f = splitLine(line, delim);
    if (f.length <= Math.max(xi, yi, zi)) continue;
    const x = Number(f[xi]);
    const y = Number(f[yi]);
    const z = Number(f[zi]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      points.push({ x, y, z });
    }
  }
  if (points.length < 3)
    throw new Error("Could not read 3+ numeric rows. Check the columns/format.");
  return points;
}

/** Triangulate points and compute bounds. */
export function buildTerrain(points: Point[]): TerrainData {
  const del = Delaunator.from(
    points,
    (p) => p.x,
    (p) => p.y,
  );
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { points, triangles: del.triangles, minX, maxX, minY, maxY, minZ, maxZ };
}

export function terrainStats(t: TerrainData): TerrainStats {
  const width = t.maxX - t.minX;
  const height = t.maxY - t.minY;
  const relief = t.maxZ - t.minZ;
  const diag = Math.max(width, height) || 1;
  const rel = relief / diag;

  let descriptor: string, steep: string;
  if (rel < 0.04) {
    descriptor = "nearly flat ground";
    steep = "flat";
  } else if (rel < 0.1) {
    descriptor = "gently sloping, softly undulating terrain";
    steep = "gently sloping";
  } else if (rel < 0.25) {
    descriptor = "rolling hills with clear ridges and hollows";
    steep = "hilly";
  } else {
    descriptor = "steep, dramatic terrain with sharp elevation changes";
    steep = "steep";
  }
  return { width, height, relief, minZ: t.minZ, maxZ: t.maxZ, descriptor, steep };
}

export function suggestPrompt(stats: TerrainStats): string {
  return (
    `Aerial oblique view of a real ${stats.descriptor}, ` +
    `roughly ${Math.round(stats.width)} by ${Math.round(stats.height)} meters, ` +
    `green grass and bare earth, photorealistic, soft morning light, ` +
    `clear sky, natural colors, cinematic, 16:9`
  );
}

/** Map an (east, north) vector to an 8-point compass word. */
function compass8(east: number, north: number): string {
  const deg = (Math.atan2(north, east) * 180) / Math.PI; // 0=E, 90=N
  const dirs = [
    "east", "north-east", "north", "north-west",
    "west", "south-west", "south", "south-east",
  ];
  const idx = ((Math.round(deg / 45) % 8) + 8) % 8;
  return dirs[idx];
}

/** Centroid (in world coords) of the top/bottom fraction of points by height. */
function extremeCentroid(points: Point[], fraction: number, high: boolean) {
  const sorted = [...points].sort((a, b) => (high ? b.z - a.z : a.z - b.z));
  const k = Math.max(3, Math.floor(points.length * fraction));
  const slice = sorted.slice(0, k);
  const sx = slice.reduce((s, p) => s + p.x, 0) / k;
  const sy = slice.reduce((s, p) => s + p.y, 0) / k;
  return { x: sx, y: sy };
}

/**
 * Turn the point cloud into a spatial description grounded in the real
 * coordinates: overall slope direction, and where the high point and low
 * hollow sit (by compass). Used to drive text-to-video.
 */
export function describeTerrain(t: TerrainData): string {
  const stats = terrainStats(t);
  const cx = (t.minX + t.maxX) / 2;
  const cy = (t.minY + t.maxY) / 2;

  // Least-squares plane fit on centered coords to get the slope direction.
  let Sxx = 0, Sxy = 0, Syy = 0, Sxz = 0, Syz = 0;
  for (const p of t.points) {
    const dx = p.x - cx, dy = p.y - cy, dz = p.z - (t.minZ + t.maxZ) / 2;
    Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy;
    Sxz += dx * dz; Syz += dy * dz;
  }
  const det = Sxx * Syy - Sxy * Sxy || 1;
  const a = (Sxz * Syy - Syz * Sxy) / det; // dz/dx
  const b = (Syz * Sxx - Sxz * Sxy) / det; // dz/dy
  const slopeMag = Math.hypot(a, b);

  const parts: string[] = [];
  parts.push(
    `${stats.descriptor}, about ${Math.round(stats.width)} by ` +
      `${Math.round(stats.height)} meters with ${stats.relief.toFixed(1)} m ` +
      `of elevation change`,
  );
  if (slopeMag > 0.01) {
    // Descent direction is the negative gradient.
    parts.push(`the ground falls gently toward the ${compass8(-a, -b)}`);
  }
  if (stats.relief > 0.5) {
    const hi = extremeCentroid(t.points, 0.05, true);
    const lo = extremeCentroid(t.points, 0.05, false);
    parts.push(`a high point rises toward the ${compass8(hi.x - cx, hi.y - cy)}`);
    parts.push(`a low hollow sits toward the ${compass8(lo.x - cx, lo.y - cy)}`);
  }
  return parts.join("; ");
}

/** Full text-to-video prompt built from the coordinates. */
export function terrainPrompt(t: TerrainData): string {
  return (
    `Photorealistic aerial oblique view of a real landscape: ` +
    `${describeTerrain(t)}. Green grass and bare earth, soft morning light, ` +
    `clear sky, natural colors, cinematic, 16:9.`
  );
}

export type TerrainSummary = {
  widthM: number;
  heightM: number;
  reliefM: number;
  minZ: number;
  maxZ: number;
  descriptor: string;
  slope: { bearing: string; gradePct: number };
  highPoint: { compass: string };
  lowPoint: { compass: string };
  heightmap: string[]; // rows of digits 0-9 (relative height), '.' = no data
};

/**
 * Compact, structured summary of the terrain for the LLM director. Instead of
 * sending thousands of raw points, we send derived features plus a small
 * relative-height grid (north at top) the model can reason over cheaply.
 */
export function terrainSummary(t: TerrainData): TerrainSummary {
  const stats = terrainStats(t);
  const cx = (t.minX + t.maxX) / 2;
  const cy = (t.minY + t.maxY) / 2;

  // Slope via least-squares plane fit (same as describeTerrain).
  let Sxx = 0, Sxy = 0, Syy = 0, Sxz = 0, Syz = 0;
  for (const p of t.points) {
    const dx = p.x - cx, dy = p.y - cy, dz = p.z - (t.minZ + t.maxZ) / 2;
    Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy;
    Sxz += dx * dz; Syz += dy * dz;
  }
  const det = Sxx * Syy - Sxy * Sxy || 1;
  const a = (Sxz * Syy - Syz * Sxy) / det;
  const b = (Syz * Sxx - Sxz * Sxy) / det;
  const gradePct = Math.round(Math.hypot(a, b) * 100);
  const bearing = Math.hypot(a, b) > 0.005 ? compass8(-a, -b) : "no clear direction";

  const hi = extremeCentroid(t.points, 0.05, true);
  const lo = extremeCentroid(t.points, 0.05, false);

  // Coarse relative-height grid (12 x 7), north (max Y) at the top.
  const cols = 12, rows = 7;
  const sum = new Array(cols * rows).fill(0);
  const cnt = new Array(cols * rows).fill(0);
  const w = t.maxX - t.minX || 1;
  const h = t.maxY - t.minY || 1;
  for (const p of t.points) {
    const c = Math.min(cols - 1, Math.max(0, Math.floor(((p.x - t.minX) / w) * cols)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor(((p.y - t.minY) / h) * rows)));
    sum[r * cols + c] += p.z;
    cnt[r * cols + c] += 1;
  }
  const span = t.maxZ - t.minZ || 1;
  const heightmap: string[] = [];
  for (let r = rows - 1; r >= 0; r--) {
    // r counts south->north; iterate top (north) first for readability.
    let row = "";
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (cnt[k] === 0) {
        row += ".";
      } else {
        const avg = sum[k] / cnt[k];
        const digit = Math.min(9, Math.max(0, Math.round(((avg - t.minZ) / span) * 9)));
        row += String(digit);
      }
    }
    heightmap.push(row);
  }

  return {
    widthM: Math.round(stats.width),
    heightM: Math.round(stats.height),
    reliefM: Math.round(stats.relief * 10) / 10,
    minZ: Math.round(t.minZ * 10) / 10,
    maxZ: Math.round(t.maxZ * 10) / 10,
    descriptor: stats.descriptor,
    slope: { bearing, gradePct },
    highPoint: { compass: compass8(hi.x - cx, hi.y - cy) },
    lowPoint: { compass: compass8(lo.x - cx, lo.y - cy) },
    heightmap,
  };
}

// --- Rendering ------------------------------------------------------------

// Approximation of matplotlib's "terrain" colormap as a few interpolated stops.
const CMAP: Array<[number, [number, number, number]]> = [
  [0.0, [51, 51, 153]],
  [0.15, [38, 115, 217]],
  [0.25, [13, 153, 140]],
  [0.5, [140, 204, 115]],
  [0.65, [235, 230, 140]],
  [0.8, [158, 122, 89]],
  [1.0, [250, 250, 250]],
];

function terrainColor(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  for (let i = 1; i < CMAP.length; i++) {
    if (c <= CMAP[i][0]) {
      const [t0, a] = CMAP[i - 1];
      const [t1, b] = CMAP[i];
      const f = (c - t0) / (t1 - t0 || 1);
      return [
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f,
      ];
    }
  }
  return CMAP[CMAP.length - 1][1];
}

export type RenderMode = "oblique" | "top";

/**
 * Draw the triangulated terrain into a 16:9 canvas as a shaded relief.
 * `oblique` gives a tilted 3D landscape (best Orbis seed); `top` a map view.
 */
export function renderTerrain(
  canvas: HTMLCanvasElement,
  t: TerrainData,
  mode: RenderMode = "oblique",
) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, W, H);

  const cx = (t.minX + t.maxX) / 2;
  const cy = (t.minY + t.maxY) / 2;
  const spanXY = Math.max(t.maxX - t.minX, t.maxY - t.minY) || 1;
  const spanZ = t.maxZ - t.minZ || 1;
  const vertExag = 2.0; // makes gentle relief readable

  // World coords centered & normalized to ~[-1,1] in XY, z01 in [0,1].
  const nx = (p: Point) => (p.x - cx) / (spanXY / 2);
  const ny = (p: Point) => (p.y - cy) / (spanXY / 2);
  const nz = (p: Point) => ((p.z - t.minZ) / spanZ) * vertExag;

  // Light direction (from upper-left, elevated).
  const L = normalize([-0.5, -0.6, 0.75]);

  // Projection to screen. Returns [sx, sy, depth].
  const project = (p: Point): [number, number, number] => {
    const X = nx(p);
    const Y = ny(p);
    const Z = nz(p);
    if (mode === "top") {
      // Straight down; y flips so north is up.
      return [X, -Y, 0];
    }
    // Oblique camera: azimuth then tilt.
    const az = (-60 * Math.PI) / 180;
    const el = (32 * Math.PI) / 180;
    const rx = X * Math.cos(az) - Y * Math.sin(az);
    const ry = X * Math.sin(az) + Y * Math.cos(az);
    const sx = rx;
    const sy = ry * Math.sin(el) - Z * Math.cos(el);
    const depth = ry * Math.cos(el) + Z * Math.sin(el);
    return [sx, sy, depth];
  };

  // Project all vertices, track screen bounds to fit into the frame.
  const proj = t.points.map(project);
  let sMinX = Infinity,
    sMaxX = -Infinity,
    sMinY = Infinity,
    sMaxY = -Infinity;
  for (const [sx, sy] of proj) {
    if (sx < sMinX) sMinX = sx;
    if (sx > sMaxX) sMaxX = sx;
    if (sy < sMinY) sMinY = sy;
    if (sy > sMaxY) sMaxY = sy;
  }
  const pad = 0.06;
  const scale = Math.min(
    (W * (1 - 2 * pad)) / (sMaxX - sMinX || 1),
    (H * (1 - 2 * pad)) / (sMaxY - sMinY || 1),
  );
  const offX = (W - (sMaxX - sMinX) * scale) / 2 - sMinX * scale;
  const offY = (H - (sMaxY - sMinY) * scale) / 2 - sMinY * scale;
  const toScreen = (sx: number, sy: number): [number, number] => [
    sx * scale + offX,
    sy * scale + offY,
  ];

  // Build triangle list with depth for painter's sorting (oblique).
  const tris = t.triangles;
  const order: number[] = [];
  const depths: number[] = [];
  for (let i = 0; i < tris.length; i += 3) {
    const d =
      (proj[tris[i]][2] + proj[tris[i + 1]][2] + proj[tris[i + 2]][2]) / 3;
    order.push(i);
    depths.push(d);
  }
  if (mode === "oblique") order.sort((a, b) => depths[a / 3] - depths[b / 3]);

  for (const i of order) {
    const ia = tris[i],
      ib = tris[i + 1],
      ic = tris[i + 2];
    const a = t.points[ia],
      b = t.points[ib],
      c = t.points[ic];

    // Face normal in normalized world space (z exaggerated) for shading.
    const ax = nx(a),
      ay = ny(a),
      az = nz(a);
    const bx = nx(b),
      by = ny(b),
      bz = nz(b);
    const ccx = nx(c),
      ccy = ny(c),
      ccz = nz(c);
    const n = normalize(
      cross([bx - ax, by - ay, bz - az], [ccx - ax, ccy - ay, ccz - az]),
    );
    if (n[2] < 0) {
      n[0] = -n[0];
      n[1] = -n[1];
      n[2] = -n[2];
    }
    const bright = 0.4 + 0.6 * Math.max(0, dot(n, L));

    const zAvg = ((a.z + b.z + c.z) / 3 - t.minZ) / spanZ;
    const col = terrainColor(zAvg);
    ctx.fillStyle = `rgb(${col[0] * bright | 0}, ${col[1] * bright | 0}, ${
      (col[2] * bright) | 0
    })`;

    const [pax, pay] = toScreen(proj[ia][0], proj[ia][1]);
    const [pbx, pby] = toScreen(proj[ib][0], proj[ib][1]);
    const [pcx, pcy] = toScreen(proj[ic][0], proj[ic][1]);
    ctx.beginPath();
    ctx.moveTo(pax, pay);
    ctx.lineTo(pbx, pby);
    ctx.lineTo(pcx, pcy);
    ctx.closePath();
    ctx.fill();
    // Thin same-color stroke closes hairline gaps between triangles.
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function canvasToFile(canvas: HTMLCanvasElement, name = "terrain.png") {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not export the terrain image."));
      resolve(new File([blob], name, { type: "image/png" }));
    }, "image/png");
  });
}

// --- small vector helpers -------------------------------------------------
function cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function normalize(a: number[]): number[] {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
}

// --- Top-down map transform + renderer (for the object placement map) ------

export type MapTransform = {
  scale: number;
  worldToScreen: (x: number, y: number) => [number, number];
  screenToWorld: (sx: number, sy: number) => [number, number];
};

/**
 * Fit the terrain's world bounds into a WxH canvas, north up, aspect preserved
 * (letterboxed). Returns invertible world<->screen mappers so polygons drawn on
 * the map stay in world (terrain) coordinates and always line up.
 */
export function terrainTransform(
  W: number,
  H: number,
  t: TerrainData,
  pad = 0.06,
): MapTransform {
  const cx = (t.minX + t.maxX) / 2;
  const cy = (t.minY + t.maxY) / 2;
  const halfSpan = (Math.max(t.maxX - t.minX, t.maxY - t.minY) || 1) / 2;

  const pxHalf = (t.maxX - t.minX) / 2 / halfSpan;
  const pyHalf = (t.maxY - t.minY) / 2 / halfSpan;
  const scale = Math.min(
    (W * (1 - 2 * pad)) / (2 * pxHalf || 1),
    (H * (1 - 2 * pad)) / (2 * pyHalf || 1),
  );
  const offX = W / 2;
  const offY = H / 2;

  return {
    scale,
    worldToScreen: (x, y) => [
      offX + ((x - cx) / halfSpan) * scale,
      offY - ((y - cy) / halfSpan) * scale, // north up
    ],
    screenToWorld: (sx, sy) => [
      cx + ((sx - offX) / scale) * halfSpan,
      cy - ((sy - offY) / scale) * halfSpan,
    ],
  };
}

/** Draw a top-down shaded relief of the terrain using the given transform. */
export function renderTerrainTopMap(
  canvas: HTMLCanvasElement,
  t: TerrainData,
  tr: MapTransform,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const spanZ = t.maxZ - t.minZ || 1;
  const vertExag = 2.0;
  const L = normalize([-0.5, -0.6, 0.85]);
  const cx = (t.minX + t.maxX) / 2;
  const cy = (t.minY + t.maxY) / 2;
  const halfSpan = (Math.max(t.maxX - t.minX, t.maxY - t.minY) || 1) / 2;
  const nx = (p: Point) => (p.x - cx) / halfSpan;
  const ny = (p: Point) => (p.y - cy) / halfSpan;
  const nz = (p: Point) => ((p.z - t.minZ) / spanZ) * vertExag;

  const tris = t.triangles;
  for (let i = 0; i < tris.length; i += 3) {
    const a = t.points[tris[i]];
    const b = t.points[tris[i + 1]];
    const c = t.points[tris[i + 2]];
    const n = normalize(
      cross(
        [nx(b) - nx(a), ny(b) - ny(a), nz(b) - nz(a)],
        [nx(c) - nx(a), ny(c) - ny(a), nz(c) - nz(a)],
      ),
    );
    if (n[2] < 0) {
      n[0] = -n[0];
      n[1] = -n[1];
      n[2] = -n[2];
    }
    const bright = 0.55 + 0.45 * Math.max(0, dot(n, L));
    const zAvg = ((a.z + b.z + c.z) / 3 - t.minZ) / spanZ;
    const col = terrainColor(zAvg);
    ctx.fillStyle = `rgb(${(col[0] * bright) | 0}, ${(col[1] * bright) | 0}, ${
      (col[2] * bright) | 0
    })`;
    const [ax, ay] = tr.worldToScreen(a.x, a.y);
    const [bx, by] = tr.worldToScreen(b.x, b.y);
    const [ccx, ccy] = tr.worldToScreen(c.x, c.y);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(ccx, ccy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Compass sector (8-point) of a world point relative to the terrain centre. */
export function worldCompass(t: TerrainData, x: number, y: number): string {
  const cx = (t.minX + t.maxX) / 2;
  const cy = (t.minY + t.maxY) / 2;
  return compass8(x - cx, y - cy);
}

/** Point-in-polygon test (world coords), ray casting. */
export function pointInPolygon(
  x: number,
  y: number,
  poly: Array<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const hit =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Centroid of a polygon (world coords). */
export function polygonCentroid(
  poly: Array<{ x: number; y: number }>,
): { x: number; y: number } {
  const n = poly.length || 1;
  let sx = 0, sy = 0;
  for (const p of poly) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / n, y: sy / n };
}



/**
 * World point -> grid cell in the SAME frame terrainSummary uses for its
 * heightmap: `cols` x `rows`, row 0 = north (top), col 0 = west (left).
 */
export function worldToGrid(
  t: TerrainData,
  x: number,
  y: number,
  cols = 12,
  rows = 7,
): { col: number; row: number } {
  const w = t.maxX - t.minX || 1;
  const h = t.maxY - t.minY || 1;
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((x - t.minX) / w) * cols)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((t.maxY - y) / h) * rows)));
  return { col, row };
}