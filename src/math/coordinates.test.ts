import { describe, it, expect } from "vitest";
import {
  screenToScene,
  sceneToScreen,
  clampZoom,
  calculateZoomAroundPoint,
  calculatePanDelta,
} from "./coordinates";
import type { ViewportState, Point } from "../types/viewport";

describe("Coordinate Math", () => {
  it("clampZoom should respect boundaries", () => {
    expect(clampZoom(0.05, 0.1, 5.0)).toBe(0.1);
    expect(clampZoom(6.0, 0.1, 5.0)).toBe(5.0);
    expect(clampZoom(1.5, 0.1, 5.0)).toBe(1.5);
  });

  it("screenToScene and sceneToScreen should be exact inverses at default 1.0 zoom", () => {
    const viewport: ViewportState = { scrollX: 0, scrollY: 0, zoom: 1.0 };
    const screenPt: Point = { x: 350, y: 480 };

    const scenePt = screenToScene(screenPt, viewport);
    expect(scenePt).toEqual({ x: 350, y: 480 });

    const backToScreen = sceneToScreen(scenePt, viewport);
    expect(backToScreen.x).toBeCloseTo(screenPt.x);
    expect(backToScreen.y).toBeCloseTo(screenPt.y);
  });

  it("screenToScene and sceneToScreen should be exact inverses with arbitrary scroll and zoom", () => {
    const viewport: ViewportState = { scrollX: -120, scrollY: 450, zoom: 1.75 };
    const originalScreenPt: Point = { x: 800, y: 600 };

    const scenePt = screenToScene(originalScreenPt, viewport);
    const convertedScreenPt = sceneToScreen(scenePt, viewport);

    expect(convertedScreenPt.x).toBeCloseTo(originalScreenPt.x, 5);
    expect(convertedScreenPt.y).toBeCloseTo(originalScreenPt.y, 5);
  });

  it("calculateZoomAroundPoint keeps the scene point under the cursor at the same screen position", () => {
    const initialViewport: ViewportState = { scrollX: 100, scrollY: 200, zoom: 1.0 };
    const cursorScreenPt: Point = { x: 400, y: 300 };

    // Find the scene coordinate directly under the cursor before zoom
    const sceneUnderCursorBefore = screenToScene(cursorScreenPt, initialViewport);

    // Zoom in from 1.0 to 2.5
    const zoomedViewport = calculateZoomAroundPoint(cursorScreenPt, 2.5, initialViewport);
    expect(zoomedViewport.zoom).toBe(2.5);

    // After zoom, mapping that same scene coordinate to screen must give the exact same cursorScreenPt!
    const screenPositionAfter = sceneToScreen(sceneUnderCursorBefore, zoomedViewport);
    expect(screenPositionAfter.x).toBeCloseTo(cursorScreenPt.x, 5);
    expect(screenPositionAfter.y).toBeCloseTo(cursorScreenPt.y, 5);
  });

  it("calculatePanDelta shifts scroll by delta / zoom", () => {
    const initialViewport: ViewportState = { scrollX: 0, scrollY: 0, zoom: 2.0 };
    const deltaX = 100;
    const deltaY = 50;

    const pannedViewport = calculatePanDelta(deltaX, deltaY, initialViewport);
    expect(pannedViewport.scrollX).toBe(50); // 100 / 2
    expect(pannedViewport.scrollY).toBe(25); // 50 / 2
    expect(pannedViewport.zoom).toBe(2.0);
  });
});
