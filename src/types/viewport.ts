export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ViewportState {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export const MIN_ZOOM = 0.1; // 10%
export const MAX_ZOOM = 5.0; // 500%
export const DEFAULT_ZOOM = 1.0; // 100%
export const ZOOM_STEP = 0.1;
