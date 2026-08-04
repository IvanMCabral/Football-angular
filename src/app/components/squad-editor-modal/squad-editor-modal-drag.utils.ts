export interface SquadEditorDragRef {
  element?: {
    nativeElement?: HTMLElement;
  };
  rootElement?: HTMLElement;
}

/**
 * The subset of the public CdkDrag API used by the editor.
 *
 * CdkDrag intentionally keeps its internal DragRef private.  Reading that
 * implementation detail made marker drops fail when Angular CDK changed its
 * internals.  Keep this adapter limited to the stable public properties so
 * the editor remains compatible with supported CDK versions.
 */
interface SquadEditorDragSource {
  element?: {
    nativeElement?: HTMLElement;
  };
  data?: unknown;
  reset?: () => void;
}

export function getSquadEditorDragRef(source: unknown): SquadEditorDragRef | null {
  const dragSource = source as SquadEditorDragSource | null;
  const element = dragSource?.element;
  const rootElement = element?.nativeElement;
  if (!element && !rootElement) {
    return null;
  }
  return { element, rootElement };
}

export function getSquadEditorDragData<T>(source: unknown): T | undefined {
  return (source as SquadEditorDragSource | null)?.data as T | undefined;
}

export function resetSquadEditorDragSource(source: unknown): void {
  const reset = (source as SquadEditorDragSource | null)?.reset;
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
