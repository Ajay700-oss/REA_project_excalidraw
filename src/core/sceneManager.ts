import type { ExcalidrawElement } from "../types/element";

export type SceneListener = (elements: readonly ExcalidrawElement[]) => void;

export class SceneManager {
  private elements: readonly ExcalidrawElement[] = [];
  private undoStack: (readonly ExcalidrawElement[])[] = [];
  private redoStack: (readonly ExcalidrawElement[])[] = [];
  private listeners = new Set<SceneListener>();

  constructor(initialElements: readonly ExcalidrawElement[] = []) {
    this.elements = Object.freeze([...initialElements]);
  }

  public getElements(): readonly ExcalidrawElement[] {
    return this.elements;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public addElement(element: ExcalidrawElement): void {
    this.pushUndoSnapshot();
    this.elements = Object.freeze([...this.elements, element]);
    this.notify();
  }

  public setElements(newElements: readonly ExcalidrawElement[]): void {
    this.pushUndoSnapshot();
    this.elements = Object.freeze([...newElements]);
    this.notify();
  }

  public deleteElement(id: string): void {
    const exists = this.elements.some((el) => el.id === id && !el.isDeleted);
    if (!exists) return;

    this.pushUndoSnapshot();
    this.elements = Object.freeze(
      this.elements.map((el) => (el.id === id ? { ...el, isDeleted: true } : el))
    );
    this.notify();
  }

  public deleteElements(ids: ReadonlySet<string>): void {
    if (ids.size === 0) return;
    const hasAny = this.elements.some((el) => ids.has(el.id) && !el.isDeleted);
    if (!hasAny) return;

    this.pushUndoSnapshot();
    this.elements = Object.freeze(
      this.elements.map((el) => (ids.has(el.id) ? { ...el, isDeleted: true } : el))
    );
    this.notify();
  }

  public undo(): void {
    if (!this.canUndo()) return;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(this.elements);
    this.elements = previous;
    this.notify();
  }

  public redo(): void {
    if (!this.canRedo()) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(this.elements);
    this.elements = next;
    this.notify();
  }

  public clear(): void {
    if (this.elements.length === 0) return;
    this.pushUndoSnapshot();
    this.elements = Object.freeze([]);
    this.notify();
  }

  public subscribe(listener: SceneListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private pushUndoSnapshot(): void {
    this.undoStack.push(this.elements);
    this.redoStack = []; // Cleared on any new mutation

    // Bound stack size to 50 snapshots
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  private notify(): void {
    const current = this.elements;
    for (const listener of this.listeners) {
      listener(current);
    }
  }
}
