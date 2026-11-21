import type { ViewportManager } from "./viewportManager";
import type { SceneManager } from "./sceneManager";
import type { InteractionState, ToolType } from "../types/canvas";
import type { Point } from "../types/viewport";
import type { ExcalidrawElement, ElementType } from "../types/element";
import { screenToScene } from "../math/coordinates";
import {
  createElement,
  createLineElement,
  createFreedrawElement,
  generateSeed,
  hitTestElement,
} from "../math/elementGeometry";

export interface InputHandlerOptions {
  viewportManager: ViewportManager;
  sceneManager: SceneManager;
  getActiveTool: () => ToolType;
  getIsLocked: () => boolean;
  onToolChange?: (tool: ToolType) => void;
  onInteractionChange?: (state: InteractionState) => void;
  onRequestRedraw: () => void;
  onStartTextEditing?: (position: { scenePoint: Point; screenPoint: Point }) => void;
}

export const isShapeTool = (tool: ToolType): boolean => {
  return (
    tool === "rectangle" ||
    tool === "ellipse" ||
    tool === "diamond" ||
    tool === "line" ||
    tool === "arrow" ||
    tool === "freedraw"
  );
};

export class InputHandler {
  private viewportManager: ViewportManager;
  private sceneManager: SceneManager;
  private getActiveTool: () => ToolType;
  private getIsLocked: () => boolean;
  private onToolChange?: (tool: ToolType) => void;
  private onInteractionChange?: (state: InteractionState) => void;
  private onRequestRedraw: () => void;
  private onStartTextEditing?: (position: { scenePoint: Point; screenPoint: Point }) => void;

  private state: InteractionState = {
    mode: "idle",
    isSpacePressed: false,
    panStart: null,
    currentPointer: null,
  };

  private lastScreenPointer: Point = { x: 0, y: 0 };
  private drawStartScene: Point | null = null;
  private previewElement: ExcalidrawElement | null = null;
  private freedrawPoints: Point[] = [];
  private activePointerId: number | null = null;

  constructor(options: InputHandlerOptions) {
    this.viewportManager = options.viewportManager;
    this.sceneManager = options.sceneManager;
    this.getActiveTool = options.getActiveTool;
    this.getIsLocked = options.getIsLocked;
    this.onToolChange = options.onToolChange;
    this.onInteractionChange = options.onInteractionChange;
    this.onRequestRedraw = options.onRequestRedraw;
    this.onStartTextEditing = options.onStartTextEditing;
  }

  public getState(): InteractionState {
    return { ...this.state };
  }

  public getPreviewElement(): ExcalidrawElement | null {
    return this.previewElement;
  }

  public handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    const isMiddleClick = e.button === 1;
    const isLeftClick = e.button === 0;
    const currentTool = this.getActiveTool();
    const isHandPan = isLeftClick && currentTool === "hand";
    const isSpacePan = isLeftClick && this.state.isSpacePressed;

    this.lastScreenPointer = { x: e.clientX, y: e.clientY };

    // 1. Pan condition (Middle click, Space+drag, or Hand tool)
    if (isMiddleClick || isSpacePan || isHandPan) {
      e.preventDefault();
      this.activePointerId = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);

      this.updateState({
        mode: "panning",
        panStart: { x: e.clientX, y: e.clientY },
        currentPointer: { x: e.clientX, y: e.clientY },
      });
      this.onRequestRedraw();
      return;
    }

    if (!isLeftClick) return;

    const viewport = this.viewportManager.getViewport();
    const startScene = screenToScene({ x: e.clientX, y: e.clientY }, viewport);

    // 2. Text tool condition: opens text input editor
    if (currentTool === "text") {
      e.preventDefault();
      this.onStartTextEditing?.({
        scenePoint: startScene,
        screenPoint: { x: e.clientX, y: e.clientY },
      });
      return;
    }

    // 3. Eraser tool condition: erases element under pointer
    if (currentTool === "eraser") {
      e.preventDefault();
      this.activePointerId = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);

      this.eraseAtPoint(startScene);
      this.updateState({
        mode: "erasing",
        currentPointer: { x: e.clientX, y: e.clientY },
      });
      return;
    }

    // 4. Shape & stroke drawing condition
    if (isShapeTool(currentTool)) {
      e.preventDefault();
      this.activePointerId = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);

      this.drawStartScene = startScene;
      const seed = generateSeed();

      if (currentTool === "freedraw") {
        this.freedrawPoints = [startScene];
        this.previewElement = createFreedrawElement(this.freedrawPoints, { seed });
      } else if (currentTool === "line" || currentTool === "arrow") {
        this.previewElement = createLineElement(currentTool, startScene, startScene, { seed });
      } else {
        this.previewElement = createElement(
          currentTool as ElementType,
          startScene,
          startScene,
          { seed }
        );
      }

      this.updateState({
        mode: "drawing",
        currentPointer: { x: e.clientX, y: e.clientY },
      });
      this.onRequestRedraw();
    }
  }

  public handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>): void {
    this.state.currentPointer = { x: e.clientX, y: e.clientY };

    if (this.state.mode === "panning") {
      const deltaX = e.clientX - this.lastScreenPointer.x;
      const deltaY = e.clientY - this.lastScreenPointer.y;

      this.lastScreenPointer = { x: e.clientX, y: e.clientY };
      this.viewportManager.panBy(deltaX, deltaY);
      this.onRequestRedraw();
      return;
    }

    if (this.state.mode === "erasing") {
      const viewport = this.viewportManager.getViewport();
      const currentScene = screenToScene({ x: e.clientX, y: e.clientY }, viewport);
      this.eraseAtPoint(currentScene);
      return;
    }

    if (this.state.mode === "drawing" && this.drawStartScene && this.previewElement) {
      const viewport = this.viewportManager.getViewport();
      const currentScene = screenToScene({ x: e.clientX, y: e.clientY }, viewport);
      const currentTool = this.previewElement.type;

      if (currentTool === "freedraw") {
        this.freedrawPoints.push(currentScene);
        this.previewElement = createFreedrawElement(
          this.freedrawPoints,
          {
            seed: this.previewElement.seed,
            strokeColor: this.previewElement.strokeColor,
            strokeWidth: this.previewElement.strokeWidth,
            roughness: this.previewElement.roughness,
          },
          this.previewElement.id
        );
      } else if (currentTool === "line" || currentTool === "arrow") {
        this.previewElement = createLineElement(
          currentTool,
          this.drawStartScene,
          currentScene,
          {
            seed: this.previewElement.seed,
            strokeColor: this.previewElement.strokeColor,
            strokeWidth: this.previewElement.strokeWidth,
            roughness: this.previewElement.roughness,
          },
          this.previewElement.id
        );
      } else {
        this.previewElement = createElement(
          currentTool,
          this.drawStartScene,
          currentScene,
          {
            seed: this.previewElement.seed,
            strokeColor: this.previewElement.strokeColor,
            backgroundColor: this.previewElement.backgroundColor,
            strokeWidth: this.previewElement.strokeWidth,
            roughness: this.previewElement.roughness,
          },
          this.previewElement.id
        );
      }

      this.onRequestRedraw();
    }
  }

  public handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (this.activePointerId !== null && this.activePointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may have already been released
      }
      this.activePointerId = null;
    }

    if (this.state.mode === "panning") {
      this.updateState({
        mode: "idle",
        panStart: null,
      });
      this.onRequestRedraw();
      return;
    }

    if (this.state.mode === "erasing") {
      this.updateState({ mode: "idle" });
      return;
    }

    if (this.state.mode === "drawing") {
      if (this.previewElement) {
        let isActionable = false;

        if (this.previewElement.type === "freedraw") {
          isActionable = (this.previewElement.points?.length ?? 0) >= 2;
        } else if (this.previewElement.type === "line" || this.previewElement.type === "arrow") {
          const pts = this.previewElement.points;
          if (pts && pts.length >= 2) {
            isActionable = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) > 2;
          }
        } else {
          isActionable = this.previewElement.width > 2 || this.previewElement.height > 2;
        }

        if (isActionable) {
          this.sceneManager.addElement(this.previewElement);
        }
      }

      this.previewElement = null;
      this.drawStartScene = null;
      this.freedrawPoints = [];
      this.updateState({ mode: "idle" });

      // If tool is not locked, revert to selection tool like Excalidraw
      if (!this.getIsLocked()) {
        this.onToolChange?.("selection");
      }

      this.onRequestRedraw();
    }
  }

  public handlePointerCancel(e: React.PointerEvent<HTMLCanvasElement>): void {
    this.handlePointerUp(e);
  }

  /**
   * Erases the top-most element at the given scene point.
   */
  private eraseAtPoint(scenePoint: Point): void {
    const elements = this.sceneManager.getElements();
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (hitTestElement(scenePoint, el)) {
        this.sceneManager.deleteElement(el.id);
        this.onRequestRedraw();
        break;
      }
    }
  }

  /**
   * Handles native wheel events for cursor-centered zooming and trackpad panning.
   */
  public handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const anchor: Point = { x: e.clientX, y: e.clientY };
    const currentViewport = this.viewportManager.getViewport();

    // Check if zooming (Pinch gesture, Ctrl+Wheel, or Meta+Wheel)
    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.005;
      const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
      const nextZoom = currentViewport.zoom * zoomFactor;

      this.viewportManager.zoomAt(anchor, nextZoom);
      this.onRequestRedraw();
    } else {
      // Standard mouse wheel / trackpad scroll pan
      const deltaX = e.shiftKey ? -e.deltaY : -e.deltaX;
      const deltaY = e.shiftKey ? 0 : -e.deltaY;

      this.viewportManager.panBy(deltaX, deltaY);
      this.onRequestRedraw();
    }
  }

  public handleKeyDown(e: KeyboardEvent): void {
    const activeTag =
      typeof document !== "undefined"
        ? document.activeElement?.tagName.toLowerCase()
        : undefined;
    const isInputFocused = activeTag === "input" || activeTag === "textarea";

    // Undo / Redo keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
    if (e.ctrlKey || e.metaKey) {
      if ((e.key === "z" || e.key === "Z") && !isInputFocused) {
        e.preventDefault();
        if (e.shiftKey) {
          this.sceneManager.redo();
        } else {
          this.sceneManager.undo();
        }
        this.onRequestRedraw();
        return;
      }

      if ((e.key === "y" || e.key === "Y") && !isInputFocused) {
        e.preventDefault();
        this.sceneManager.redo();
        this.onRequestRedraw();
        return;
      }

      // Keyboard shortcuts for zoom
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        this.viewportManager.zoomIn();
        this.onRequestRedraw();
        return;
      } else if (e.key === "-") {
        e.preventDefault();
        this.viewportManager.zoomOut();
        this.onRequestRedraw();
        return;
      } else if (e.key === "0") {
        e.preventDefault();
        this.viewportManager.resetZoom();
        this.onRequestRedraw();
        return;
      }
    }

    if (e.code === "Space" && !this.state.isSpacePressed && !isInputFocused) {
      e.preventDefault();
      this.updateState({ isSpacePressed: true });
      this.onRequestRedraw();
    }
  }

  public handleKeyUp(e: KeyboardEvent): void {
    if (e.code === "Space" && this.state.isSpacePressed) {
      this.updateState({ isSpacePressed: false });
      this.onRequestRedraw();
    }
  }

  public getCursor(): string {
    if (this.state.mode === "panning") {
      return "grabbing";
    }
    if (this.state.isSpacePressed || this.getActiveTool() === "hand") {
      return "grab";
    }
    if (this.getActiveTool() === "eraser") {
      return "cell";
    }
    if (this.getActiveTool() === "text") {
      return "text";
    }
    if (isShapeTool(this.getActiveTool())) {
      return "crosshair";
    }
    return "default";
  }

  private updateState(partial: Partial<InteractionState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.onInteractionChange?.(this.getState());
  }
}
