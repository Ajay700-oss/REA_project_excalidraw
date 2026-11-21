import type { Point } from "./viewport";

export type ElementType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "line"
  | "freedraw"
  | "text";

export interface ExcalidrawElement {
  readonly id: string;
  readonly type: ElementType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly strokeColor: string;
  readonly backgroundColor: string;
  readonly strokeWidth: number;
  readonly roughness: number;
  readonly seed: number;
  readonly isDeleted: boolean;
  readonly version: number;
  // For line, arrow, and freedraw:
  readonly points?: readonly Point[];
  // For text:
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
}

export const DEFAULT_STROKE_COLOR = "#1e1e1e";
export const DEFAULT_BACKGROUND_COLOR = "transparent";
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_ROUGHNESS = 1;
export const DEFAULT_FONT_SIZE = 20;
export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export interface ElementCreationOptions {
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  roughness?: number;
  seed?: number;
  points?: readonly Point[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}
