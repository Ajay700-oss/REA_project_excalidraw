import type { Point } from "./viewport";

export type ToolType =
  | "selection"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "eraser"
  | "hand";

export type InteractionMode = "idle" | "panning" | "drawing" | "selecting" | "erasing";

export interface InteractionState {
  mode: InteractionMode;
  isSpacePressed: boolean;
  panStart: Point | null;
  currentPointer: Point | null;
}
