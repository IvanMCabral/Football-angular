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
  const dragSource = source as SquadEditorDragSource | null;
  const element = dragSource?.element?.nativeElement;

  // Angular CDK owns the internal DragRef behind CdkDrag.  Calling reset()
  // on a source received from a drag event is not stable across CDK builds:
  // in the public bundle it can run without the backing ref and throw while
  // handling an otherwise valid drop.  The element transform is the only
  // state this editor needs to clear, so prefer the stable DOM surface.
  if (element?.style) {
    element.style.transform = '';
    element.style.webkitTransform = '';
    return;
  }

  if (typeof dragSource?.reset === 'function') {
    // Keep the fallback for lightweight non-CDK sources used by tooling.
    dragSource.reset();
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
