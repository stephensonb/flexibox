import { ReactChild } from 'react';
import { FlexiboxInteractionTypes, Position2D } from './';
import { FlexiboxState } from './FlexiboxState';
import { FlexiboxInteractionTarget } from './useFlexiboxInteractor';

export interface FlexiboxInteractorState {
  bounds?: DOMRect;
  children?: ReactChild[];
  draggingStartX?: number;
  draggingStartY?: number;
  elementRef?: HTMLDivElement | null;
  contentOrigin?: Position2D;
  initialState?: FlexiboxState;
  context?: FlexiboxState;
  interactingElementBounds?: DOMRect | null;
  interactionTargets?: FlexiboxInteractionTarget[];
  interactionType?: FlexiboxInteractionTypes | null;
  zoomable?: boolean;
  pannable?: boolean;
  scale?: number;
}
