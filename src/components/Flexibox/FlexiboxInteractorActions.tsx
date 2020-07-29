import { FlexiboxInteractorState } from '.';
import { FlexiboxInteractionTarget } from './useFlexiboxInteractor';

export type FlexiboxInteractorActions =
  | { type: 'ADD_TARGET'; interactionTarget: FlexiboxInteractionTarget }
  | { type: 'MOVE'; x: number; y: number }
  | { type: 'PAN'; x: number; y: number }
  | { type: 'SET_STATE'; state: FlexiboxInteractorState }
  | { type: 'RESET_VIEW' }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_MIN' }
  | { type: 'ZOOM_MAX' }
  | { type: 'ZOOM_OUT' }
  | { type: 'ZOOM_TO'; zoomTo: { x: number; y: number; scale: number } };
