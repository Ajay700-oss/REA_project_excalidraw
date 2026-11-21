import React from "react";
import styles from "./ZoomControls.module.css";
import { Minus, Plus, Undo2, Redo2 } from "lucide-react";
import { MIN_ZOOM, MAX_ZOOM } from "../types/viewport";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const percentage = Math.round(zoom * 100);
  const isMinZoom = zoom <= MIN_ZOOM;
  const isMaxZoom = zoom >= MAX_ZOOM;

  return (
    <div className={styles.container}>
      <div className={styles.zoomIsland} role="group" aria-label="Zoom controls">
        <button
          type="button"
          className={styles.button}
          onClick={onZoomOut}
          disabled={isMinZoom}
          title="Zoom out — Ctrl+Minus"
          aria-label="Zoom out"
        >
          <Minus size={16} />
        </button>

        <button
          type="button"
          className={styles.zoomTextButton}
          onClick={onResetZoom}
          title="Reset zoom to 100% — Ctrl+0"
          aria-label={`Current zoom ${percentage}%. Click to reset`}
        >
          {percentage}%
        </button>

        <button
          type="button"
          className={styles.button}
          onClick={onZoomIn}
          disabled={isMaxZoom}
          title="Zoom in — Ctrl+Plus"
          aria-label="Zoom in"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className={styles.historyIsland} role="group" aria-label="History actions">
        <button
          type="button"
          className={styles.button}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo — Ctrl+Z"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>

        <button
          type="button"
          className={styles.button}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo — Ctrl+Y"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>
    </div>
  );
};
