import {
  type Point,
  type ViewportState,
  DEFAULT_ZOOM,
  ZOOM_STEP,
} from "../types/viewport";
import {
  calculateZoomAroundPoint,
  calculatePanDelta,
  clampZoom,
} from "../math/coordinates";

export type ViewportListener = (viewport: ViewportState) => void;

export class ViewportManager {
  private viewport: ViewportState = {
    scrollX: 0,
    scrollY: 0,
    zoom: DEFAULT_ZOOM,
  };

  private listeners = new Set<ViewportListener>();

  constructor(initialState?: Partial<ViewportState>) {
    if (initialState) {
      this.viewport = {
        ...this.viewport,
        ...initialState,
        zoom: clampZoom(initialState.zoom ?? DEFAULT_ZOOM),
      };
    }
  }

  public getViewport(): ViewportState {
    return { ...this.viewport };
  }

  public setViewport(next: Partial<ViewportState>): void {
    this.viewport = {
      ...this.viewport,
      ...next,
      zoom: clampZoom(next.zoom ?? this.viewport.zoom),
    };
    this.notify();
  }

  public panBy(deltaScreenX: number, deltaScreenY: number): void {
    this.viewport = calculatePanDelta(
      deltaScreenX,
      deltaScreenY,
      this.viewport
    );
    this.notify();
  }

  public zoomAt(anchorScreenPoint: Point, nextZoom: number): void {
    this.viewport = calculateZoomAroundPoint(
      anchorScreenPoint,
      nextZoom,
      this.viewport
    );
    this.notify();
  }

  public zoomIn(anchorScreenPoint?: Point): void {
    const nextZoom = this.viewport.zoom + ZOOM_STEP;
    const anchor = anchorScreenPoint ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    this.zoomAt(anchor, nextZoom);
  }

  public zoomOut(anchorScreenPoint?: Point): void {
    const nextZoom = this.viewport.zoom - ZOOM_STEP;
    const anchor = anchorScreenPoint ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    this.zoomAt(anchor, nextZoom);
  }

  public resetZoom(anchorScreenPoint?: Point): void {
    const anchor = anchorScreenPoint ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    this.zoomAt(anchor, DEFAULT_ZOOM);
  }

  public subscribe(listener: ViewportListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getViewport();
    for (const listener of this.listeners) {
      listener(current);
    }
  }
}
