import React from "react";
import type { ToolType } from "../types/canvas";
import styles from "./Toolbar.module.css";
import {
  Lock,
  Hand,
  MousePointer,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Eraser,
} from "lucide-react";

interface ToolbarProps {
  activeTool: ToolType;
  isLocked: boolean;
  onSelectTool: (tool: ToolType) => void;
  onToggleLock: () => void;
}

interface ToolDefinition {
  type: ToolType;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}

const TOOLS: ToolDefinition[] = [
  { type: "hand", label: "Hand (panning tool)", icon: <Hand size={18} />, shortcut: "H" },
  { type: "selection", label: "Selection", icon: <MousePointer size={18} />, shortcut: "V" },
  { type: "rectangle", label: "Rectangle", icon: <Square size={18} />, shortcut: "R" },
  { type: "diamond", label: "Diamond", icon: <Diamond size={18} />, shortcut: "D" },
  { type: "ellipse", label: "Ellipse", icon: <Circle size={18} />, shortcut: "O" },
  { type: "arrow", label: "Arrow", icon: <ArrowRight size={18} />, shortcut: "A" },
  { type: "line", label: "Line", icon: <Minus size={18} />, shortcut: "L" },
  { type: "freedraw", label: "Draw", icon: <Pencil size={18} />, shortcut: "P" },
  { type: "text", label: "Text", icon: <Type size={18} />, shortcut: "T" },
  { type: "eraser", label: "Eraser", icon: <Eraser size={18} />, shortcut: "E" },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  isLocked,
  onSelectTool,
  onToggleLock,
}) => {
  return (
    <div className={styles.toolbarContainer} role="toolbar" aria-label="Drawing tools">
      <button
        type="button"
        className={`${styles.toolButton} ${isLocked ? styles.active : ""}`}
        onClick={onToggleLock}
        title="Keep selected tool active after drawing — Q"
        aria-label="Keep selected tool active after drawing"
      >
        <Lock size={16} />
      </button>

      <div className={styles.divider} />

      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.type;
        return (
          <button
            key={tool.type}
            type="button"
            className={`${styles.toolButton} ${isActive ? styles.active : ""}`}
            onClick={() => onSelectTool(tool.type)}
            title={`${tool.label} — ${tool.shortcut}`}
            aria-label={tool.label}
          >
            {tool.icon}
            <span className={styles.keyShortcut}>{tool.shortcut}</span>
          </button>
        );
      })}
    </div>
  );
};
