import { FlexiboxInteractorState, FlexiboxInteractorActions, Position2D } from './';

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
      console.log(state);
      if (state.scale && state.scale < state.initialState?.maxScale!) {
        return { ...state, scale: state.scale + state.initialState?.zoomStep! };
      }
      break;
    // Zooms out one step given by zoomStep (constrained by min scale)
    case 'ZOOM_OUT':
      console.log(state);
      if (state.scale && (state.scale > state.initialState?.minScale!)) {
        return { ...state, scale: state.scale - state.initialState?.zoomStep! };
      }
      break;
    // Zooms in to the max scale
    case 'ZOOM_MAX':
      return { ...state, scale: state.initialState?.maxScale ?? 1.0 };
    // Zooms out to the minimum scale
    case 'ZOOM_MIN':
      return { ...state, scale: state.initialState?.minScale ?? 1.0 };
    // Zooms directly to a zoom value, constrained by the min or max zoom values
    case 'ZOOM_TO':
      const maxScale = state.initialState?.maxScale ?? 1.0;
      const minScale = state.initialState?.minScale ?? 1.0;
      action.zoomTo.scale = (action.zoomTo.scale > maxScale) ? maxScale : action.zoomTo.scale;
      action.zoomTo.scale = (action.zoomTo.scale < minScale) ? minScale : action.zoomTo.scale;
      const zoomToBounds = new DOMRect(action.zoomTo.x, action.zoomTo.y, state.bounds?.width, state.bounds?.height);
      return { ...state, scale: action.zoomTo.scale, bounds: zoomToBounds };
    case 'PAN':
      if (state.interactingElementBounds && state.bounds && state.contentOrigin && state.pannable && state.draggingStartX && state.draggingStartY) {

        const scale = state.context?.scale ?? 1.0;
        const deltaX = Math.floor((action.x - state.draggingStartX) / scale);
        const deltaY = Math.floor((action.y - state.draggingStartY) / scale);
        const newOrigin: Position2D = { x: 0, y: 0 };

        // Adjust the content origin based on the distance panned from the start of panning
        newOrigin.x = state.contentOrigin.x + deltaX;
        newOrigin.y = state.contentOrigin.y + deltaY;

        // Get the parent to the element being panned
        const parent = state.elementRef?.parentElement as HTMLDivElement;

        // Parent div should have the class name of 'clip-content'
        if (parent.classList.contains('clip-content')) {
          // Get the updated bounding rectangle of the content div
          const contentBounds = new DOMRect(
            newOrigin.x,
            newOrigin.y,
            state.interactingElementBounds.width,
            state.interactingElementBounds.height
          );
          if (parent) {
            // Prevent right edge of content from panning to the left of the right edge of the parent bounds
            if (contentBounds.right <= (parent.clientLeft + parent.clientWidth)) {
              newOrigin.x = parent.clientLeft + parent.clientWidth - contentBounds.width;
            }
            // Prevent bottom edge of content from panning above the bottom edge of the parent bounds
            if (contentBounds.bottom <= (parent.clientTop + parent.clientHeight)) {
              newOrigin.y = parent.clientTop + parent.clientTop - contentBounds.height;
            }
            // When panning to the right, don't pan the left edge of the content past the left edge of the parent
            if (newOrigin.x > 0) {
              newOrigin.x = 0;
            }
            // When panning down, don't pan the top edge of the content past the top edge of the parent
            if (newOrigin.y > 0) {
              newOrigin.y = 0;
            }
          }
        }
        return { ...state, contentOrigin: newOrigin };
      }
      break;
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
        // NOTE: scale is from the most recent enclosing context, NOT the scale value of the current component
        const scale = state.context?.scale ?? 1.0;
        const deltaX = Math.floor((action.x - state.draggingStartX) / scale);
        const deltaY = Math.floor((action.y - state.draggingStartY) / scale);

        // adjust the interacting element bounds
        switch (state.interactionType) {
          case 'drag':
            relBounds.x += deltaX;
            relBounds.y += deltaY;
            break;
          case 'resize-nw':
            if (state.initialState?.resizeable) {
              relBounds.x += deltaX;
              relBounds.y += deltaY;
              relBounds.width -= deltaX;
              relBounds.height -= deltaY;
            }
            break;
          case 'resize-sw':
            if (state.initialState?.resizeable) {
              relBounds.x += deltaX;
            }
            relBounds.width -= deltaX;
            relBounds.height += deltaY;
            break;
          case 'resize-ne':
            if (state.initialState?.resizeable) {
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

        if (state.initialState?.constrainToParent) {
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
        if ((state.initialState?.maxWidth && relBounds.width > state.initialState.maxWidth) || relBounds.width < (state.initialState?.minWidth ?? 0)) {
          relBounds.x = state.bounds.x;
          relBounds.width = state.bounds.width;
        }
        if ((state.initialState?.maxHeight && relBounds.height > state.initialState.maxHeight) || relBounds.height < (state.initialState?.minHeight ?? 0)) {
          relBounds.y = state.bounds.y;
          relBounds.height = state.bounds.height;
        }

        // if snapping to a grid (grid size and scale are from the enclosing context)
        if (state.context?.snapToGrid) {
          if (state.context?.gridX && state.context?.gridY) {
            // Snap the position and height and width to the grid
            relBounds.x -= relBounds.x % state.context.gridX;
            relBounds.y -= relBounds.y % state.context.gridY;
            relBounds.width -= (relBounds.x + relBounds.width) % state.context.gridX;
            relBounds.height -= (relBounds.y + relBounds.height) % state.context.gridY;
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
  }
  return state;
};
