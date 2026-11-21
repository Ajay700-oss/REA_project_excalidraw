import { describe, it, expect, vi } from "vitest";
import { SceneManager } from "./sceneManager";
import type { ExcalidrawElement } from "../types/element";

const createMockElement = (id: string, type: "rectangle" | "ellipse" | "diamond" = "rectangle"): ExcalidrawElement => ({
  id,
  type,
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  strokeWidth: 2,
  roughness: 1,
  seed: 42,
  isDeleted: false,
  version: 1,
});

describe("SceneManager", () => {
  it("initializes empty by default", () => {
    const scene = new SceneManager();
    expect(scene.getElements()).toEqual([]);
  });

  it("adds an element immutably", () => {
    const scene = new SceneManager();
    const initialElements = scene.getElements();

    const el = createMockElement("el-1");
    scene.addElement(el);

    const updatedElements = scene.getElements();
    expect(updatedElements).toHaveLength(1);
    expect(updatedElements[0]).toBe(el);

    // Verifies immutability: new array reference, initial array unchanged
    expect(updatedElements).not.toBe(initialElements);
    expect(initialElements).toHaveLength(0);
  });

  it("notifies subscribers when element is added", () => {
    const scene = new SceneManager();
    const listener = vi.fn();

    const unsubscribe = scene.subscribe(listener);
    const el = createMockElement("el-1");
    scene.addElement(el);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([el]);

    unsubscribe();
    scene.addElement(createMockElement("el-2"));
    expect(listener).toHaveBeenCalledTimes(1); // not called again after unsubscribe
  });

  it("marks element as deleted", () => {
    const el1 = createMockElement("el-1");
    const el2 = createMockElement("el-2");
    const scene = new SceneManager([el1, el2]);

    scene.deleteElement("el-1");
    const elements = scene.getElements();

    expect(elements).toHaveLength(2);
    expect(elements.find((e) => e.id === "el-1")?.isDeleted).toBe(true);
    expect(elements.find((e) => e.id === "el-2")?.isDeleted).toBe(false);
  });

  it("clears all elements", () => {
    const scene = new SceneManager([createMockElement("el-1")]);
    expect(scene.getElements()).toHaveLength(1);

    scene.clear();
    expect(scene.getElements()).toHaveLength(0);
  });

  it("supports undo and redo snapshots correctly", () => {
    const scene = new SceneManager();
    expect(scene.canUndo()).toBe(false);
    expect(scene.canRedo()).toBe(false);

    const el1 = createMockElement("el-1");
    scene.addElement(el1);
    expect(scene.canUndo()).toBe(true);
    expect(scene.canRedo()).toBe(false);
    expect(scene.getElements()).toHaveLength(1);

    const el2 = createMockElement("el-2");
    scene.addElement(el2);
    expect(scene.getElements()).toHaveLength(2);

    // Undo adding el2
    scene.undo();
    expect(scene.getElements()).toHaveLength(1);
    expect(scene.getElements()[0].id).toBe("el-1");
    expect(scene.canRedo()).toBe(true);

    // Redo adding el2
    scene.redo();
    expect(scene.getElements()).toHaveLength(2);
    expect(scene.canRedo()).toBe(false);

    // Undo both
    scene.undo();
    scene.undo();
    expect(scene.getElements()).toHaveLength(0);
    expect(scene.canUndo()).toBe(false);
  });
});
