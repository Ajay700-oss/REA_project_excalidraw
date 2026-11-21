import type { Point } from "../types/viewport";
import {
  type ElementType,
  type ExcalidrawElement,
  type ElementCreationOptions,
  DEFAULT_STROKE_COLOR,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_ROUGHNESS,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
} from "../types/element";

export interface NormalizedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Normalizes start and current points into top-left (x, y) and non-negative (width, height).
 * Ensures correct geometry regardless of drag direction (upward, downward, leftward, rightward).
 */
export function normalizeBounds(start: Point, current: Point): NormalizedBounds {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  return { x, y, width, height };
}

/**
 * Generates the 4 vertices of a diamond centered in the bounding box [x, y, width, height]:
 * [Top, Right, Bottom, Left]
 */
export function getDiamondPoints(
  x: number,
  y: number,
  width: number,
  height: number
): [Point, Point, Point, Point] {
  return [
    { x: x + width / 2, y },
    { x: x + width, y: y + height / 2 },
    { x: x + width / 2, y: y + height },
    { x, y: y + height / 2 },
  ];
}

/**
 * Calculates the two arrowhead barb endpoints at the end of a line/arrow.
 */
export function getArrowheadPoints(
  start: Point,
  end: Point,
  arrowLength = 18,
  arrowAngle = Math.PI / 6
): [Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const dist = Math.hypot(dx, dy);
  const actualLength = Math.min(arrowLength, Math.max(dist * 0.4, 4));

  const barb1: Point = {
    x: end.x - actualLength * Math.cos(angle - arrowAngle),
    y: end.y - actualLength * Math.sin(angle - arrowAngle),
  };
  const barb2: Point = {
    x: end.x - actualLength * Math.cos(angle + arrowAngle),
    y: end.y - actualLength * Math.sin(angle + arrowAngle),
  };

  return [barb1, barb2];
}

/**
 * Generates a deterministic positive 32-bit integer seed for Rough.js.
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}

/**
 * Creates an ExcalidrawElement from two points (start & current) and optional styling.
 */
export function createElement(
  type: ElementType,
  start: Point,
  current: Point,
  options?: ElementCreationOptions,
  id: string = crypto.randomUUID()
): ExcalidrawElement {
  if (type === "line" || type === "arrow") {
    return createLineElement(type, start, current, options, id);
  }

  const { x, y, width, height } = normalizeBounds(start, current);

  return {
    id,
    type,
    x,
    y,
    width,
    height,
    strokeColor: options?.strokeColor ?? DEFAULT_STROKE_COLOR,
    backgroundColor: options?.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    strokeWidth: options?.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    roughness: options?.roughness ?? DEFAULT_ROUGHNESS,
    seed: options?.seed ?? generateSeed(),
    isDeleted: false,
    version: 1,
  };
}

/**
 * Creates a line or arrow element with start and end points.
 */
export function createLineElement(
  type: "line" | "arrow",
  start: Point,
  end: Point,
  options?: ElementCreationOptions,
  id: string = crypto.randomUUID()
): ExcalidrawElement {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.max(Math.abs(end.x - start.x), 1);
  const height = Math.max(Math.abs(end.y - start.y), 1);

  return {
    id,
    type,
    x,
    y,
    width,
    height,
    points: [start, end],
    strokeColor: options?.strokeColor ?? DEFAULT_STROKE_COLOR,
    backgroundColor: options?.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    strokeWidth: options?.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    roughness: options?.roughness ?? DEFAULT_ROUGHNESS,
    seed: options?.seed ?? generateSeed(),
    isDeleted: false,
    version: 1,
  };
}

/**
 * Creates a freehand stroke element from a series of points.
 */
export function createFreedrawElement(
  points: readonly Point[],
  options?: ElementCreationOptions,
  id: string = crypto.randomUUID()
): ExcalidrawElement {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const x = points.length > 0 ? minX : 0;
  const y = points.length > 0 ? minY : 0;
  const width = points.length > 0 ? Math.max(maxX - minX, 1) : 1;
  const height = points.length > 0 ? Math.max(maxY - minY, 1) : 1;

  return {
    id,
    type: "freedraw",
    x,
    y,
    width,
    height,
    points,
    strokeColor: options?.strokeColor ?? DEFAULT_STROKE_COLOR,
    backgroundColor: options?.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    strokeWidth: options?.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    roughness: options?.roughness ?? DEFAULT_ROUGHNESS,
    seed: options?.seed ?? generateSeed(),
    isDeleted: false,
    version: 1,
  };
}

/**
 * Creates a text element.
 */
export function createTextElement(
  text: string,
  position: Point,
  options?: ElementCreationOptions,
  id: string = crypto.randomUUID()
): ExcalidrawElement {
  const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = options?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const lines = text.split("\n");
  const approxCharWidth = fontSize * 0.6;
  const maxLineLength = Math.max(...lines.map((l) => l.length), 1);
  const width = Math.max(maxLineLength * approxCharWidth, 20);
  const height = Math.max(lines.length * fontSize * 1.25, fontSize);

  return {
    id,
    type: "text",
    x: position.x,
    y: position.y,
    width,
    height,
    text,
    fontSize,
    fontFamily,
    strokeColor: options?.strokeColor ?? DEFAULT_STROKE_COLOR,
    backgroundColor: options?.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    strokeWidth: options?.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    roughness: options?.roughness ?? DEFAULT_ROUGHNESS,
    seed: options?.seed ?? generateSeed(),
    isDeleted: false,
    version: 1,
  };
}

/**
 * Calculates the shortest distance from point p to line segment ab.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Checks whether a scene point hits an element within a tolerance threshold.
 */
export function hitTestElement(
  point: Point,
  element: ExcalidrawElement,
  threshold = 12
): boolean {
  if (element.isDeleted) return false;

  // Line and Arrow hit test
  if (element.type === "line" || element.type === "arrow") {
    if (element.points && element.points.length >= 2) {
      return distanceToSegment(point, element.points[0], element.points[1]) <= threshold;
    }
  }

  // Freehand hit test
  if (element.type === "freedraw") {
    if (element.points && element.points.length >= 2) {
      for (let i = 0; i < element.points.length - 1; i++) {
        if (distanceToSegment(point, element.points[i], element.points[i + 1]) <= threshold) {
          return true;
        }
      }
      return false;
    }
  }

  // Bounding box hit test for rectangle, ellipse, diamond, text
  const pad = threshold;
  return (
    point.x >= element.x - pad &&
    point.x <= element.x + element.width + pad &&
    point.y >= element.y - pad &&
    point.y <= element.y + element.height + pad
  );
}
