import { describe, it, expect, vi } from "vitest";
import { InputHandler } from "./inputHandler";
import { ViewportManager } from "./viewportManager";
import { SceneManager } from "./sceneManager";
import type { ToolType } from "../types/canvas";

const createMockPointerEvent = (
  type: string,
  clientX: number,
  clientY: number,
  button = 0,
  pointerId = 1
): React.PointerEvent<HTMLCanvasElement> => {
  return {
    type,
    clientX,
    clientY,
    button,
    pointerId,
    preventDefault: vi.fn(),
    currentTarget: {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    },
  } as unknown as React.PointerEvent<HTMLCanvasElement>;
};

describe("Shape Drawing Engine Integration", () => {
  it("creates and commits a rectangle when dragging with the rectangle tool", () => {
    let activeTool: ToolType = "rectangle";
    let isLocked = false;
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();
    const onToolChange = vi.fn((tool: ToolType) => {
      activeTool = tool;
    });
    const onRequestRedraw = vi.fn();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => isLocked,
      onToolChange,
      onRequestRedraw,
    });

    // 1. Pointer down at (50, 50)
    handler.handlePointerDown(createMockPointerEvent("pointerdown", 50, 50, 0));
    expect(handler.getState().mode).toBe("drawing");
    expect(handler.getPreviewElement()).not.toBeNull();
    expect(handler.getPreviewElement()?.type).toBe("rectangle");
    expect(handler.getPreviewElement()?.x).toBe(50);
    expect(handler.getPreviewElement()?.y).toBe(50);

    // 2. Pointer move to (200, 150)
    handler.handlePointerMove(createMockPointerEvent("pointermove", 200, 150));
    expect(handler.getPreviewElement()?.width).toBe(150);
    expect(handler.getPreviewElement()?.height).toBe(100);

    // 3. Pointer up: commits to scene
    handler.handlePointerUp(createMockPointerEvent("pointerup", 200, 150));
    expect(handler.getState().mode).toBe("idle");
    expect(handler.getPreviewElement()).toBeNull();

    const committed = sceneManager.getElements();
    expect(committed).toHaveLength(1);
    expect(committed[0].type).toBe("rectangle");
    expect(committed[0].x).toBe(50);
    expect(committed[0].y).toBe(50);
    expect(committed[0].width).toBe(150);
    expect(committed[0].height).toBe(100);

    // Verifies auto-switch back to selection tool when not locked
    expect(onToolChange).toHaveBeenCalledWith("selection");
    expect(activeTool).toBe("selection");
  });

  it("normalizes negative drag directions (dragging up and left)", () => {
    let activeTool: ToolType = "ellipse";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => true, // locked tool stays ellipse
      onRequestRedraw: vi.fn(),
    });

    // Pointer down at (300, 300) and drag to (100, 150)
    handler.handlePointerDown(createMockPointerEvent("pointerdown", 300, 300));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 100, 150));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 100, 150));

    const committed = sceneManager.getElements();
    expect(committed).toHaveLength(1);
    expect(committed[0].type).toBe("ellipse");
    expect(committed[0].x).toBe(100);
    expect(committed[0].y).toBe(150);
    expect(committed[0].width).toBe(200);
    expect(committed[0].height).toBe(150);
  });

  it("does not create an element when dragging with space pressed (panning)", () => {
    const activeTool: ToolType = "rectangle";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => false,
      onRequestRedraw: vi.fn(),
    });

    // Press space
    handler.handleKeyDown({ code: "Space", preventDefault: vi.fn() } as unknown as KeyboardEvent);
    expect(handler.getState().isSpacePressed).toBe(true);

    // Left click drag
    handler.handlePointerDown(createMockPointerEvent("pointerdown", 100, 100, 0));
    expect(handler.getState().mode).toBe("panning");

    handler.handlePointerMove(createMockPointerEvent("pointermove", 150, 150));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 150, 150));

    expect(sceneManager.getElements()).toHaveLength(0);
  });

  it("does not create an element on accidental zero-pixel tap", () => {
    const activeTool: ToolType = "diamond";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => false,
      onRequestRedraw: vi.fn(),
    });

    // Tap at (100, 100) without moving
    handler.handlePointerDown(createMockPointerEvent("pointerdown", 100, 100, 0));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 100, 100, 0));

    // Zero-sized element should not be committed
    expect(sceneManager.getElements()).toHaveLength(0);
  });

  it("creates and commits a diamond shape when dragging with the diamond tool", () => {
    const activeTool: ToolType = "diamond";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => false,
      onRequestRedraw: vi.fn(),
    });

    handler.handlePointerDown(createMockPointerEvent("pointerdown", 200, 200, 0));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 350, 300));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 350, 300));

    const elements = sceneManager.getElements();
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("diamond");
    expect(elements[0].x).toBe(200);
    expect(elements[0].y).toBe(200);
    expect(elements[0].width).toBe(150);
    expect(elements[0].height).toBe(100);
  });

  it("creates and commits a line element", () => {
    const activeTool: ToolType = "line";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => true,
      onRequestRedraw: vi.fn(),
    });

    handler.handlePointerDown(createMockPointerEvent("pointerdown", 10, 20, 0));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 100, 80));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 100, 80));

    const elements = sceneManager.getElements();
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("line");
    expect(elements[0].points).toBeDefined();
    expect(elements[0].points?.[0]).toEqual({ x: 10, y: 20 });
    expect(elements[0].points?.[1]).toEqual({ x: 100, y: 80 });
  });

  it("creates and commits an arrow element", () => {
    const activeTool: ToolType = "arrow";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => true,
      onRequestRedraw: vi.fn(),
    });

    handler.handlePointerDown(createMockPointerEvent("pointerdown", 50, 50, 0));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 200, 200));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 200, 200));

    const elements = sceneManager.getElements();
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("arrow");
    expect(elements[0].points?.[0]).toEqual({ x: 50, y: 50 });
    expect(elements[0].points?.[1]).toEqual({ x: 200, y: 200 });
  });

  it("creates and commits a freedraw pencil stroke", () => {
    const activeTool: ToolType = "freedraw";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => true,
      onRequestRedraw: vi.fn(),
    });

    handler.handlePointerDown(createMockPointerEvent("pointerdown", 50, 50, 0));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 55, 52));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 60, 56));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 70, 65));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 70, 65));

    const elements = sceneManager.getElements();
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("freedraw");
    expect(elements[0].points?.length).toBe(4);
  });

  it("erases elements using the eraser tool", () => {
    let activeTool: ToolType = "rectangle";
    const viewportManager = new ViewportManager();
    const sceneManager = new SceneManager();

    const handler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeTool,
      getIsLocked: () => true,
      onRequestRedraw: vi.fn(),
    });

    // 1. Draw rectangle at (100, 100) to (200, 200)
    handler.handlePointerDown(createMockPointerEvent("pointerdown", 100, 100, 0));
    handler.handlePointerMove(createMockPointerEvent("pointermove", 200, 200));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 200, 200));
    expect(sceneManager.getElements().filter((e) => !e.isDeleted)).toHaveLength(1);

    // 2. Switch to eraser and click inside rectangle at (150, 150)
    activeTool = "eraser";
    handler.handlePointerDown(createMockPointerEvent("pointerdown", 150, 150, 0));
    handler.handlePointerUp(createMockPointerEvent("pointerup", 150, 150));

    expect(sceneManager.getElements().filter((e) => !e.isDeleted)).toHaveLength(0);
  });
});
