import { FlexiboxInteractorState, FlexiboxInteractorActions } from './';
import { ReactElement } from 'react';

/**
 * Reducer function for the useFlexiboxInteractor hook.
 *
 * @param state - previous reducer state object
 * @param action - action to perform, returns a new reducer state object
 */
export const FlexiboxInteractorReducer: React.Reducer<FlexiboxInteractorState, FlexiboxInteractorActions> = (
  state,
  action
) => {
  switch (action.type) {
    // Adds an interaction target to the interaction target list for the component
    case 'ADD_TARGET':
      if (state.interactionTargets) {
        return { ...state, interactionTargets: [...state.interactionTargets, action.interactionTarget] };
      }
      break;
    // Zooms in one step given by zoomStep (constrained by max scale)
    case 'ZOOM_IN':
      if (state.scale && state.scale < state.maxScale!) {
        return { ...state, scale: state.scale + state.zoomStep! };
      }
      break;
    // Zooms out one step given by zoomStep (constrained by min scale)
    case 'ZOOM_OUT':
      if (state.scale && state.scale > state.minScale!) {
        return { ...state, scale: state.scale - state.zoomStep! };
      }
      break;
    // Zooms in to the max scale
    case 'ZOOM_MAX':
      return { ...state, scale: state.maxScale! };
    // Zooms out to the minimum scale
    case 'ZOOM_MIN':
      return { ...state, scale: state.minScale! };
    // Zooms directly to a zoom value, constrained by the min or max zoom values
    case 'ZOOM_TO':
      action.zoomTo.scale = action.zoomTo.scale > state.maxScale! ? state.maxScale! : action.zoomTo.scale;
      action.zoomTo.scale = action.zoomTo.scale < state.minScale! ? state.minScale! : action.zoomTo.scale;
      const zoomToBounds = new DOMRect(action.zoomTo.x, action.zoomTo.y, state.bounds?.width, state.bounds?.height);
      return { ...state, scale: action.zoomTo.scale, bounds: zoomToBounds };
    // Moves or resizes the element, depending on state.interactionType.
    case 'MOVE':
      if (state.interactingElementBounds && state.draggingStartX && state.draggingStartY && state.bounds) {
        const relBounds = new DOMRect(
          state.interactingElementBounds?.x,
          state.interactingElementBounds?.y,
          state.interactingElementBounds?.width,
          state.interactingElementBounds?.height
        );

        // scale the offset from the original start coordinates
        const deltaX = Math.floor((action.x - state.draggingStartX) / state.scale!);
        const deltaY = Math.floor((action.y - state.draggingStartY) / state.scale!);

        // adjust the interacting element bounds
        switch (state.interactionType) {
          case 'drag':
            relBounds.x += deltaX;
            relBounds.y += deltaY;
            break;
          case 'resize-nw':
            if (state.canPosition) {
              relBounds.x += deltaX;
              relBounds.y += deltaY;
              relBounds.width -= deltaX;
              relBounds.height -= deltaY;
            }
            break;
          case 'resize-sw':
            if (state.canPosition) {
              relBounds.x += deltaX;
            }
            relBounds.width -= deltaX;
            relBounds.height += deltaY;
            break;
          case 'resize-ne':
            if (state.canPosition) {
              relBounds.y += deltaY;
            }
            relBounds.width += deltaX;
            relBounds.height -= deltaY;
            break;
          case 'resize-se':
            relBounds.width += deltaX;
            relBounds.height += deltaY;
            break;
        }

        if (state.constrainToParentBounds) {
          const parent = state.elementRef?.parentElement as HTMLDivElement;

          // adjust the target bounds to keep within the parent boundaries
          if (parent) {
            if (relBounds.x < 0) {
              relBounds.x = 0;
            }

            if (relBounds.right > parent.clientWidth) {
              relBounds.x -= relBounds.right - parent.clientWidth;
            }

            if (relBounds.y < 0) {
              relBounds.y = 0;
            }

            if (relBounds.bottom > parent.clientHeight) {
              relBounds.y -= relBounds.bottom - parent.clientHeight;
            }

            // adjust the target bounds for min/max width
            if (relBounds.right > parent.clientWidth) {
              relBounds.width -= deltaX;
            }

            if (relBounds.bottom > parent.clientHeight) {
              relBounds.height -= deltaY;
            }
          }
        }

        // check for min/max width and height constraints
        if ((state.maxWidth && relBounds.width > state.maxWidth) || relBounds.width < (state.minWidth ?? 0)) {
          relBounds.x = state.bounds.x;
          relBounds.width = state.bounds.width;
        }
        if ((state.maxHeight && relBounds.height > state.maxHeight) || relBounds.height < (state.minHeight ?? 0)) {
          relBounds.y = state.bounds.y;
          relBounds.height = state.bounds.height;
        }

        // if snapping to a grid
        if (state.useGrid && state.snapToGrid) {
          if (state.gridX && state.gridY && state.scale) {
            // Snap the position and height and width to the grid
            relBounds.x -= relBounds.x % state.gridX;
            relBounds.y -= relBounds.y % state.gridY;
            relBounds.width -= (relBounds.x + relBounds.width) % state.gridX;
            relBounds.height -= (relBounds.y + relBounds.height) % state.gridY;
            // If re-sizing, make some adjustments to make sure the corner opposite the corner being dragged stays
            // in a fixed position to prevent a 'jitter' effect that is annoying visually.
            switch (state.interactionType) {
              case 'resize-nw':
                relBounds.width += state.bounds.x + state.bounds.width - relBounds.x - relBounds.width;
                relBounds.height += state.bounds.y + state.bounds.height - relBounds.y - relBounds.height;
                break;
              case 'resize-sw':
                relBounds.width += state.bounds.x + state.bounds.width - relBounds.x - relBounds.width;
                relBounds.height += state.bounds.y - relBounds.y;
                break;
              case 'resize-ne':
                relBounds.width += state.bounds.x - relBounds.x;
                relBounds.height += state.bounds.y + state.bounds.height - relBounds.y - relBounds.height;
                break;
            }
          }
        }
        // update the bounds of the rendered element
        return { ...state, bounds: relBounds };
      }
      break;
    // Update the hook state
    case 'SET_STATE':
      return { ...state, ...action.state };
    // Resets the zoom and position
    case 'RESET_VIEW':
      const bounds = new DOMRect(0, 0, state.bounds?.width, state.bounds?.height);
      return { ...state, bounds, scale: 1.0 };
    case 'ADD_BOX':
      state.children?.push(action.element);
      return {
        ...state, children: [...state.children ?? []]
      }
    case 'REMOVE_BOX':
      const index = state.children?.findIndex((child) => ((child as ReactElement).props.id === action.id)) ?? -1;
      if (index >= 0) {
        state.children?.splice(index, 1);
        return {
          ...state, children: [...state.children ?? []]
        }
      }
  }
  return state;
};
