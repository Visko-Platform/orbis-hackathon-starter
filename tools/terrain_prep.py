#!/usr/bin/env python3
"""
terrain_prep.py  —  Orbis hackathon terrain converter

Takes a CSV of surveyed points (X, Y, Z), triangulates the surface (Delaunay),
and renders two 16:9 reference images you can feed to Orbis as a start image:

  1. <out>_hillshade.png   top-down shaded relief (clean, map-like)
  2. <out>_oblique.png     oblique 3D landscape view (reads as a real scene)

It also prints a suggested Orbis prompt derived from the terrain's shape.

Usage:
    python3 terrain_prep.py sample_survey.csv
    python3 terrain_prep.py points.csv --out mysite --grid 400
    python3 terrain_prep.py points.csv --x easting --y northing --z elevation

Only depends on: numpy, pandas, scipy, matplotlib.
"""

import argparse
import sys

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # headless: write files, no window
import matplotlib.pyplot as plt
from matplotlib.colors import LightSource
from matplotlib.tri import Triangulation
from scipy.interpolate import griddata

# Column-name aliases we auto-detect (lowercased). First match wins.
X_ALIASES = ["x", "easting", "east", "e", "lon", "longitude", "px"]
Y_ALIASES = ["y", "northing", "north", "n", "lat", "latitude", "py"]
Z_ALIASES = ["z", "elevation", "elev", "height", "alt", "altitude", "h"]


def load_points(path, x_col=None, y_col=None, z_col=None):
    """Load a CSV of points, auto-detecting delimiter, header and columns."""
    # Let pandas sniff the separator (comma, semicolon, tab, whitespace).
    try:
        df = pd.read_csv(path, sep=None, engine="python")
    except Exception:
        df = pd.read_csv(path, sep=None, engine="python", header=None)

    # If columns look like data (no real header), name them and retry logic.
    def looks_numeric(name):
        try:
            float(str(name))
            return True
        except ValueError:
            return False

    if all(looks_numeric(c) for c in df.columns):
        # No header row — reread without header, assume first 3 cols are X,Y,Z.
        df = pd.read_csv(path, sep=None, engine="python", header=None)
        df.columns = [f"col{i}" for i in range(len(df.columns))]
        x_col = x_col or "col0"
        y_col = y_col or "col1"
        z_col = z_col or "col2"

    lower = {c.lower(): c for c in df.columns}

    def pick(explicit, aliases, label):
        if explicit:
            if explicit in df.columns:
                return explicit
            if explicit.lower() in lower:
                return lower[explicit.lower()]
            sys.exit(f"Column '{explicit}' for {label} not found. "
                     f"Available: {list(df.columns)}")
        for a in aliases:
            if a in lower:
                return lower[a]
        sys.exit(f"Could not auto-detect the {label} column. "
                 f"Use --{label} to name it. Available: {list(df.columns)}")

    xc = pick(x_col, X_ALIASES, "x")
    yc = pick(y_col, Y_ALIASES, "y")
    zc = pick(z_col, Z_ALIASES, "z")

    pts = df[[xc, yc, zc]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(pts) < 3:
        sys.exit("Need at least 3 valid points to triangulate.")

    x = pts[xc].to_numpy(float)
    y = pts[yc].to_numpy(float)
    z = pts[zc].to_numpy(float)
    print(f"Loaded {len(x)} points from '{path}'  (columns: {xc}, {yc}, {zc})")
    return x, y, z


def describe_terrain(x, y, z):
    """Compute simple stats and a human/Orbis-friendly description."""
    w = x.max() - x.min()
    h = y.max() - y.min()
    relief = z.max() - z.min()
    diag = max(w, h) or 1.0
    rel_relief = relief / diag  # relief as a fraction of horizontal extent

    if rel_relief < 0.04:
        shape = "nearly flat ground"
        steep = "flat"
    elif rel_relief < 0.10:
        shape = "gently sloping, softly undulating terrain"
        steep = "gently sloping"
    elif rel_relief < 0.25:
        shape = "rolling hills with clear ridges and hollows"
        steep = "hilly"
    else:
        shape = "steep, dramatic terrain with sharp elevation changes"
        steep = "steep"

    stats = dict(width=w, height=h, relief=relief, steep=steep, shape=shape,
                 zmin=z.min(), zmax=z.max())
    return stats


def suggest_prompt(stats):
    """Build a starter Orbis prompt from the terrain description."""
    return (
        f"Aerial oblique view of a real {stats['shape']}, "
        f"roughly {stats['width']:.0f} by {stats['height']:.0f} meters, "
        f"green grass and bare earth, photorealistic, soft morning light, "
        f"clear sky, natural colors, cinematic, 16:9"
    )


def build_grid(x, y, z, grid_n):
    """Interpolate scattered points onto a regular grid over their extent.
    griddata('linear') interpolates within the convex hull and returns NaN
    outside it, which we render as transparent / background."""
    gx = np.linspace(x.min(), x.max(), grid_n)
    gy = np.linspace(y.min(), y.max(), grid_n)
    GX, GY = np.meshgrid(gx, gy)
    GZ = griddata((x, y), z, (GX, GY), method="linear")
    return GX, GY, GZ


def render_hillshade(GZ, out_path):
    """Top-down shaded relief, filling a 16:9 frame."""
    ls = LightSource(azdeg=315, altdeg=45)
    zfill = np.where(np.isnan(GZ), np.nanmin(GZ), GZ)
    cmap = plt.get_cmap("terrain")
    # Blend a terrain colormap with hillshade for a natural relief look.
    rgb = ls.shade(zfill, cmap=cmap, vert_exag=2.0, blend_mode="soft")
    # Grey out areas outside the surveyed hull (NaN in GZ).
    mask = np.isnan(GZ)
    rgb[mask] = [0.12, 0.12, 0.13, 1.0] if rgb.shape[-1] == 4 else [0.12, 0.12, 0.13]

    fig = plt.figure(figsize=(12.8, 7.2), dpi=150)
    ax = fig.add_axes([0, 0, 1, 1])  # fill the whole frame
    ax.imshow(rgb, origin="lower", aspect="auto", interpolation="bilinear")
    ax.axis("off")
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"Wrote {out_path}  (top-down shaded relief, 1920x1080)")


def render_oblique(x, y, z, out_path):
    """Oblique 3D landscape view from the raw triangulation — reads as a scene."""
    tri = Triangulation(x, y)
    fig = plt.figure(figsize=(12.8, 7.2), dpi=150)
    ax = fig.add_subplot(111, projection="3d")
    ax.plot_trisurf(tri, z, cmap="terrain", linewidth=0,
                    antialiased=True, shade=True)
    # Exaggerate vertical a touch so gentle relief still reads.
    zr = (z.max() - z.min()) or 1.0
    xr = max(x.max() - x.min(), y.max() - y.min()) or 1.0
    ax.set_box_aspect((1, (y.max()-y.min())/xr, 0.35))
    ax.view_init(elev=32, azim=-60)
    ax.set_axis_off()
    ax.set_facecolor("black")
    fig.patch.set_facecolor("black")
    # Fill the 16:9 frame (no tight bbox, which would crop away the aspect).
    ax.set_position([-0.05, -0.08, 1.10, 1.16])
    fig.savefig(out_path, dpi=150, facecolor="black")
    plt.close(fig)
    print(f"Wrote {out_path}  (oblique 3D landscape, 1920x1080)")


def main():
    ap = argparse.ArgumentParser(description="CSV survey points -> Orbis terrain reference images")
    ap.add_argument("csv", help="Input CSV of points")
    ap.add_argument("--out", default="terrain", help="Output filename prefix")
    ap.add_argument("--grid", type=int, default=400, help="Heightmap grid resolution")
    ap.add_argument("--x", dest="x_col", default=None, help="Name of the X column")
    ap.add_argument("--y", dest="y_col", default=None, help="Name of the Y column")
    ap.add_argument("--z", dest="z_col", default=None, help="Name of the Z column")
    args = ap.parse_args()

    x, y, z = load_points(args.csv, args.x_col, args.y_col, args.z_col)
    stats = describe_terrain(x, y, z)
    print(f"Extent: {stats['width']:.1f} x {stats['height']:.1f} m | "
          f"relief: {stats['relief']:.2f} m "
          f"(Z {stats['zmin']:.2f}-{stats['zmax']:.2f}) | {stats['steep']}")

    _, _, GZ = build_grid(x, y, z, args.grid)
    render_hillshade(GZ, f"{args.out}_hillshade.png")
    render_oblique(x, y, z, f"{args.out}_oblique.png")

    print("\nSuggested Orbis start prompt:")
    print("  " + suggest_prompt(stats))
    print("\nNext: upload one PNG as the Orbis start image, paste the prompt, Start,")
    print("then steer:  'add a building on the ridge'  /  'now winter'  /  'golden hour'.")


if __name__ == "__main__":
    main()
