import rough from "roughjs";
import type { ExcalidrawElement } from "../types/element";
import { getDiamondPoints, getArrowheadPoints } from "../math/elementGeometry";

type RoughCanvas = ReturnType<typeof rough.canvas>;

export class ShapeRenderer {
  /**
   * Renders a single ExcalidrawElement using Rough.js for sketchy hand-drawn style
   * and standard Canvas 2D for text.
   * Uses element.seed to ensure deterministic rendering on every redraw.
   */
  public static renderElement(
    rc: RoughCanvas,
    element: ExcalidrawElement,
    ctx?: CanvasRenderingContext2D
  ): void {
    if (element.isDeleted) return;

    const options = {
      seed: element.seed,
      stroke: element.strokeColor,
      strokeWidth: element.strokeWidth,
      roughness: element.roughness,
      fill: element.backgroundColor === "transparent" ? undefined : element.backgroundColor,
      fillStyle: "solid" as const,
    };

    switch (element.type) {
      case "rectangle": {
        if (element.width <= 0 && element.height <= 0) return;
        rc.rectangle(
          element.x,
          element.y,
          element.width,
          element.height,
          options
        );
        break;
      }
      case "ellipse": {
        if (element.width <= 0 && element.height <= 0) return;
        rc.ellipse(
          element.x + element.width / 2,
          element.y + element.height / 2,
          element.width,
          element.height,
          options
        );
        break;
      }
      case "diamond": {
        if (element.width <= 0 && element.height <= 0) return;
        const vertices = getDiamondPoints(
          element.x,
          element.y,
          element.width,
          element.height
        );
        const polygonPoints = vertices.map((p) => [p.x, p.y] as [number, number]);
        rc.polygon(polygonPoints, options);
        break;
      }
      case "line": {
        const points = element.points ?? [
          { x: element.x, y: element.y },
          { x: element.x + element.width, y: element.y + element.height },
        ];
        if (points.length < 2) return;
        rc.line(points[0].x, points[0].y, points[1].x, points[1].y, options);
        break;
      }
      case "arrow": {
        const points = element.points ?? [
          { x: element.x, y: element.y },
          { x: element.x + element.width, y: element.y + element.height },
        ];
        if (points.length < 2) return;
        const start = points[0];
        const end = points[1];

        // Draw main shaft
        rc.line(start.x, start.y, end.x, end.y, options);

        // Draw arrowhead barbs
        const [barb1, barb2] = getArrowheadPoints(start, end);
        rc.line(end.x, end.y, barb1.x, barb1.y, options);
        rc.line(end.x, end.y, barb2.x, barb2.y, options);
        break;
      }
      case "freedraw": {
        if (!element.points || element.points.length < 2) return;
        const pathPoints = element.points.map((p) => [p.x, p.y] as [number, number]);
        rc.linearPath(pathPoints, options);
        break;
      }
      case "text": {
        if (!element.text) return;
        const context = ctx || (rc as unknown as { ctx?: CanvasRenderingContext2D }).ctx;
        if (!context) return;

        context.save();
        const fontSize = element.fontSize ?? 20;
        const fontFamily =
          element.fontFamily ??
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        context.font = `${fontSize}px ${fontFamily}`;
        context.fillStyle = element.strokeColor;
        context.textBaseline = "top";

        const lines = element.text.split("\n");
        const lineHeight = fontSize * 1.25;
        lines.forEach((line, index) => {
          context.fillText(line, element.x, element.y + index * lineHeight);
        });
        context.restore();
        break;
      }
    }
  }
}
