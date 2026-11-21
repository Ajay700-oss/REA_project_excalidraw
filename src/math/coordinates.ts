import {
  type Point,
  type ViewportState,
  MIN_ZOOM,
  MAX_ZOOM,
} from "../types/viewport";

/**
 * Clamps a zoom level between minimum and maximum allowed limits.
 */
export function clampZoom(
  zoom: number,
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM
): number {
  return Math.min(Math.max(zoom, minZoom), maxZoom);
}

/**
 * Converts screen coordinates (e.g. pointer client position relative to canvas)
 * to infinite scene/world coordinates.
 *
 * Formula:
 * x_screen = (x_scene + scrollX) * zoom
 * => x_scene = (x_screen / zoom) - scrollX
 */
export function screenToScene(
  screenPoint: Point,
  viewport: ViewportState
): Point {
  const { scrollX, scrollY, zoom } = viewport;
  return {
    x: screenPoint.x / zoom - scrollX,
    y: screenPoint.y / zoom - scrollY,
  };
}

/**
 * Converts scene/world coordinates back to screen coordinates.
 *
 * Formula:
 * x_screen = (x_scene + scrollX) * zoom
 */
export function sceneToScreen(
  scenePoint: Point,
  viewport: ViewportState
): Point {
  const { scrollX, scrollY, zoom } = viewport;
  return {
    x: (scenePoint.x + scrollX) * zoom,
    y: (scenePoint.y + scrollY) * zoom,
  };
}

/**
 * Calculates updated scroll coordinates when zooming into/out of a specific point on the screen (the anchor).
 *
 * Invariant: The scene coordinate directly underneath the screen anchor point
 * must remain at the exact same screen position after the zoom change.
 */
export function calculateZoomAroundPoint(
  anchorScreenPoint: Point,
  targetZoom: number,
  currentViewport: ViewportState,
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM
): ViewportState {
  const nextZoom = clampZoom(targetZoom, minZoom, maxZoom);
  if (nextZoom === currentViewport.zoom) {
    return currentViewport;
  }

  // Scene point at cursor under the current zoom:
  const sceneAnchor = screenToScene(anchorScreenPoint, currentViewport);

  // We want: (sceneAnchor.x + newScrollX) * nextZoom = anchorScreenPoint.x
  // => newScrollX = (anchorScreenPoint.x / nextZoom) - sceneAnchor.x
  const newScrollX = anchorScreenPoint.x / nextZoom - sceneAnchor.x;
  const newScrollY = anchorScreenPoint.y / nextZoom - sceneAnchor.y;

  return {
    scrollX: newScrollX,
    scrollY: newScrollY,
    zoom: nextZoom,
  };
}

/**
 * Calculates new scroll coordinates when the user drags the mouse by a screen pixel delta.
 *
 * Moving screen by delta moves scene by delta / zoom.
 */
export function calculatePanDelta(
  deltaScreenX: number,
  deltaScreenY: number,
  currentViewport: ViewportState
): ViewportState {
  return {
    ...currentViewport,
    scrollX: currentViewport.scrollX + deltaScreenX / currentViewport.zoom,
    scrollY: currentViewport.scrollY + deltaScreenY / currentViewport.zoom,
  };
}
