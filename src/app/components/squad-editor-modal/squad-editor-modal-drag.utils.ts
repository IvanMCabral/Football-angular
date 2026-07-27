export interface SquadEditorDragRef {
  _pickupPositionInElement?: {
    x?: number;
    y?: number;
  };
  element?: {
    nativeElement?: HTMLElement;
  };
  rootElement?: HTMLElement;
}

interface SquadEditorPrivateDragSource {
  _dragRef?: SquadEditorDragRef;
  data?: unknown;
  reset?: () => void;
}

export function getSquadEditorDragRef(source: unknown): SquadEditorDragRef | null {
  return (source as SquadEditorPrivateDragSource | null)?._dragRef ?? null;
}

export function getSquadEditorDragData<T>(source: unknown): T | undefined {
  return (source as SquadEditorPrivateDragSource | null)?.data as T | undefined;
}

export function resetSquadEditorDragSource(source: unknown): void {
  const reset = (source as SquadEditorPrivateDragSource | null)?.reset;
  if (typeof reset === 'function') {
    reset();
  }
}

export function clearSquadEditorDragTransform(dragRef: SquadEditorDragRef | null): void {
  const rootEl = dragRef?.rootElement;
  if (!rootEl?.style) {
    return;
  }

  rootEl.style.transform = '';
  rootEl.style.webkitTransform = '';
}
