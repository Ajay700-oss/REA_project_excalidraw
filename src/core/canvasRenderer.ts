import rough from "roughjs";
import type { ViewportState } from "../types/viewport";
import type { InteractionState } from "../types/canvas";
import type { ExcalidrawElement } from "../types/element";
import { ShapeRenderer } from "./shapeRenderer";

export interface CanvasDimensions {
  width: number;
  height: number;
  dpr: number;
}

export class CanvasRenderer {
  /**
   * Adjusts canvas buffer resolution to device pixel ratio for crystal clear rendering.
   */
  public static resizeCanvas(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    dpr: number
  ): void {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  /**
   * Applies the viewport transform matrix to a 2D canvas context.
   */
  public static applyTransform(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    dpr: number
  ): void {
    const { scrollX, scrollY, zoom } = viewport;
    ctx.setTransform(
      dpr * zoom,
      0,
      0,
      dpr * zoom,
      dpr * scrollX * zoom,
      dpr * scrollY * zoom
    );
  }

  /**
   * Renders the static canvas layer:
   * - Background fill
   * - Infinite subtle dot grid aligned to scene coordinates
   * - Committed scene elements with Rough.js & Canvas 2D
   */
  public static renderStatic(
    canvas: HTMLCanvasElement,
    viewport: ViewportState,
    dpr: number,
    elements: readonly ExcalidrawElement[] = [],
    backgroundColor = "#ffffff"
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset transform to screen space to clear entire canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transform
    this.applyTransform(ctx, viewport, dpr);

    // Draw infinite background dot grid to give clear visual feedback of pan and zoom
    this.drawGrid(ctx, canvas, viewport);

    // Render committed scene elements
    if (elements.length > 0) {
      const rc = rough.canvas(canvas);
      for (const element of elements) {
        ShapeRenderer.renderElement(rc, element, ctx);
      }
    }
  }

  /**
   * Renders the interactive overlay canvas:
   * - In-progress shape/line/arrow/freedraw preview during drawing
   */
  public static renderInteractive(
    canvas: HTMLCanvasElement,
    viewport: ViewportState,
    dpr: number,
    _interaction: InteractionState,
    previewElement: ExcalidrawElement | null = null
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear overlay in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transform
    this.applyTransform(ctx, viewport, dpr);

    // Render in-progress drawing preview with Rough.js / Canvas 2D
    if (previewElement) {
      const rc = rough.canvas(canvas);
      ShapeRenderer.renderElement(rc, previewElement, ctx);
    }
  }

  /**
   * Draws a subtle dot grid at scene coordinates aligned with viewport scale.
   */
  private static drawGrid(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    viewport: ViewportState
  ): void {
    const { scrollX, scrollY, zoom } = viewport;
    const width = canvas.width;
    const height = canvas.height;

    // Grid spacing in scene pixels
    const baseGridSize = 20;
    const gridSize = baseGridSize;

    // Determine the visible scene bounds:
    const startX = Math.floor((-scrollX) / gridSize) * gridSize;
    const endX = Math.ceil((width / zoom - scrollX) / gridSize) * gridSize;
    const startY = Math.floor((-scrollY) / gridSize) * gridSize;
    const endY = Math.ceil((height / zoom - scrollY) / gridSize) * gridSize;

    // Dot grid styling
    ctx.fillStyle = "#e0e0e0";
    const dotRadius = Math.max(1 / zoom, 0.75);

    // Skip drawing dots if zoomed way out to prevent performance degradation
    if (zoom < 0.25) return;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(x + dotRadius, y);
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // Subtle origin indicator (0, 0)
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.stroke();
  }
}
