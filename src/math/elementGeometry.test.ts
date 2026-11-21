import { describe, it, expect } from "vitest";
import {
  normalizeBounds,
  getDiamondPoints,
  createElement,
  generateSeed,
} from "./elementGeometry";

describe("Element Geometry & Normalization", () => {
  it("normalizes dragging southeast (positive dx, positive dy)", () => {
    const start = { x: 100, y: 100 };
    const current = { x: 250, y: 180 };

    const bounds = normalizeBounds(start, current);
    expect(bounds).toEqual({
      x: 100,
      y: 100,
      width: 150,
      height: 80,
    });
  });

  it("normalizes dragging northwest (negative dx, negative dy)", () => {
    const start = { x: 300, y: 200 };
    const current = { x: 100, y: 50 };

    const bounds = normalizeBounds(start, current);
    expect(bounds).toEqual({
      x: 100,
      y: 50,
      width: 200,
      height: 150,
    });
  });

  it("normalizes dragging northeast (positive dx, negative dy)", () => {
    const start = { x: 100, y: 250 };
    const current = { x: 220, y: 100 };

    const bounds = normalizeBounds(start, current);
    expect(bounds).toEqual({
      x: 100,
      y: 100,
      width: 120,
      height: 150,
    });
  });

  it("normalizes dragging southwest (negative dx, positive dy)", () => {
    const start = { x: 200, y: 100 };
    const current = { x: 50, y: 180 };

    const bounds = normalizeBounds(start, current);
    expect(bounds).toEqual({
      x: 50,
      y: 100,
      width: 150,
      height: 80,
    });
  });

  it("calculates exact diamond vertices", () => {
    const [top, right, bottom, left] = getDiamondPoints(100, 200, 80, 60);

    expect(top).toEqual({ x: 140, y: 200 });
    expect(right).toEqual({ x: 180, y: 230 });
    expect(bottom).toEqual({ x: 140, y: 260 });
    expect(left).toEqual({ x: 100, y: 230 });
  });

  it("createElement generates valid element with deterministic seed and defaults", () => {
    const start = { x: 50, y: 50 };
    const current = { x: 150, y: 100 };
    const seed = 12345;

    const el = createElement("rectangle", start, current, { seed }, "test-id-1");

    expect(el.id).toBe("test-id-1");
    expect(el.type).toBe("rectangle");
    expect(el.x).toBe(50);
    expect(el.y).toBe(50);
    expect(el.width).toBe(100);
    expect(el.height).toBe(50);
    expect(el.seed).toBe(12345);
    expect(el.strokeColor).toBe("#1e1e1e");
    expect(el.backgroundColor).toBe("transparent");
    expect(el.isDeleted).toBe(false);
  });

  it("generateSeed returns a positive integer", () => {
    const seed = generateSeed();
    expect(seed).toBeGreaterThan(0);
    expect(Number.isInteger(seed)).toBe(true);
  });
});
