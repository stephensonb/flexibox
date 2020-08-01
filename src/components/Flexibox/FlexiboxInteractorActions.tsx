import { FlexiboxInteractionTarget } from './useFlexiboxInteractor';

export type FlexiboxInteractorActions =
  | { type: 'ADD_TARGET'; interactionTarget: FlexiboxInteractionTarget }
  | { type: 'DRAG'; x: number; y: number }
  | { type: 'END_MOUSE_INTERACTION' }
  | { type: 'MOVE'; x: number; y: number }
  | { type: 'PAN'; x: number; y: number }
  | { type: 'RESET_VIEW' }
  | { type: 'RESIZE'; x: number; y: number }
  | { type: 'RESIZE_SELECT_BOX'; x: number; y: number }
  | { type: 'SET_CONTAINER_SCALE'; scale: number }
  | { type: 'SET_ELEMENT_REF'; ref: HTMLDivElement }
  | { type: 'SET_GRID_XY'; gridX: number, gridY: number }
  | { type: 'SET_GRID_SNAP'; snapToGrid: boolean }
  | {
    type: 'BEGIN_MOUSE_INTERACTION';
    interactingElementBounds: DOMRect;
    activeInteractorTarget: FlexiboxInteractionTarget;
    interactionStartMouseX: number,
    interactionStartMouseY: number
  }
  | { type: 'ZOOM_IN'; }
  | { type: 'ZOOM_MIN'; }
  | { type: 'ZOOM_MAX'; }
  | { type: 'ZOOM_OUT'; }
