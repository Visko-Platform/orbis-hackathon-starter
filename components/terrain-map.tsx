"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { OrbisSession } from "@/hooks/use-orbis-session";
import {
  pointInPolygon,
  polygonCentroid,
  renderTerrainTopMap,
  terrainTransform,
  worldCompass,
  worldToGrid,
  type MapTransform,
  type TerrainData,
} from "@/lib/terrain";

type Kind = "building" | "trees" | "road" | "water" | "area";

const KINDS: Record<Kind, { label: string; color: string; phrase: string }> = {
  building: {
    label: "Building",
    color: "#e07a5f",
    phrase: "a modern multi-storey building",
  },
  trees: {
    label: "Trees",
    color: "#81b29a",
    phrase: "a cluster of trees and green vegetation",
  },
  road: { label: "Road", color: "#c9c9c9", phrase: "a paved road" },
  water: { label: "Water", color: "#4a90d9", phrase: "a pond of water" },
  area: { label: "Area", color: "#e0c341", phrase: "a cleared, graded area" },
};

type PlacedObject = {
  id: string;
  label: string;
  kind: Kind;
  polygon: Array<{ x: number; y: number }>;
};

const CANVAS_W = 900;
const CANVAS_H = 506;

let objectCounter = 0;

export function TerrainMap({
  session,
  terrain,
}: {
  session: OrbisSession;
  terrain: TerrainData;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transformRef = useRef<MapTransform | null>(null);

  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [draft, setDraft] = useState<Array<{ x: number; y: number }>>([]);
  const [mode, setMode] = useState<"idle" | "draw">("idle");
  const [newKind, setNewKind] = useState<Kind>("building");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selected = objects.find((o) => o.id === selectedId) || null;

  // Draw the map: terrain, then object polygons, then the in-progress draft.
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tr = terrainTransform(canvas.width, canvas.height, terrain);
    transformRef.current = tr;
    renderTerrainTopMap(canvas, terrain, tr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawPoly = (
      poly: Array<{ x: number; y: number }>,
      color: string,
      fill: boolean,
      selectedRing = false,
    ) => {
      if (poly.length === 0) return;
      ctx.beginPath();
      poly.forEach((p, i) => {
        const [sx, sy] = tr.worldToScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      if (fill) ctx.closePath();
      if (fill) {
        ctx.fillStyle = color + "59"; // ~35% alpha
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = selectedRing ? 3 : 2;
      ctx.stroke();
      // vertices
      ctx.fillStyle = color;
      poly.forEach((p) => {
        const [sx, sy] = tr.worldToScreen(p.x, p.y);
        ctx.beginPath();
        ctx.arc(sx, sy, selectedRing ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    for (const obj of objects) {
      const k = KINDS[obj.kind];
      drawPoly(obj.polygon, k.color, true, obj.id === selectedId);
      const c = polygonCentroid(obj.polygon);
      const [lx, ly] = tr.worldToScreen(c.x, c.y);
      ctx.fillStyle = "#fff";
      ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText(obj.label, lx, ly);
      ctx.fillText(obj.label, lx, ly);
    }

    if (draft.length > 0) {
      drawPoly(draft, KINDS[newKind].color, false);
    }
  }, [terrain, objects, draft, selectedId, newKind]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const pointerToWorld = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ): { sx: number; sy: number; wx: number; wy: number } | null => {
    const canvas = canvasRef.current;
    const tr = transformRef.current;
    if (!canvas || !tr) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const [wx, wy] = tr.screenToWorld(sx, sy);
    return { sx, sy, wx, wy };
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = pointerToWorld(e);
    if (!pos) return;
    if (mode === "draw") {
      setDraft((d) => [...d, { x: pos.wx, y: pos.wy }]);
    } else {
      // Select topmost object under the click.
      const hit = [...objects]
        .reverse()
        .find((o) => pointInPolygon(pos.wx, pos.wy, o.polygon));
      setSelectedId(hit ? hit.id : null);
    }
  };

  const startDrawing = () => {
    setMode("draw");
    setDraft([]);
    setSelectedId(null);
  };

  const finishPolygon = () => {
    if (draft.length < 3) {
      setError("Add at least 3 points to define an area.");
      return;
    }
    setError("");
    objectCounter += 1;
    const kindLabel = KINDS[newKind].label;
    const obj: PlacedObject = {
      id: `obj_${objectCounter}`,
      label: `${kindLabel} ${objectCounter}`,
      kind: newKind,
      polygon: draft,
    };
    setObjects((list) => [...list, obj]);
    setSelectedId(obj.id);
    setDraft([]);
    setMode("idle");
  };

  const cancelDraft = () => {
    setDraft([]);
    setMode("idle");
    setError("");
  };

  const updateSelected = (patch: Partial<PlacedObject>) => {
    if (!selectedId) return;
    setObjects((list) =>
      list.map((o) => (o.id === selectedId ? { ...o, ...patch } : o)),
    );
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setObjects((list) => list.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  const GRID_COLS = 12;
  const GRID_ROWS = 7;

  const buildInstruction = (): string => {
    const parts = objects.map((o) => {
      const c = polygonCentroid(o.polygon);
      const g = worldToGrid(terrain, c.x, c.y, GRID_COLS, GRID_ROWS);
      const compass = worldCompass(terrain, c.x, c.y);
      // Fractional position: from the west edge and from the north edge.
      const fx = Math.round(
        ((c.x - terrain.minX) / (terrain.maxX - terrain.minX || 1)) * 100,
      );
      const fy = Math.round(
        ((terrain.maxY - c.y) / (terrain.maxY - terrain.minY || 1)) * 100,
      );
      // World-space footprint in meters (polygon bounding box).
      let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      for (const p of o.polygon) {
        if (p.x < minx) minx = p.x;
        if (p.x > maxx) maxx = p.x;
        if (p.y < miny) miny = p.y;
        if (p.y > maxy) maxy = p.y;
      }
      const wM = Math.max(1, Math.round(maxx - minx));
      const hM = Math.max(1, Math.round(maxy - miny));
      return (
        `${KINDS[o.kind].phrase} (labelled "${o.label}") placed precisely at grid coordinate ` +
        `[X:${g.col}, Y:${g.row}] — about ${fx}% east of the west edge and ${fy}% south of the ` +
        `north edge, in the ${compass} of the site — spanning roughly ${wM} by ${hM} meters`
      );
    });
    return (
      `On the same [X:0..${GRID_COLS - 1}, Y:0..${GRID_ROWS - 1}] survey grid (north at top), ` +
      `keeping the existing terrain mass and lighting unchanged, add the following objects and ` +
      `place each one exactly at its stated grid coordinate: ${parts.join("; ")}.`
    );
  };

  const placeInScene = async () => {
    if (objects.length === 0) return;
    setError("");
    try {
      await session.steerWith(buildInstruction());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const canPlace = session.runStarted && !session.controlsBusy && objects.length > 0;

  return (
    <div className="terrain-map">
      <span className="field-label">Place objects on the site</span>

      <div className="button-row map-toolbar">
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as Kind)}
          disabled={mode === "draw"}
        >
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <option key={k} value={k}>
              {KINDS[k].label}
            </option>
          ))}
        </select>
        {mode === "idle" ? (
          <button type="button" onClick={startDrawing}>
            Draw area
          </button>
        ) : (
          <>
            <button type="button" onClick={finishPolygon} disabled={draft.length < 3}>
              Finish ({draft.length})
            </button>
            <button type="button" onClick={cancelDraft}>
              Cancel
            </button>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {mode === "draw" && (
        <p className="hint">Click on the map to add points, then Finish.</p>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="terrain-canvas map-canvas"
        onClick={onCanvasClick}
      />

      <div className="object-columns">
        <div className="object-list">
          <span className="field-label">Placed objects ({objects.length})</span>
          {objects.length === 0 && <p className="hint">None yet.</p>}
          {objects.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`object-row ${o.id === selectedId ? "active" : ""}`}
              onClick={() => setSelectedId(o.id)}
            >
              <span className="dot" style={{ background: KINDS[o.kind].color }} />
              {o.label}
            </button>
          ))}
        </div>

        {selected && (
          <div className="object-edit">
            <span className="field-label">Edit “{selected.label}”</span>
            <input
              type="text"
              value={selected.label}
              onChange={(e) => updateSelected({ label: e.target.value })}
            />
            <select
              value={selected.kind}
              onChange={(e) => updateSelected({ kind: e.target.value as Kind })}
            >
              {(Object.keys(KINDS) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KINDS[k].label}
                </option>
              ))}
            </select>
            <button type="button" onClick={deleteSelected} className="danger">
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="button-row">
        <button type="button" onClick={() => void placeInScene()} disabled={!canPlace}>
          Place objects in scene
        </button>
      </div>
      {!session.runStarted && (
        <p className="hint">Start a run to place objects into the live scene.</p>
      )}
    </div>
  );
}