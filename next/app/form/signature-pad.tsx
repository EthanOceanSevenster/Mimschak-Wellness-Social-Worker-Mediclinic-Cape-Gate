"use client";

import { useEffect, useRef, useState } from "react";

/*
 * A fixed drawing resolution, scaled to whatever width the box is shown at.
 * Mapping pointer positions into this space means resizing or rotating the
 * phone mid-signature never distorts or wipes what is drawn.
 *
 * The ground is always white and the ink always dark, in dark mode too, so
 * the saved image reads the same wherever it is shown later.
 */
const WIDTH = 1200;
const HEIGHT = 360;
const INK = "#1b2530";
const STROKE_CSS_PX = 2.6;

type Point = { x: number; y: number };

export function SignaturePad({
  labelId,
  onChange,
}: {
  labelId: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<Point | null>(null);
  const [empty, setEmpty] = useState(true);

  function context() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function paintGround() {
    const ctx = context();
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  useEffect(paintGround, []);

  function scale(canvas: HTMLCanvasElement) {
    return WIDTH / canvas.getBoundingClientRect().width;
  }

  function toPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (WIDTH / rect.width),
      y: (event.clientY - rect.top) * (HEIGHT / rect.height),
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = context();
    if (!ctx) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = toPoint(event);
    last.current = p;
    // A tap leaves a dot, so an initial or a full stop is not lost.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (STROKE_CSS_PX * scale(event.currentTarget)) / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = context();
    if (!ctx || !last.current) return;
    const p = toPoint(event);
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE_CSS_PX * scale(event.currentTarget);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function end() {
    if (!last.current) return;
    last.current = null;
    setEmpty(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    paintGround();
    setEmpty(true);
    onChange("");
  }

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded border" style={{ background: "#ffffff" }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-labelledby={labelId}
          className="block h-auto w-full cursor-crosshair touch-none"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        {/* The line to sign on, and a prompt until something is drawn. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[6%] bottom-[24%] border-b"
          style={{ borderColor: "#c9d1d9" }}
        />
        {empty && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-[0.95rem]"
            style={{ color: "#7b8794" }}
          >
            Sign here with your finger or mouse
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[0.9rem]" style={{ color: "var(--text-soft)" }}>
          {empty ? "Not signed yet." : "Signed."}
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={empty}
          className="rounded-full border px-4 py-1.5 text-[0.9rem] font-semibold transition-colors hover:border-[var(--brand)] disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
