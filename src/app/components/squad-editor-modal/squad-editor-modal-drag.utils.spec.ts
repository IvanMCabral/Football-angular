import {
  clearSquadEditorDragTransform,
  getSquadEditorDragData,
  getSquadEditorDragRef,
  resetSquadEditorDragSource,
} from './squad-editor-modal-drag.utils';

describe('squad editor drag utilities', () => {
  it('adapts the public CdkDrag element without private drag internals', () => {
    const element = document.createElement('div');
    const source = { element: { nativeElement: element } };

    const dragRef = getSquadEditorDragRef(source);

    expect(dragRef?.element?.nativeElement).toBe(element);
    expect(dragRef?.rootElement).toBe(element);
  });

  it('returns no drag reference when a source has no public element', () => {
    expect(getSquadEditorDragRef({ data: { playerId: 'p1' } })).toBeNull();
    expect(getSquadEditorDragRef(null)).toBeNull();
  });

  it('reads data and resets through the public drag source API', () => {
    const reset = jasmine.createSpy('reset');
    const source = { data: { playerId: 'p1' }, reset };

    expect(getSquadEditorDragData<{ playerId: string }>(source)).toEqual({ playerId: 'p1' });
    resetSquadEditorDragSource(source);

    expect(reset).toHaveBeenCalled();
  });

  it('preserves the drag source receiver when reset uses this', () => {
    const source = {
      reset(this: { resetCount: number }) {
        this.resetCount += 1;
      },
      resetCount: 0,
    };

    resetSquadEditorDragSource(source);

    expect(source.resetCount).toBe(1);
  });

  it('clears the public element without invoking unstable CDK reset', () => {
    const element = document.createElement('div');
    element.style.transform = 'translate3d(4px, 5px, 0)';
    const reset = jasmine.createSpy('reset');

    resetSquadEditorDragSource({ element: { nativeElement: element }, reset });

    expect(element.style.transform).toBe('');
    expect(reset).not.toHaveBeenCalled();
  });

  it('clears the public element transform after a drop', () => {
    const element = document.createElement('div');
    element.style.transform = 'translate3d(4px, 5px, 0)';
    element.style.webkitTransform = 'translate3d(4px, 5px, 0)';

    clearSquadEditorDragTransform({ rootElement: element });

    expect(element.style.transform).toBe('');
    expect(element.style.webkitTransform).toBe('');
  });
});
