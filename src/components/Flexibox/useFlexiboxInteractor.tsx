import { MutableRefObject, useContext, useEffect, useReducer } from 'react';
import { isArray } from 'util';
import { FlexiboxContext, FlexiboxInteractorReducer, FlexiboxState } from './';

// local global variable that indicates if an interaction is occuring with any flexibox element
let isAnimating = false;

export type FlexiboxInteractionTypes = 'pan' | 'drag' | 'resize-nw' | 'resize-sw' | 'resize-ne' | 'resize-se';

export interface FlexiboxInteractionTarget {
  interactionType: FlexiboxInteractionTypes;
  selector: string[] | string;
}

// Component definition
export const useFlexiboxInteractor = (ref: HTMLDivElement | null, initialState: FlexiboxState) => {

  const context = useContext(FlexiboxContext);

  // Update reducer state if context changes
  useEffect(() => {
    if (context) {
      console.log('Context changes, setting state...');
      // Update the DOM element reference
      dispatch({
        type: 'SET_STATE',
        state: {
          context
        },
      });
    };
  }, [context]);

  // Reducer does the heavy lifting - it executes the actions that mutate the element's state
  const [state, dispatch] = useReducer(FlexiboxInteractorReducer, { initialState });

  // Update reducer state if DOM element reference changes
  useEffect(() => {
    if (ref && ref !== state.elementRef) {
      // Update the DOM element reference
      dispatch({
        type: 'SET_STATE',
        state: {
          elementRef: ref,
          initialState,
          interactingElementBounds: null,
          interactionType: null,
          bounds: new DOMRect(
            initialState.x ?? ref?.offsetLeft,
            initialState.y ?? ref?.offsetTop,
            initialState.width ?? ref?.offsetWidth,
            initialState.height ?? ref?.offsetHeight
          ),
          draggingStartX: 0,
          draggingStartY: 0,
          contentOrigin: { x: 0, y: 0 },
          interactionTargets: [],
          children: [],
          zoomable: initialState.zoomable,
          scale: initialState.scale,
          pannable: initialState.pannable
        },
      });
    };
  }, [ref, initialState, state.elementRef]);

  // Add events when the element is re-rendered (the DOM reference changes)
  useEffect(() => {
    if (state.elementRef) {
      state.elementRef.addEventListener('mousedown', mouseDown);
      state.elementRef.addEventListener('mouseenter', mouseEnter);
      state.elementRef.addEventListener('mouseleave', mouseLeave);
      // If interactor element is zoomable, add the wheel events
      if (state.zoomable) {
        // Prevent document window from overriding desired wheel event behavior
        document.addEventListener('wheel', wheelHandler, {
          passive: false,
        });
        // Add the wheel event listener to the interactor element
        state.elementRef.addEventListener('wheel', wheelHandler);
      }
      // on initial display of component, hide any control adornments
      hideAdornments(state.elementRef);
    }

    // cleanup code - remove events from the current element if it is being unmounted
    return () => {
      if (state.elementRef) {
        state.elementRef.removeEventListener('mousedown', mouseDown);
        state.elementRef.removeEventListener('mouseenter', mouseEnter);
        state.elementRef.removeEventListener('mouseleave', mouseLeave);
        document.removeEventListener('wheel', wheelHandler);
        state.elementRef.removeEventListener('wheel', wheelHandler);
      }
    };
  }, [state.elementRef]);

  // Handle when zoomable changes
  useEffect(() => {
    if (state.elementRef) {
      // If interactor element is zoomable, add the wheel events
      if (state.zoomable) {
        // Prevent document window from overriding desired wheel event behavior
        document.addEventListener('wheel', wheelHandler, {
          passive: false,
        });
        // Add the wheel event listener to the interactor element
        state.elementRef.addEventListener('wheel', wheelHandler);
      }
    }

    // cleanup code - remove events from the current element if it is being unmounted
    return () => {
      if (state.elementRef) {
        document.removeEventListener('wheel', wheelHandler);
        state.elementRef.removeEventListener('wheel', wheelHandler);
      }
    };
  }, [state.elementRef, state.zoomable]);

  // Adds elements that are used to control the available interactions on the flexibox.  Elements can be added
  // by id, name, class name, or ref to an HTMLElement
  const addInteractionTarget = (target: FlexiboxInteractionTarget) => {
    dispatch({
      type: 'ADD_TARGET',
      interactionTarget: target,
    });
  };

  // Select all elements in the DOM matching the CSS selector, scoped to the containing element
  const queryScopedSelectorAll = (element: HTMLElement | null, selector: string): NodeListOf<Element> => {
    if (element === null) {
      return {} as NodeListOf<Element>;
    }
    return element.querySelectorAll(':scope ' + selector);
  };

  // Determine which interaction target user wants to interact with (or none if no matching interaction target found)
  // If an element is found that matches one of the interaction targets, then returns an object indicating the
  // interaction type (i.e.: 'drag' or 'resize', etc.) and the CSS selector definition used to match the target element
  // in the DOM.
  //
  // If no interaction target found for the event target element, then returns null.  Usually this means the event
  // is not to be handled by the interactor and will be passed along to other listeners.
  const findInteractionTargetForEvent = (event: Event) => {
    const dispatcher = event.target as HTMLElement;
    const listener = event.currentTarget as HTMLElement;

    // see if the element that dispatched the event is an interaction target
    let target: FlexiboxInteractionTarget | null = null;
    // We only look for interaction targets within the element that the event is attached to (the listener)
    if (dispatcher.parentElement === listener) {
      if (state.interactionTargets) {
        for (let i = 0; i < state.interactionTargets.length && target === null; i++) {
          const elements: NodeListOf<Element>[] = [];
          const selector = state.interactionTargets[i].selector;
          // Accumulate a list of all elements for the selectors for this interaction target
          if (typeof selector === 'string') {
            elements.push(queryScopedSelectorAll(listener, selector as string));
          } else if (isArray(selector)) {
            const selectors = selector as string[];
            for (let j = 0; j < selectors.length; j++) {
              const selector = selectors[j];
              elements.push(queryScopedSelectorAll(listener, selector));
            }
          }
          // cycle through all elements matching the list of selectors and return the first one that matches
          // the target element for the event passed into the function
          for (let nodeListIndex = 0; nodeListIndex < elements.length; nodeListIndex++) {
            for (let nodeIndex = 0; nodeIndex < elements[nodeListIndex].length; nodeIndex++) {
              if (elements[nodeListIndex][nodeIndex] === dispatcher) {
                target = state.interactionTargets[i];
              }
            }
          }
        }
      }
    }
    return target;
  };

  // Begin interaction with the flexibox (drag, resize, ...)
  const startMouseInteraction = (
    target: HTMLElement,
    interactionType: FlexiboxInteractionTypes,
    x: number,
    y: number
  ) => {
    // Add event listeners for further interaction 
    document.addEventListener('mousemove', mouseMoved);
    document.addEventListener('mouseup', mouseUp);
    // If panning the contents of an element, change the cursor
    if (interactionType === 'pan') {
      target.style.cursor = 'grabbing';
    }
    dispatch({
      type: 'SET_STATE',
      state: {
        interactingElementBounds: new DOMRect(target.offsetLeft, target.offsetTop, target.offsetWidth, target.offsetHeight), interactionType,
        draggingStartX: x,
        draggingStartY: y,
      },
    });
    isAnimating = true;
  };

  // Mouse down handler
  const mouseDown = (e: MouseEvent) => {
    // Get the element that we are interacting with
    let target = findInteractionTargetForEvent(e);
    // If the mouse down event happened over a valid interaction target element, then start interacting with it.
    if (target) {
      startMouseInteraction(e.currentTarget as HTMLElement, target.interactionType, e.clientX, e.clientY);
      e.preventDefault();
    }
  };

  // show adornments when mouse enters the element
  const mouseEnter = (e: MouseEvent) => {
    // only handle if we are not already interacting with this element
    if (!isAnimating) {
      const listener = e.currentTarget as HTMLElement;
      // If the element that fired this event is the interacting element, then show adornments when entering
      if (listener === state.elementRef) {
        showAdornments(listener);
      }
    }
    e.preventDefault();
  };

  // hide adornments when mouse leaves the element
  const mouseLeave = (e: MouseEvent) => {
    // only handle if we are not already interacting with this element
    if (!isAnimating) {
      const listener = e.currentTarget as HTMLElement;
      // If the element that fired this event is the interacting element, then hide adornments when leaving
      if (listener === state.elementRef) {
        hideAdornments(listener);
      }
    }
    e.preventDefault();
  };

  // Update element position when mouse is moved (resize, drag, ...)
  const mouseMoved = (event: MouseEvent) => {
    console.log('mouse move: ' + state.elementRef?.id);
    dispatch({
      type: 'MOVE',
      x: event.clientX,
      y: event.clientY,
    });
    event.preventDefault();
  };

  // End element interaction
  const mouseUp = (e: MouseEvent) => {
    // remove mouse listeners
    document.removeEventListener('mousemove', mouseMoved);
    document.removeEventListener('mouseup', mouseUp);
    // Null out the interacting element bounds
    dispatch({
      type: 'SET_STATE',
      state: {
        interactingElementBounds: null,
      },
    });
    if (state.elementRef) {
      // If the mouse pointer is outside of the interacting element bounds when mouse is released, then
      // make sure to hide the adornments.
      if (isAnimating && !isInsideElement(e.clientX, e.clientY, state.elementRef)) {
        hideAdornments(state.elementRef);
      }
      // reset the cursor
      state.elementRef.style.cursor = 'default';
    }
    isAnimating = false;
    e.preventDefault();
  };

  // Scroll wheel events used to zoom element (change its scale)
  const wheelHandler = (e: MouseWheelEvent) => {
    const listener = e.currentTarget as HTMLElement;
    // only handle if the mouse is over the interacting element and it is zoomable
    if (listener === state.elementRef && state.zoomable) {
      console.log("id: " + listener.id + " zoom: " + state.scale);
      // if deltaY is negative (scroll wheel rotated toward user), zoom out.
      if (e.deltaY > 0) {
        zoomOut();
      } else {
        zoomIn();
      }
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  // Determines if the given coordinates are within the bounds of the given element
  const isInsideElement = (x: number, y: number, element: HTMLElement): boolean => {
    const bounds = element.getBoundingClientRect();
    return (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom);
  }

  // Removes the 'hide-adornments' class from the interactor element.
  const showAdornments = (element: HTMLElement) => {
    state.elementRef?.classList.remove('hide-adornments');
  };

  // Adds the 'hide-adornments' class to the interactor element.
  const hideAdornments = (element: HTMLElement) => {
    state.elementRef?.classList.add('hide-adornments');
  };

  /**
   *
   *
   *
   * Interactor API functions.  These functions are exposed through the returned object from useFlexiboxInteractor()
   * They allow the component using this hook to manipulate the internal interactor state through these function calls.
   *
   *
   *
   *
   */

  // Enable zooming (scaling) the element with the mouse wheel
  const enableZoom = () => {
    // sync state in the reducer
    dispatch({ type: 'SET_STATE', state: { zoomable: true } });
  };

  // Disable zooming (scaling) the element
  const disableZoom = () => {
    // sync state in the reducer
    dispatch({ type: 'SET_STATE', state: { zoomable: false } });
  };

  // Return the top, left, width and height of the minimum bounding rectangle that would contain all children elements
  const getExtents = (element?: HTMLElement | null) => {
    element = element ?? state.elementRef;

    // start with a zero sized boundary
    const bounds = new DOMRect(0, 0, 0, 0);

    if (element && element.children.length !== 0) {
      for (let i = 0; i < element.children.length; i++) {
        const childBounds = getExtents(element.children[i] as HTMLElement);
        // initialize the minimum bounding box with the first child element
        if (i === 0) {
          bounds.x = childBounds.x;
          bounds.y = childBounds.y;
          bounds.width = childBounds.width;
          bounds.height = childBounds.height;
          continue;
        }
        if (childBounds.x < bounds.x) {
          bounds.width += bounds.x - childBounds.x;
          bounds.x = childBounds.x;
        }
        if (childBounds.y < bounds.y) {
          bounds.height += bounds.y - childBounds.y;
          bounds.y = childBounds.y;
        }
        if (childBounds.right > bounds.right) {
          bounds.width += childBounds.right - bounds.right;
        }
        if (childBounds.bottom < bounds.bottom) {
          bounds.height += childBounds.height - bounds.height;
        }
      }
    }

    return bounds;
  };

  // Set the zoom to 1.0 and set the top left position to (0,0)
  const resetView = () => {
    dispatch({ type: 'RESET_VIEW' });
  };

  // Increases scale by zoomStep;
  const zoomIn = () => {
    dispatch({ type: 'ZOOM_IN' });
  };

  // Sets scale to maxScale;
  const zoomMax = () => {
    dispatch({ type: 'ZOOM_MAX' });
  };

  // Sets scale to minScale;
  const zoomMin = () => {
    dispatch({ type: 'ZOOM_MIN' });
  };

  // Decreases scale by zoomStep;
  const zoomOut = () => {
    dispatch({ type: 'ZOOM_OUT' });
  };

  // Re-centers the view and sets the scale
  const zoomTo = (centerX: number, centerY: number, scale: number) => {
    dispatch({ type: 'ZOOM_TO', zoomTo: { x: centerX, y: centerY, scale } });
  };

  // Sets the scale and position so all child elements are visible within the parent's bounding box.  Aspect ratio is
  // maintained and the element will be centered within the parent.
  const zoomToExtents = () => {
    const parent = state.elementRef?.parentElement;
    if (parent) {
      const extents = getExtents(state.elementRef);
      // The scaling to use is the largest ratio between child width / parent width or child height / parent height
      const xScale = parent.offsetWidth / extents.width;
      const yScale = parent.offsetHeight / extents.height;

      let x = 0;
      let y = 0;
      let scale = 1.0;

      // Determine which axis to use for scaling so the child fits within the bounds of the parent
      if (xScale === yScale) {
        // scales are equal, so just use the x axis scaling and leave the position at 0,0
        scale = xScale;
      } else if (xScale < yScale) {
        // x axis (width) used for scaling, center the element on the y axis, x = 0
        y = parent.offsetHeight / 2 - (extents.height * xScale) / 2;
        scale = xScale;
      } else {
        // y axis (height) used for scaling, center the element on the x axis, y = 0
        x = parent.offsetWidth / 2 - (extents.width * yScale) / 2;
        scale = yScale;
      }

      // zoom and set the new origin for the element within the parent
      dispatch({ type: 'ZOOM_TO', zoomTo: { x, y, scale } });
    };
  };

  const setElementRef = (ref: MutableRefObject<HTMLDivElement | null>): void => {
    dispatch({ type: 'SET_STATE', state: { elementRef: ref.current } });
  }

  // interactor functions that users of the hook call
  const Interactor = {
    addInteractionTarget,
    enableZoom,
    disableZoom,
    getExtents,
    resetView,
    zoomIn,
    zoomMax,
    zoomMin,
    zoomOut,
    zoomTo,
    zoomToExtents,
    setElementRef
  };

  return {
    state,
    Interactor,
  };
};
