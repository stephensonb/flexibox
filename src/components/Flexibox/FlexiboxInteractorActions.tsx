import { FlexiboxInteractorState } from '.';
import { FlexiboxInteractionTarget } from './useFlexiboxInteractor';
import { ReactChild } from 'react';

export type FlexiboxInteractorActions =
  | { type: 'ADD_TARGET'; interactionTarget: FlexiboxInteractionTarget }
  | { type: 'MOVE'; x: number; y: number }
  | { type: 'SET_STATE'; state: FlexiboxInteractorState }
  | { type: 'RESET_VIEW' }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_MIN' }
  | { type: 'ZOOM_MAX' }
  | { type: 'ZOOM_OUT' }
  | { type: 'ZOOM_TO'; zoomTo: { x: number; y: number; scale: number } }
  | { type: 'ADD_BOX'; id: string; element: ReactChild } | { type: 'REMOVE_BOX'; id: string };
