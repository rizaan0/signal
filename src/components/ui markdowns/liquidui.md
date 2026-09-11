# Liquid UI

I love UI where two cards fuse and the corner between them bends inward, like they were poured together, so I built a tiny engine that just makes it from code instead of drawing it by hand. Drag the cards below to watch the join re-flow, and turn one knob to go from crisp joints all the way to soft gooey blobs.

## Code

### liquid/sdf.ts
```ts
export function sdRoundBox(
  px: number,
  py: number,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  r: number,
): number {

  const rr = Math.min(r, Math.min(hw, hh));
  const qx = Math.abs(px - cx) - hw + rr;
  const qy = Math.abs(py - cy) - hh + rr;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  const outside = Math.hypot(ax, ay);
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - rr;
}

export function sdCapsule(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
): number {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay || 1e-6;

  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / denom));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.hypot(dx, dy) - r;
}

export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

export interface RoundBox {
  kind: "box";
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  r: number;
}
export interface Bridge {
  kind: "bridge";
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}
export type Shape = RoundBox | Bridge;

export function shapeSD(s: Shape, px: number, py: number): number {
  return s.kind === "box"
    ? sdRoundBox(px, py, s.cx, s.cy, s.hw, s.hh, s.r)
    : sdCapsule(px, py, s.ax, s.ay, s.bx, s.by, s.r);
}

export class Field {
  shapes: Shape[];
  k: number;

  constructor(shapes: Shape[] = [], k = 12) {
    this.shapes = shapes;
    this.k = k;
  }

  eval(x: number, y: number): number {
    const { shapes, k } = this;
    if (shapes.length === 0) return Infinity;
    let d = shapeSD(shapes[0], x, y);
    for (let i = 1; i < shapes.length; i++) {
      d = smin(d, shapeSD(shapes[i], x, y), k);
    }
    return d;
  }

  bounds(pad = 0): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = pad + this.k;
    for (const s of this.shapes) {
      if (s.kind === "box") {
        minX = Math.min(minX, s.cx - s.hw - grow);
        minY = Math.min(minY, s.cy - s.hh - grow);
        maxX = Math.max(maxX, s.cx + s.hw + grow);
        maxY = Math.max(maxY, s.cy + s.hh + grow);
      } else {
        minX = Math.min(minX, Math.min(s.ax, s.bx) - s.r - grow);
        minY = Math.min(minY, Math.min(s.ay, s.by) - s.r - grow);
        maxX = Math.max(maxX, Math.max(s.ax, s.bx) + s.r + grow);
        maxY = Math.max(maxY, Math.max(s.ay, s.by) + s.r + grow);
      }
    }
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
  }
}

```

### liquid/marching-squares.ts
```ts
import { Field } from "./sdf";

const fmt = (v: number) => v.toFixed(2);

export interface MarchOptions {

  cell?: number;

  smooth?: number;
}

type Pt = { x: number; y: number };

const EDGES: number[][][] = [
  [],
  [[3, 2]],
  [[2, 1]],
  [[3, 1]],
  [[0, 1]],
  [[3, 2], [0, 1]],
  [[0, 2]],
  [[3, 0]],
  [[3, 0]],
  [[0, 2]],
  [[3, 0], [2, 1]],
  [[0, 1]],
  [[3, 1]],
  [[2, 1]],
  [[3, 2]],
  [],
];

function lerpEdge(x0: number, y0: number, v0: number, x1: number, y1: number, v1: number): Pt {
  const denom = v0 - v1;
  const t = Math.abs(denom) < 1e-6 ? 0.5 : v0 / denom;
  const tc = Math.max(0, Math.min(1, t));
  return { x: x0 + (x1 - x0) * tc, y: y0 + (y1 - y0) * tc };
}

export function contour(field: Field, opts: MarchOptions = {}): Pt[][] {
  const cell = Math.max(2, opts.cell ?? 6);
  const b = field.bounds();
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  if (w <= 0 || h <= 0) return [];

  const cols = Math.ceil(w / cell) + 1;
  const rows = Math.ceil(h / cell) + 1;
  if (cols * rows > 400_000) return [];

  const val = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    const y = b.minY + j * cell;
    for (let i = 0; i < cols; i++) {
      val[j * cols + i] = field.eval(b.minX + i * cell, y);
    }
  }
  const at = (i: number, j: number) => val[j * cols + i];

  const segs: [Pt, Pt][] = [];

  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const x0 = b.minX + i * cell;
      const y0 = b.minY + j * cell;
      const x1 = x0 + cell;
      const y1 = y0 + cell;
      const vTL = at(i, j);
      const vTR = at(i + 1, j);
      const vBR = at(i + 1, j + 1);
      const vBL = at(i, j + 1);

      let mask = 0;
      if (vTL < 0) mask |= 8;
      if (vTR < 0) mask |= 4;
      if (vBR < 0) mask |= 2;
      if (vBL < 0) mask |= 1;
      if (mask === 0 || mask === 15) continue;

      const edgePt = (edge: number): Pt => {
        switch (edge) {
          case 0: return lerpEdge(x0, y0, vTL, x1, y0, vTR);
          case 1: return lerpEdge(x1, y0, vTR, x1, y1, vBR);
          case 2: return lerpEdge(x0, y1, vBL, x1, y1, vBR);
          default: return lerpEdge(x0, y0, vTL, x0, y1, vBL);
        }
      };

      let cases = EDGES[mask];

      if (mask === 5 || mask === 10) {
        const center = field.eval((x0 + x1) / 2, (y0 + y1) / 2);
        if (mask === 5) cases = center < 0 ? [[3, 0], [2, 1]] : [[3, 2], [0, 1]];
        else cases = center < 0 ? [[3, 2], [0, 1]] : [[3, 0], [2, 1]];
      }
      for (const [ea, eb] of cases) segs.push([edgePt(ea), edgePt(eb)]);
    }
  }

  return stitch(segs, cell);
}

function stitch(segs: [Pt, Pt][], cell: number): Pt[][] {
  const eps = cell * 0.5;
  const key = (p: Pt) => `${Math.round(p.x / eps)},${Math.round(p.y / eps)}`;

  const map = new Map<string, { seg: number; end: 0 | 1 }[]>();
  segs.forEach((s, idx) => {
    for (const end of [0, 1] as const) {
      const k = key(s[end]);
      const arr = map.get(k);
      if (arr) arr.push({ seg: idx, end });
      else map.set(k, [{ seg: idx, end }]);
    }
  });

  const used = new Array(segs.length).fill(false);
  const loops: Pt[][] = [];

  for (let start = 0; start < segs.length; start++) {
    if (used[start]) continue;
    const loop: Pt[] = [];
    let cur = start;
    let end: 0 | 1 = 0;
    let guard = 0;
    while (!used[cur] && guard++ < segs.length + 2) {
      used[cur] = true;
      const a = segs[cur][end];
      const bEnd = (end === 0 ? 1 : 0) as 0 | 1;
      const bPt = segs[cur][bEnd];
      loop.push(a);

      const cands = map.get(key(bPt)) ?? [];
      let next = -1;
      let nextEnd: 0 | 1 = 0;
      for (const c of cands) {
        if (!used[c.seg]) {
          next = c.seg;
          nextEnd = c.end;
          break;
        }
      }
      if (next === -1) break;
      cur = next;
      end = nextEnd;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function chaikin(pts: Pt[], passes: number): Pt[] {
  let out = pts;
  for (let p = 0; p < passes; p++) {
    const next: Pt[] = [];
    const n = out.length;
    for (let i = 0; i < n; i++) {
      const a = out[i];
      const b = out[(i + 1) % n];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out = next;
  }
  return out;
}

export function fieldToPath(
  field: Field,
  opts: MarchOptions = {},
): { d: string; minX: number; minY: number; width: number; height: number } {
  const b = field.bounds();
  const loops = contour(field, opts);
  const smooth = opts.smooth ?? 2;
  const parts: string[] = [];
  for (const loop of loops) {
    const s = smooth > 0 ? chaikin(loop, smooth) : loop;
    if (s.length < 3) continue;
    parts.push(
      `M ${fmt(s[0].x)} ${fmt(s[0].y)} ` +
        s.slice(1).map((p) => `L ${fmt(p.x)} ${fmt(p.y)}`).join(" ") +
        " Z",
    );
  }
  return {
    d: parts.join(" "),
    minX: b.minX,
    minY: b.minY,
    width: b.maxX - b.minX,
    height: b.maxY - b.minY,
  };
}

```

### liquid/engine.ts
```ts
import { Field, type Shape, type Bridge } from "./sdf";
import { fieldToPath, type MarchOptions } from "./marching-squares";

export interface LiquidBox {
  id: string;
  cx: number;
  cy: number;
  hw: number;
  hh: number;

  r: number;
}

export interface LiquidParams {

  k: number;

  cell: number;

  smooth: number;
}

export interface LiquidPath {
  d: string;
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export const DEFAULT_PARAMS: LiquidParams = { k: 26, cell: 6, smooth: 2 };

export class LiquidEngine {
  private boxes: LiquidBox[] = [];
  private bridges: Bridge[] = [];
  private params: LiquidParams = { ...DEFAULT_PARAMS };
  private cachedPath: LiquidPath | null = null;
  private sig = "";

  setBoxes(boxes: LiquidBox[]) {
    this.boxes = boxes;
  }
  setBridges(bridges: Bridge[]) {
    this.bridges = bridges;
  }
  setParams(p: Partial<LiquidParams>) {
    this.params = { ...this.params, ...p };
  }

  private signature(): string {
    const b = this.boxes
      .map((x) => `${x.cx.toFixed(1)},${x.cy.toFixed(1)},${x.hw},${x.hh},${x.r}`)
      .join("|");
    const br = this.bridges
      .map((x) => `${x.ax.toFixed(1)},${x.ay.toFixed(1)},${x.bx.toFixed(1)},${x.by.toFixed(1)},${x.r}`)
      .join("|");
    const p = this.params;
    return `${b}#${br}#${p.k},${p.cell},${p.smooth}`;
  }

  compute(): LiquidPath {
    const sig = this.signature();
    if (sig === this.sig && this.cachedPath) return this.cachedPath;
    this.sig = sig;

    const shapes: Shape[] = [
      ...this.boxes.map<Shape>((b) => ({
        kind: "box",
        cx: b.cx,
        cy: b.cy,
        hw: b.hw,
        hh: b.hh,
        r: b.r,
      })),
      ...this.bridges,
    ];
    const field = new Field(shapes, this.params.k);
    const opts: MarchOptions = { cell: this.params.cell, smooth: this.params.smooth };
    this.cachedPath = fieldToPath(field, opts);
    return this.cachedPath;
  }

  isDirty(): boolean {
    return this.signature() !== this.sig;
  }
}

```

### liquid/LiquidGroup.tsx
```tsx
"use client";

import {
  Children,
  isValidElement,
  useMemo,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { LiquidEngine, DEFAULT_PARAMS, type LiquidBox } from "./engine";
import type { Bridge } from "./sdf";

export interface LiquidCardProps {
  id: string;

  x: number;
  y: number;
  w: number;
  h: number;

  radius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function LiquidCard(props: LiquidCardProps) {
  const { x, y, w, h, className, style, children } = props;
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface LiquidGroupProps {
  children: ReactNode;
  /** Blend amount: low = crisp inverse-rounded joints, high = gooey melt. */
  k?: number;
  /** Default per-card corner radius. */
  cardRadius?: number;
  /** Outline crispness (grid cell px) + smoothing passes. */
  cell?: number;
  smooth?: number;
  /** Explicit pipes between card ids, with an optional width. */
  bridges?: { from: string; to: string; width?: number }[];
  /** Fill of the fused skin (any CSS color / gradient via `fillStyle`). */
  fill?: string;
  fillStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
  /** Forwarded onto the skin <svg> for the card→detail view transition. */
  viewTransitionName?: string;
}

type CardEl = ReactElement<LiquidCardProps>;

function isLiquidCard(node: ReactNode): node is CardEl {
  return isValidElement(node) && (node.props as LiquidCardProps).id !== undefined;
}

export function LiquidGroup({
  children,
  k = DEFAULT_PARAMS.k,
  cardRadius = 26,
  cell = DEFAULT_PARAMS.cell,
  smooth = DEFAULT_PARAMS.smooth,
  bridges = [],
  fill = "var(--bg-hover)",
  fillStyle,
  className,
  style,
  viewTransitionName,
}: LiquidGroupProps) {
  const cards = useMemo(
    () => Children.toArray(children).filter(isLiquidCard),
    [children],
  );

  // Build boxes (center-based) + bridge capsules from the card rects, then compute
  // the fused path. useMemo so it only recomputes when geometry / params change.
  const { d, viewBox, skinStyle } = useMemo(() => {
    const boxes: LiquidBox[] = cards.map((c) => {
      const p = c.props;
      return {
        id: p.id,
        cx: p.x + p.w / 2,
        cy: p.y + p.h / 2,
        hw: p.w / 2,
        hh: p.h / 2,
        r: p.radius ?? cardRadius,
      };
    });
    const byId = new Map(boxes.map((b) => [b.id, b]));
    const capsules: Bridge[] = [];
    for (const br of bridges) {
      const a = byId.get(br.from);
      const b = byId.get(br.to);
      if (!a || !b) continue;
      capsules.push({
        kind: "bridge",
        ax: a.cx,
        ay: a.cy,
        bx: b.cx,
        by: b.cy,
        r: br.width ? br.width / 2 : Math.min(a.hh, b.hh) * 0.5,
      });
    }

    const engine = new LiquidEngine();
    engine.setBoxes(boxes);
    engine.setBridges(capsules);
    engine.setParams({ k, cell, smooth });
    const path = engine.compute();

    return {
      d: path.d,
      viewBox: `${path.minX} ${path.minY} ${path.width} ${path.height}`,

      skinStyle: {
        position: "absolute" as const,
        left: path.minX,
        top: path.minY,
        width: path.width,
        height: path.height,
        overflow: "visible" as const,
        pointerEvents: "none" as const,
      },
    };
  }, [cards, k, cardRadius, cell, smooth, bridges]);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {}
      <svg
        aria-hidden
        viewBox={viewBox}
        style={{ ...skinStyle, viewTransitionName, ...fillStyle }}
      >
        <path d={d} fill={fill} />
      </svg>
      {/* real card content on top, in normal DOM */}
      {cards}
    </div>
  );
}

```

### liquid/LiquidCard.tsx
```tsx
"use client";

export { LiquidCard, type LiquidCardProps } from "./LiquidGroup";

```

### liquid/scenes.tsx
```tsx
import type { ReactNode } from "react";

export const CARD_VW = 640;
export const CARD_VH = 360;

export const PG_VW = 720;
export const PG_VH = 380;

export const COMPACT_VW = 360;
export const COMPACT_VH = 202;

export const CARD_DIV = 460;
export const PG_DIV = 720;

export const COMPACT_CARD_DIV = 380;
export const COMPACT_PG_DIV = 430;

export const MOBILE_QUERY = "(max-width: 639px)";

export interface ScenePiece {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  content?: ReactNode;
}

export interface SceneSpec {
  k: number;

  cell: number;
  pieces: ScenePiece[];
}

export interface SceneSet {
  vw: number;
  vh: number;
  cardDiv: number;
  pgDiv: number;
  cardRadius: number;

  card: SceneSpec[];

  playground: SceneSpec[];
}

const swatch = "rounded-[6px] bg-[var(--bg-hover)]";

const bar = (w: string, h: string) => (
  <div className={`${h} rounded-full bg-[var(--bg-hover)]`} style={{ width: w }} />
);

function GridBody({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid h-full grid-cols-2 grid-rows-2 ${compact ? "gap-1.5 p-2 pt-2.5" : "gap-1.5 p-2 pt-2.5"}`}
    >
      <div className={swatch} />
      <div className={swatch} />
      <div className={swatch} />
      <div className={swatch} />
    </div>
  );
}

/** A small text label (the "Grid" / "Share" tab). */
function Label({ children, compact = false, center = false }: { children: ReactNode; compact?: boolean; center?: boolean }) {
  return (
    <div
      className={`flex h-full items-center ${center ? "justify-center pl-1" : "px-3 pb-1"}`}
    >
      <span
        className={`font-semibold text-[var(--text-secondary)] ${compact ? "text-[13px]" : "text-[11px]"}`}
      >
        {children}
      </span>
    </div>
  );
}

function BubbleBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex h-full items-center ${compact ? "gap-3 px-4" : "gap-2.5 px-4"}`}>
      <div
        className={`${compact ? "size-10" : "size-9"} shrink-0 rounded-full bg-[var(--bg-hover)]`}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        {bar("80%", compact ? "h-2.5" : "h-2")}
        {bar("55%", compact ? "h-2.5" : "h-2")}
      </div>
    </div>
  );
}

function ShareBody({ compact = false }: { compact?: boolean }) {
  const av = `${compact ? "size-9" : "size-8"} rounded-full border-2 border-[var(--bg-surface)] bg-[var(--bg-hover)]`;
  return (
    <div className="flex h-full items-center gap-3 px-4">
      <div className="flex -space-x-2">
        <div className={av} />
        <div className={av} />
        <div className={av} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {bar("70%", compact ? "h-2.5" : "h-2")}
        {bar("45%", compact ? "h-2.5" : "h-2")}
      </div>
    </div>
  );
}

/** The search-bar input line. */
function SearchBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-full items-center px-5">
      {bar("55%", compact ? "h-3" : "h-2.5")}
    </div>
  );
}

function SearchIcon({ size = 20 }: { size?: number }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
    </div>
  );
}

const CARD_SCENES: SceneSpec[] = [

  {
    k: 20,
    cell: 6,
    pieces: [
      { id: "main", x: 170, y: 82, w: 300, h: 196, radius: 22, content: <GridBody /> },
      { id: "tab", x: 178, y: 46, w: 92, h: 46, radius: 18, content: <Label>Grid</Label> },
    ],
  },
  // Chat bubble — avatar + message lines, tail fused at the bottom-right.
  {
    k: 30,
    cell: 6,
    pieces: [
      { id: "main", x: 160, y: 128, w: 300, h: 108, radius: 40, content: <BubbleBody /> },
      { id: "tab", x: 428, y: 206, w: 50, h: 50, radius: 14 },
    ],
  },
  // Share card — avatar stack + a "Share" button fused to the right edge (gooey).
  {
    k: 60,
    cell: 6,
    pieces: [
      { id: "main", x: 150, y: 120, w: 280, h: 116, radius: 26, content: <ShareBody /> },
      { id: "tab", x: 418, y: 151, w: 90, h: 54, radius: 18, content: <Label center>Share</Label> },
    ],
  },
];

// The playground's four presets, hand-placed by dragging in the playground
// itself, in the wider 720×380 stage (absolute coords, no auto-centering).
const PG_SCENES: SceneSpec[] = [
  // 1 · Chat bubble — tail fused at the bottom-right (a sent message).
  {
    k: 28,
    cell: 12,
    pieces: [
      { id: "bubble", x: 188, y: 123, w: 300, h: 116, radius: 40, content: <BubbleBody /> },
      { id: "tail", x: 472, y: 212, w: 52, h: 52, radius: 14 },
    ],
  },
  // 2 · Grid panel — a "Grid" tab fused at the top-left.
  {
    k: 20,
    cell: 12,
    pieces: [
      { id: "tab", x: 178, y: 80, w: 92, h: 46, radius: 18, content: <Label>Grid</Label> },
      { id: "panel", x: 247, y: 104, w: 300, h: 196, radius: 22, content: <GridBody /> },
    ],
  },
  // 3 · Share card — a "Share" button fused to the right edge with a gooey neck.
  {
    k: 77,
    cell: 11,
    pieces: [
      { id: "card", x: 176, y: 131, w: 288, h: 120, radius: 26, content: <ShareBody /> },
      { id: "btn", x: 483, y: 165, w: 96, h: 52, radius: 18, content: <Label center>Share</Label> },
    ],
  },
  // 4 · Search bar — a pill input with a round button fused near the right end.
  {
    k: 20,
    cell: 3,
    pieces: [
      { id: "input", x: 208, y: 167, w: 300, h: 64, radius: 32, content: <SearchBody /> },
      { id: "go", x: 452, y: 132, w: 56, h: 56, radius: 26, content: <SearchIcon /> },
    ],
  },
];

// ── Compact (mobile) scenes ──────────────────────────────────────────────────
// Re-placed for the 360×202 space rather than rescaled: the compositions are
// tighter and more vertical, the bodies are proportionally larger relative to the
// frame, and every draggable appendage is at least 60 design-px so it stays a
// comfortable touch target once the ~1.0 compact scale is applied.
//
// `cell` is raised across the board. It's a grid step in FIELD units, so a small
// cell in a small space oversamples badly — the compact space is ~half the width
// of the desktop one, so the same visual crispness needs roughly half the cell
// count, and the weakest devices are the ones running it.
const COMPACT_CARD_SCENES: SceneSpec[] = [
  // Grid panel — tab tucked at the top-left of the body.
  {
    k: 16,
    cell: 5,
    pieces: [
      { id: "main", x: 76, y: 49, w: 208, h: 132, radius: 20, content: <GridBody compact /> },
      { id: "tab", x: 84, y: 21, w: 78, h: 38, radius: 15, content: <Label compact>Grid</Label> },
    ],
  },
  // Chat bubble — tail fused at the bottom-right.
  {
    k: 22,
    cell: 5,
    pieces: [
      { id: "main", x: 64, y: 62, w: 232, h: 92, radius: 32, content: <BubbleBody compact /> },
      { id: "tab", x: 262, y: 128, w: 46, h: 46, radius: 13 },
    ],
  },
  // Share card — button fused to the right edge (gooey).
  {
    k: 44,
    cell: 5,
    pieces: [
      { id: "main", x: 46, y: 60, w: 210, h: 96, radius: 22, content: <ShareBody compact /> },
      { id: "tab", x: 246, y: 78, w: 74, h: 48, radius: 16, content: <Label compact center>Share</Label> },
    ],
  },
];

const COMPACT_PG_SCENES: SceneSpec[] = [
  // 1 · Chat bubble + tail. The tail is the smallest draggable piece anywhere, so
  //     it sets the floor: 64px keeps it a usable target even on a 320px phone.
  {
    k: 22,
    cell: 6,
    pieces: [
      { id: "bubble", x: 52, y: 56, w: 232, h: 92, radius: 32, content: <BubbleBody compact /> },
      { id: "tail", x: 250, y: 120, w: 64, h: 64, radius: 17 },
    ],
  },
  // 2 · Grid panel + tab. The tab is short by nature, so it's the piece most at risk
  //     of becoming an unusable target — 64 tall keeps it draggable, and the panel
  //     drops to meet it so the pair still reads as a tab fused to a panel.
  {
    k: 16,
    cell: 6,
    pieces: [
      { id: "tab", x: 60, y: 18, w: 92, h: 64, radius: 20, content: <Label compact>Grid</Label> },
      { id: "panel", x: 96, y: 62, w: 204, h: 122, radius: 20, content: <GridBody compact /> },
    ],
  },
  // 3 · Share card + button, gooey neck.
  {
    k: 52,
    cell: 6,
    pieces: [
      { id: "card", x: 40, y: 56, w: 204, h: 100, radius: 22, content: <ShareBody compact /> },
      { id: "btn", x: 242, y: 74, w: 82, h: 64, radius: 20, content: <Label compact center>Share</Label> },
    ],
  },
  // 4 · Search bar + go button, both at the 64px floor.
  {
    k: 16,
    cell: 5,
    pieces: [
      { id: "input", x: 42, y: 80, w: 224, h: 64, radius: 32, content: <SearchBody compact /> },
      { id: "go", x: 238, y: 50, w: 64, h: 64, radius: 29, content: <SearchIcon size={22} /> },
    ],
  },
];

// ── The two sets ─────────────────────────────────────────────────────────────
export const DESKTOP_SET: SceneSet = {
  vw: PG_VW,
  vh: PG_VH,
  cardDiv: CARD_DIV,
  pgDiv: PG_DIV,
  cardRadius: 26,
  card: CARD_SCENES,
  playground: PG_SCENES,
};

export const COMPACT_SET: SceneSet = {
  vw: COMPACT_VW,
  vh: COMPACT_VH,
  cardDiv: COMPACT_CARD_DIV,
  pgDiv: COMPACT_PG_DIV,
  cardRadius: 20,
  card: COMPACT_CARD_SCENES,
  playground: COMPACT_PG_SCENES,
};

/** The card/hero uses its own space (640×360) on desktop but shares the compact
 *  space on mobile — so the two sets differ in `vw`/`vh` for the card path. */
export const CARD_SPACE = { vw: CARD_VW, vh: CARD_VH };
export const COMPACT_CARD_SPACE = { vw: COMPACT_VW, vh: COMPACT_VH };

```

### liquid/playground.tsx
```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiquidGroup, LiquidCard } from "./LiquidGroup";
import { PG_PREVIEW, PG_PANEL, Slider, SegmentedControl, GhostButton } from "../swirl/controls";
import { SectionLabel } from "../section-label";
import { hapticTap } from "../../lib/haptics";
import { useSceneSet } from "./use-compact";
import { COMPACT_SET, type ScenePiece } from "./scenes";

const MODES = [
  { id: "geometric", label: "Geometric", k: 22, cell: 5 },
  { id: "goo", label: "Goo", k: 64, cell: 7 },
];
const COMPACT_MODES = [
  { id: "geometric", label: "Geometric", k: 14, cell: 5 },
  { id: "goo", label: "Goo", k: 42, cell: 6 },
];

const REMIX_MS = 620;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function byRole(cards: ScenePiece[]): ScenePiece[] {
  return [...cards].sort((a, b) => b.w * b.h - a.w * a.h);
}

function tweenCards(from: ScenePiece[], to: ScenePiece[], p: number): ScenePiece[] {
  const a = byRole(from);
  const b = byRole(to);
  return a.map((fc, i) => {
    const tc = b[i] ?? fc;
    const src = p < 0.5 ? fc : tc;
    return {
      id: src.id,
      x: lerp(fc.x, tc.x, p),
      y: lerp(fc.y, tc.y, p),
      w: lerp(fc.w, tc.w, p),
      h: lerp(fc.h, tc.h, p),
      radius: lerp(fc.radius, tc.radius, p),
      content: src.content,
    };
  });
}

export function LiquidPlayground() {
  const set = useSceneSet();
  const compact = set === COMPACT_SET;
  const presets = set.playground;
  const { vw: VW, vh: VH } = set;
  const modes = compact ? COMPACT_MODES : MODES;

  const [presetIdx, setPresetIdx] = useState(0);
  const [cards, setCards] = useState<ScenePiece[]>(() => presets[0].pieces.map((c) => ({ ...c })));
  const [mode, setMode] = useState("");
  const [k, setK] = useState(presets[0].k);
  const [cell, setCell] = useState(presets[0].cell);

  const [activePresets, setActivePresets] = useState(presets);
  if (activePresets !== presets) {
    setActivePresets(presets);
    setPresetIdx(0);
    setCards(presets[0].pieces.map((c) => ({ ...c })));
    setK(presets[0].k);
    setCell(presets[0].cell);
    setMode("");
  }

  const stageRef = useRef<HTMLDivElement>(null);

  const spaceRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const morph = useRef<{ from: ScenePiece[]; to: ScenePiece[]; fromK: number; toK: number; start: number; raf: number } | null>(null);

  useEffect(() => {
    if (morph.current?.raf) cancelAnimationFrame(morph.current.raf);
    morph.current = null;
    drag.current = null;
  }, [presets]);

  const remix = () => {
    hapticTap();
    const i = (presetIdx + 1) % presets.length;
    const target = presets[i];
    setPresetIdx(i);
    setMode("");
    setCell(target.cell);

    if (morph.current?.raf) cancelAnimationFrame(morph.current.raf);
    const m = {
      from: cards.map((c) => ({ ...c })),
      to: target.pieces.map((c) => ({ ...c })),
      fromK: k,
      toK: target.k,
      start: 0,
      raf: 0,
    };
    morph.current = m;
    const step = (now: number) => {
      if (!m.start) m.start = now;
      const p = ease(Math.min(1, (now - m.start) / REMIX_MS));
      setCards(tweenCards(m.from, m.to, p));
      setK(Math.round(lerp(m.fromK, m.toK, p)));
      if (p < 1) {
        m.raf = requestAnimationFrame(step);
      } else {

        setCards(target.pieces.map((c) => ({ ...c })));
        setK(target.k);
        morph.current = null;
      }
    };
    m.raf = requestAnimationFrame(step);
  };

  useEffect(() => () => { if (morph.current?.raf) cancelAnimationFrame(morph.current.raf); }, []);

  const applyMode = (id: string) => {
    setMode(id);
    const m = modes.find((x) => x.id === id);
    if (m) {
      setK(m.k);
      setCell(m.cell);
    }
  };

  const toLocal = useCallback(
    (clientX: number, clientY: number) => {

      const el = spaceRef.current ?? stageRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * VW,
        y: ((clientY - r.top) / r.height) * VH,
      };
    },
    [VW, VH],
  );

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {

    if (morph.current?.raf) {
      cancelAnimationFrame(morph.current.raf);
      morph.current = null;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    drag.current = { id, dx: p.x - card.x, dy: p.y - card.y };
    hapticTap();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toLocal(e.clientX, e.clientY);
    const { id, dx, dy } = drag.current;

    const slack = VW * 0.055;
    setCards((cs) =>
      cs.map((c) =>
        c.id === id
          ? {
              ...c,
              x: Math.max(-slack, Math.min(VW - c.w + slack, p.x - dx)),
              y: Math.max(-slack, Math.min(VH - c.h + slack, p.y - dy)),
            }
          : c,
      ),
    );
  };
  const endDrag = () => {
    drag.current = null;
  };

  const groupBridges = useMemo(() => [], []);

  const kMax = compact ? 60 : 90;
  const cellMin = compact ? 4 : 3;
  const cellMax = compact ? 10 : 14;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SectionLabel action={<GhostButton onClick={remix}>Remix</GhostButton>}>
        Implementation
      </SectionLabel>

      {}
      <div className={`${PG_PREVIEW} touch-none`}>
        <div
          ref={stageRef}
          className="relative w-full"
          style={{ aspectRatio: `${VW} / ${VH}` }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="absolute inset-0" style={{ containerType: "size" }}>
            {}
            <div
              ref={spaceRef}
              className="absolute left-1/2 top-1/2"
              style={{
                width: VW,
                height: VH,
                transform: "translate(-50%, -50%)",
                transformOrigin: "center",
                scale: `calc(100cqw / ${set.pgDiv})`,
              }}
            >
              <LiquidGroup
                k={k}
                cardRadius={set.cardRadius}
                cell={cell}
                smooth={2}
                bridges={groupBridges}
                fill="var(--bg-surface)"
                className="h-full w-full"
              >
                {cards.map((c) => (
                  <LiquidCard key={c.id} id={c.id} x={c.x} y={c.y} w={c.w} h={c.h} radius={c.radius}>
                    <div
                      onPointerDown={onPointerDown(c.id)}
                      className="h-full w-full cursor-grab active:cursor-grabbing"
                    >
                      {c.content}
                    </div>
                  </LiquidCard>
                ))}
              </LiquidGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className={`${PG_PANEL} gap-3.5`}>
        <SegmentedControl
          options={modes.map((m) => ({ id: m.id, label: m.label }))}
          activeId={mode}
          onPick={applyMode}
          fill
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Slider label="Blend" value={k} min={0} max={kMax} step={1}
            format={(v) => `${v}`} onChange={(v) => { setMode(""); setK(v); }} />
          <Slider label="Detail" value={cell} min={cellMin} max={cellMax} step={1}
            format={(v) => `${v}px`} onChange={(v) => { setMode(""); setCell(v); }} />
        </div>
      </div>
    </div>
  );
}

```

## Credits
- Company: Study
- Date: Jul 27, 2026
- Tags: SVG, SDF, Morph