import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "./Whiteboard.module.css";
import { ViewportManager } from "../core/viewportManager";
import { SceneManager } from "../core/sceneManager";
import { CanvasRenderer } from "../core/canvasRenderer";
import { InputHandler } from "../core/inputHandler";
import { Toolbar } from "./Toolbar";
import { ZoomControls } from "./ZoomControls";
import { createTextElement } from "../math/elementGeometry";
import type { ToolType, InteractionState } from "../types/canvas";
import type { ViewportState, Point } from "../types/viewport";

interface TextEditorState {
  scenePoint: Point;
  screenPoint: Point;
  text: string;
}

export const Whiteboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Core managers kept in refs to avoid re-renders during high-frequency pointer moves
  const viewportManagerRef = useRef<ViewportManager>(new ViewportManager());
  const sceneManagerRef = useRef<SceneManager>(new SceneManager());
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // React state only for UI presentation
  const [zoom, setZoom] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<ToolType>("selection");
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [cursorStyle, setCursorStyle] = useState<string>("default");
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [editingText, setEditingText] = useState<TextEditorState | null>(null);

  // Keep latest tool & lock references accessible to event callbacks without re-binding
  const activeToolRef = useRef<ToolType>(activeTool);
  const isLockedRef = useRef<boolean>(isLocked);

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (inputHandlerRef.current) {
      setCursorStyle(inputHandlerRef.current.getCursor());
    }
  }, [activeTool]);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    if (editingText && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingText]);

  /**
   * Schedules a canvas redraw using requestAnimationFrame.
   */
  const requestRedraw = useCallback(() => {
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      const staticCanvas = staticCanvasRef.current;
      const interactiveCanvas = interactiveCanvasRef.current;
      if (!staticCanvas || !interactiveCanvas) return;

      const viewport = viewportManagerRef.current.getViewport();
      const elements = sceneManagerRef.current.getElements();
      const dpr = window.devicePixelRatio || 1;
      const interaction = inputHandlerRef.current?.getState() ?? {
        mode: "idle",
        isSpacePressed: false,
        panStart: null,
        currentPointer: null,
      };
      const previewElement = inputHandlerRef.current?.getPreviewElement() ?? null;

      CanvasRenderer.renderStatic(staticCanvas, viewport, dpr, elements);
      CanvasRenderer.renderInteractive(
        interactiveCanvas,
        viewport,
        dpr,
        interaction,
        previewElement
      );
    });
  }, []);

  /**
   * Resizes canvases to match container size and device pixel ratio.
   */
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const staticCanvas = staticCanvasRef.current;
    const interactiveCanvas = interactiveCanvasRef.current;
    if (!container || !staticCanvas || !interactiveCanvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    CanvasRenderer.resizeCanvas(staticCanvas, width, height, dpr);
    CanvasRenderer.resizeCanvas(interactiveCanvas, width, height, dpr);

    requestRedraw();
  }, [requestRedraw]);

  // Initialize InputHandler and subscriptions on mount
  useEffect(() => {
    const viewportManager = viewportManagerRef.current;
    const sceneManager = sceneManagerRef.current;

    // Subscribe React UI to viewport zoom changes
    const unsubscribeViewport = viewportManager.subscribe((vp: ViewportState) => {
      setZoom(vp.zoom);
    });

    // Subscribe to scene changes (when shapes/text are committed, deleted, undone, redone)
    const unsubscribeScene = sceneManager.subscribe(() => {
      setCanUndo(sceneManager.canUndo());
      setCanRedo(sceneManager.canRedo());
      requestRedraw();
    });

    const inputHandler = new InputHandler({
      viewportManager,
      sceneManager,
      getActiveTool: () => activeToolRef.current,
      getIsLocked: () => isLockedRef.current,
      onToolChange: (nextTool: ToolType) => {
        setActiveTool(nextTool);
      },
      onInteractionChange: (_interaction: InteractionState) => {
        setCursorStyle(inputHandler.getCursor());
        requestRedraw();
      },
      onRequestRedraw: requestRedraw,
      onStartTextEditing: ({ scenePoint, screenPoint }) => {
        setEditingText({ scenePoint, screenPoint, text: "" });
      },
    });

    inputHandlerRef.current = inputHandler;
    setCursorStyle(inputHandler.getCursor());

    // Attach native non-passive wheel listener to interactive canvas
    const interactiveCanvas = interactiveCanvasRef.current;
    const wheelListener = (e: WheelEvent) => {
      inputHandler.handleWheel(e);
    };

    if (interactiveCanvas) {
      interactiveCanvas.addEventListener("wheel", wheelListener, { passive: false });
    }

    // Window keydown / keyup listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts while user is typing in text editor
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "textarea" || activeTag === "input") return;

      inputHandler.handleKeyDown(e);
      setCursorStyle(inputHandler.getCursor());

      // Toolbar keyboard shortcuts
      const key = e.key.toUpperCase();
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (key === "V" || key === "1") setActiveTool("selection");
        else if (key === "H") setActiveTool("hand");
        else if (key === "R" || key === "2") setActiveTool("rectangle");
        else if (key === "D" || key === "3") setActiveTool("diamond");
        else if (key === "O" || key === "4") setActiveTool("ellipse");
        else if (key === "A" || key === "5") setActiveTool("arrow");
        else if (key === "L" || key === "6") setActiveTool("line");
        else if (key === "P" || key === "7") setActiveTool("freedraw");
        else if (key === "T" || key === "8") setActiveTool("text");
        else if (key === "E" || key === "0") setActiveTool("eraser");
        else if (key === "Q") setIsLocked((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      inputHandler.handleKeyUp(e);
      setCursorStyle(inputHandler.getCursor());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);

    // Initial resize and render
    handleResize();

    return () => {
      unsubscribeViewport();
      unsubscribeScene();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);

      if (interactiveCanvas) {
        interactiveCanvas.removeEventListener("wheel", wheelListener);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [handleResize, requestRedraw]);

  // Pointer event proxies delegating directly to InputHandler
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If text editor is active, commit text first
    if (editingText) {
      commitText();
    }
    inputHandlerRef.current?.handlePointerDown(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    inputHandlerRef.current?.handlePointerMove(e);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    inputHandlerRef.current?.handlePointerUp(e);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    inputHandlerRef.current?.handlePointerCancel(e);
  };

  // Text editor commit / cancel
  const commitText = () => {
    if (!editingText) return;
    const trimmed = editingText.text.trim();
    if (trimmed) {
      const textElement = createTextElement(trimmed, editingText.scenePoint);
      sceneManagerRef.current.addElement(textElement);
    }
    setEditingText(null);
    if (!isLockedRef.current) {
      setActiveTool("selection");
    }
    requestRedraw();
  };

  const cancelTextEditing = () => {
    setEditingText(null);
    if (!isLockedRef.current) {
      setActiveTool("selection");
    }
  };

  // Zoom control triggers
  const handleZoomIn = () => {
    viewportManagerRef.current.zoomIn();
    requestRedraw();
  };

  const handleZoomOut = () => {
    viewportManagerRef.current.zoomOut();
    requestRedraw();
  };

  const handleResetZoom = () => {
    viewportManagerRef.current.resetZoom();
    requestRedraw();
  };

  const handleUndo = () => {
    sceneManagerRef.current.undo();
    requestRedraw();
  };

  const handleRedo = () => {
    sceneManagerRef.current.redo();
    requestRedraw();
  };

  return (
    <div ref={containerRef} className={styles.whiteboardWrapper}>
      {/* Top Brand Logo */}
      <div className={styles.brandContainer}>
        <button type="button" className={styles.brandButton} title="SketchFlow">
          sketchboard
        </button>
      </div>

      {/* Floating Toolbar Shell */}
      <Toolbar
        activeTool={activeTool}
        isLocked={isLocked}
        onSelectTool={setActiveTool}
        onToggleLock={() => setIsLocked((prev) => !prev)}
      />

      {/* Layered Canvases */}
      <div className={styles.canvasWrapper}>
        <canvas ref={staticCanvasRef} className={styles.staticCanvas} />
        <canvas
          ref={interactiveCanvasRef}
          className={styles.interactiveCanvas}
          style={{ cursor: cursorStyle }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        />

        {/* Floating Textarea for Text Tool */}
        {editingText && (
          <textarea
            ref={textareaRef}
            className={styles.textEditor}
            style={{
              left: `${editingText.screenPoint.x}px`,
              top: `${editingText.screenPoint.y}px`,
            }}
            value={editingText.text}
            placeholder="Type text..."
            onChange={(e) =>
              setEditingText((prev) => (prev ? { ...prev, text: e.target.value } : null))
            }
            onBlur={commitText}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitText();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelTextEditing();
              }
            }}
          />
        )}
      </div>

      {/* Floating Zoom & History Controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Panning Interaction Hint */}
      <div className={styles.hintBanner}>
        To move canvas, hold <span className={styles.kbd}>Scroll wheel</span> or{" "}
        <span className={styles.kbd}>Space</span> while dragging, or use the{" "}
        <span className={styles.kbd}>H</span> tool
      </div>
    </div>
  );
};
