import { FlexiboxInteractorActions, FlexiboxInteractorState } from './';

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
  // Helper function to constrain position and size based on min/max height and width specifications when resizing an element
  const fixResizeOutOfBounds = (newBounds: DOMRect, deltaX: number, deltaY: number, deltaWidth: number, deltaHeight: number) => {
    if (
      (state.minWidth && (newBounds.width < state.minWidth)) ||
      (state.maxWidth && (newBounds.width > state.maxWidth))
    ) {
      newBounds.x += deltaX;
      newBounds.width += deltaWidth;
    }
    if (
      (state.minHeight && (newBounds.height < state.minHeight)) ||
      (state.maxHeight && (newBounds.height > state.maxHeight))
    ) {
      newBounds.y += deltaY;
      newBounds.height += deltaHeight;
    }
  }

  // Helper function to snap the new coordinates of the element to a grid (if the grid exists)
  const snapToGrid = (newBounds: DOMRect) => {
    if (state.elementBounds && state.gridX && state.gridY) {
      // Snap the position and height and width to the grid
      newBounds.x -= newBounds.x % state.gridX;
      newBounds.y -= newBounds.y % state.gridY;
      newBounds.width -= (newBounds.x + newBounds.width) % state.gridX;
      newBounds.height -= (newBounds.y + newBounds.height) % state.gridY;
      // If re-sizing, make some adjustments to make sure the corner opposite the corner being dragged stays
      // in a fixed position to prevent a 'jitter' effect that is annoying visually.
      switch (state.activeInteractionTarget?.selector) {
        case '.resizeable.nw':
          newBounds.width += state.elementBounds.x + state.elementBounds.width - newBounds.x - newBounds.width;
          newBounds.height += state.elementBounds.y + state.elementBounds.height - newBounds.y - newBounds.height;
          break;
        case '.resizeable.sw':
          newBounds.width += state.elementBounds.x + state.elementBounds.width - newBounds.x - newBounds.width;
          newBounds.height += state.elementBounds.y - newBounds.y;
          break;
        case '.resizeable.ne':
          newBounds.width += state.elementBounds.x - newBounds.x;
          newBounds.height += state.elementBounds.y + state.elementBounds.height - newBounds.y - newBounds.height;
          break;
      }
    }
  }

  // Pans the view of the element contents.  x and y are the current position of the mouse
  const panView = (x: number, y: number): FlexiboxInteractorState => {
    if (state.interactingElementBounds && state.elementBounds && state.pannable && state.startX && state.startY) {
      // The clipping div is the viewport into the content div
      const clipDiv = state.elementRef?.querySelector(".clip-content") as HTMLElement;
      // The content div is what is being panned
      const contentDiv = clipDiv?.querySelector(".content") as HTMLElement;

      if (clipDiv && contentDiv) {
        // Adjust the scroll offsets as the result of the pan
        let scrollX = clipDiv.scrollLeft + state.startX - x;
        let scrollY = clipDiv.scrollTop + state.startY - y;

        if (scrollX < 0) {
          // when panning right, don't pan the left edge of the content past the left edge of the clip div
          scrollX = 0;
        } else if (scrollX > (clipDiv.scrollWidth - clipDiv.clientWidth)) {
          // when panning left, don't pan the right edge of the content past the right edge of the clip div
          scrollX = clipDiv.scrollWidth - clipDiv.clientWidth;
        }

        if (scrollY < 0) {
          // when panning down, don't pan the top edge of the content past the top edge of the clip div
          scrollY = 0;
        } else if (scrollY > (clipDiv.scrollHeight - clipDiv.clientHeight)) {
          // when panning up, don't pan the bottom edge of the content past the bottom edge of the clip div
          scrollY = clipDiv.scrollHeight - clipDiv.clientHeight;
        }

        // Scroll the content div based on the new pan position
        clipDiv.scrollTo(scrollX, scrollY);
      }
      // update the startx and starty coords for the next pan adjustment
      return { ...state, startX: x, startY: y };
    }

    // no changes, return previous state
    return state;
  }

  // Repositions (drags) or resizes the element.  x and y are the current position of the mouse
  const dragOrResizeElement = (x: number, y: number): FlexiboxInteractorState => {
    if (state.interactingElementBounds && state.startX && state.startY && state.elementBounds) {
      // Create a copy of the bounds of the interacting element
      const relBounds = new DOMRect(
        state.interactingElementBounds?.x,
        state.interactingElementBounds?.y,
        state.interactingElementBounds?.width,
        state.interactingElementBounds?.height
      );

      // Calculated the distance from the start of the interaction
      const deltaX = Math.floor((x - state.startX));
      const deltaY = Math.floor((y - state.startY));

      // adjust the interacting element bounds
      switch (state.activeInteractionTarget?.interactionType) {
        case 'drag':
          relBounds.x += deltaX;
          relBounds.y += deltaY;
          // constrain positioning within the parent container's boundaries
          const parent = state.elementRef?.parentElement as HTMLElement;
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
          }
          break;
        case 'resize':
          switch (state.activeInteractionTarget.selector) {
            case '.resizeable.nw':
              if (state.resizeable) {
                // resize top left corner.  Adjust both the x,y coords and the width so the element stays 'pinned' to the 
                // bottom,right corner while resizing the top and left sides of the element
                relBounds.x += deltaX;
                relBounds.y += deltaY;
                relBounds.width -= deltaX;
                relBounds.height -= deltaY;
                fixResizeOutOfBounds(relBounds, deltaX, deltaY, -deltaX, -deltaY);
              }
              break;
            case '.resizeable.sw':
              if (state.resizeable) {
                // resize bottom right corner.  Adjust the x coord and the width/height so the element stays 'pinned' at the top
                // while resizing the bottom and right sides of the element
                relBounds.x += deltaX;
                relBounds.width -= deltaX;
                relBounds.height += deltaY;
                fixResizeOutOfBounds(relBounds, deltaX, 0, -deltaX, deltaY);
              }
              break;
            case '.resizeable.ne':
              // resize top right corner.  Adjust the y coord and the width/height so the element stays 'pinned' at the left
              // while resizing the top and right sides of the element
              if (state.resizeable) {
                relBounds.y += deltaY;
                relBounds.width += deltaX;
                relBounds.height -= deltaY;
                fixResizeOutOfBounds(relBounds, 0, deltaY, deltaX, -deltaY);
              }
              break;
            case '.resizeable.se':
              // resize bottom right corner.
              if (state.resizeable) {
                relBounds.width += deltaX;
                relBounds.height += deltaY;
                fixResizeOutOfBounds(relBounds, 0, 0, deltaX, deltaY);
              }
              break;
          }
          break;
      }

      // if snapping to a grid (grid size and scale are from the enclosing context)
      if (state.snapToGrid) {
        snapToGrid(relBounds);
      }
      // update the bounds of the rendered element
      return { ...state, elementBounds: relBounds };
    }
    // no changes, return previous state
    return state;
  }

  // Repositions (drags) or resizes the element.  x and y are the current position of the mouse
  const resizeSelectBox = (x: number, y: number): FlexiboxInteractorState => {
    if (state.interactingElementBounds && state.startX && state.startY && state.contentDivRef) {
      // Create a copy of the bounds of the interacting element
      const selectBoxBounds = new DOMRect(
        state.interactingElementBounds?.x,
        state.interactingElementBounds?.y,
        state.interactingElementBounds?.width,
        state.interactingElementBounds?.height
      );

      // Calculated the distance from the start of the interaction
      const deltaX = Math.floor((x - state.startX));
      const deltaY = Math.floor((y - state.startY));

      if (x < selectBoxBounds.left) {
        selectBoxBounds.x += deltaX;
        selectBoxBounds.width -= deltaX;
      } else {
        selectBoxBounds.width += deltaX;
      }

      if (y < selectBoxBounds.top) {
        selectBoxBounds.y += deltaY;
        selectBoxBounds.height -= deltaY;
      } else {
        selectBoxBounds.height += deltaY;
      }

      if (selectBoxBounds.left < 0) {
        selectBoxBounds.width += selectBoxBounds.left;
        selectBoxBounds.x = 0;
      } else if (selectBoxBounds.right > (state.contentDivRef.offsetWidth - 2)) {
        selectBoxBounds.width -= (selectBoxBounds.right - state.contentDivRef.offsetWidth + 2);
      }

      if (selectBoxBounds.top < 0) {
        selectBoxBounds.height += selectBoxBounds.top;
        selectBoxBounds.y = 0;
      } else if (selectBoxBounds.bottom > (state.contentDivRef.offsetHeight - 2)) {
        selectBoxBounds.height -= (selectBoxBounds.bottom - state.contentDivRef.offsetHeight + 2);
      }

      // update the bounds of the rendered element
      return { ...state, selectBoxBounds };
    }

    // no changes, return previous state
    return state;
  }

  /**
   * Handle the reducer actions
   */
  switch (action.type) {
    // Adds an interaction target to the interaction target list for the component
    case 'ADD_TARGET':
      if (state.interactionTargets === null || state.interactionTargets === undefined) {
        state.interactionTargets = [];
      }
      return { ...state, interactionTargets: [...state.interactionTargets, action.interactionTarget] };

    // Zooms in one step given by zoomStep (constrained by max scale)
    case 'ZOOM_IN':
      if (state.scale && state.zoomable && state.scale < state.maxScale! && state.elementRef) {
        return { ...state, scale: state.scale + state.zoomStep! };
      }
      break;

    // Zooms out one step given by zoomStep (constrained by min scale)
    case 'ZOOM_OUT':
      if (state.scale && state.zoomable && (state.scale > state.minScale!)) {
        return { ...state, scale: state.scale - state.zoomStep! };
      }
      break;

    // Zooms in to the max scale
    case 'ZOOM_MAX':
      return { ...state, scale: state.maxScale ?? 1.0 };

    // Zooms out to the minimum scale
    case 'ZOOM_MIN':
      return { ...state, scale: state.minScale ?? 1.0 };

    // Pans a zoomable view
    case 'PAN':
      return panView(action.x, action.y);

    // Drag or resize the element, depending on state.interactionType.
    case 'MOVE':
    case 'DRAG':
    case 'RESIZE':
      return dragOrResizeElement(action.x, action.y);

    // Resize an active select box
    case 'RESIZE_SELECT_BOX':
      return resizeSelectBox(action.x, action.y);

    // Resets the zoom 
    case 'RESET_VIEW':
      return { ...state, scale: 1.0 };

    case 'SET_CONTAINER_SCALE':
      return { ...state, containerScale: action.scale }

    case 'SET_ELEMENT_REF':
      return {
        ...state,
        elementRef: action.ref,
        elementBounds: new DOMRect(action.ref.offsetLeft, action.ref.offsetTop, action.ref.offsetWidth, action.ref.offsetHeight),
        clipDivRef: action.ref.querySelector('.clip-content') as HTMLDivElement,
        contentDivRef: action.ref.querySelector('.clip-content .content') as HTMLDivElement
      }

    case 'SET_GRID_SNAP':
      return { ...state, snapToGrid: action.snapToGrid }

    case 'SET_GRID_XY':
      return { ...state, gridX: action.gridX, gridY: action.gridY }

    // Start mouse interaction (for panning, dragging, resizing)
    case 'BEGIN_MOUSE_INTERACTION':
      if (state.elementRef && state.elementBounds) {
        return {
          ...state,
          interactingElementBounds: action.interactingElementBounds,
          activeInteractionTarget: action.activeInteractorTarget,
          startX: action.interactionStartMouseX,
          startY: action.interactionStartMouseY
        }
      }
      break;

    // End mouse interaction
    case 'END_MOUSE_INTERACTION':
      if (state.elementRef && state.elementBounds) {
        return {
          ...state,
          interactingElementBounds: null,
          selectBoxBounds: null
        }
      }
      break;
  }
  // If action not handled in the switch statement, just return previous state with no changes
  return state;
}
