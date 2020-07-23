import { FlexiboxInteractionTypes, Flexibox } from './';
import { FlexiboxInteractionTarget } from './useFlexiboxInteractor';
import { ReactChild } from 'react';

export interface FlexiboxInteractorState {
  bounds?: DOMRect;
  canPosition?: boolean;
  canResize?: boolean;
  canZoom?: boolean;
  constrainToParentBounds?: boolean;
  draggingStartX?: number;
  draggingStartY?: number;
  elementRef?: HTMLDivElement | null;
  gridX?: number;
  gridY?: number;
  interactingElementBounds?: DOMRect | null;
  interactionTargets?: FlexiboxInteractionTarget[];
  interactionType?: FlexiboxInteractionTypes | null;
  minHeight?: number;
  minScale?: number;
  minWidth?: number;
  maxHeight?: number;
  maxScale?: number;
  maxWidth?: number;
  scale?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  useGrid?: boolean;
  zoomStep?: number;
  children?: ReactChild[];
}
