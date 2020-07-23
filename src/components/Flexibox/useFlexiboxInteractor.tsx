import React, { useContext, useEffect, useReducer, ReactChildren, ReactChild, ReactElement, Children } from 'react';
import { isArray } from 'util';
import { FlexiboxGridContext, FlexiboxInteractorReducer, FlexiboxProps, FlexiboxZoomContext, Flexibox } from './';
import { v4 as uuid } from 'uuid';

// local global variable that indicates if an interaction is occuring with any flexibox element
let isAnimating = false;

export type FlexiboxInteractionTypes = 'drag' | 'resize-nw' | 'resize-sw' | 'resize-ne' | 'resize-se';

export interface FlexiboxInteractionTarget {
  interactionType: FlexiboxInteractionTypes;
  selector: string[] | string;
}

// Component definition
export const useFlexiboxInteractor = (ref: HTMLDivElement | null, props: FlexiboxProps) => {
  // grab the context for parents that are zoomable or using a grid
  const zoomContext = useContext(FlexiboxZoomContext);
  const gridContext = useContext(FlexiboxGridContext);

  // Reducer does the heavy lifting - it executes the actions that mutate the element's state
  const [state, dispatch] = useReducer(FlexiboxInteractorReducer, {
    elementRef: ref,
    interactingElementBounds: null,
    interactionType: null,
    bounds: new DOMRect(
      props.x ?? ref?.offsetLeft,
      props.y ?? ref?.offsetTop,
      props.width ?? ref?.offsetWidth,
      props.height ?? ref?.offsetHeight
    ),
    draggingStartX: 0,
    draggingStartY: 0,
    scale: 1.0,
    gridX: 1.0,
    gridY: 1.0,
    snapToGrid: false,
    useGrid: false,
    showGrid: false,
    minWidth: props.minWidth,
    maxWidth: props.maxWidth,
    minHeight: props.minHeight,
    maxHeight: props.maxHeight,
    canZoom: props.canZoom ?? false,
    maxScale: props.maxScale ?? 1.9,
    minScale: props.minScale ?? 0.1,
    zoomStep: props.zoomStep ?? 0.1,
    canResize: props.canResize ?? true,
    canPosition: props.canPosition ?? true,
    constrainToParentBounds: props.constrainToParentBounds ?? true,
    interactionTargets: [],
    children: [],
  });

  // Update reference to the DOM element if it has been re-rendered with a new element
  useEffect(() => {
    console.log('DOM Element changed - useEffect called');
    if (ref) {
      // Update the DOM element reference
      dispatch({
        type: 'SET_STATE',
        state: {
          elementRef: ref,
          bounds: new DOMRect(
            props.x ?? ref.offsetLeft,
            props.y ?? ref.offsetTop,
            props.width ?? ref.offsetWidth,
            props.height ?? ref.offsetHeight
          ),
        },
      });
    };
  }, [ref]);

  // update the state when the zoom context changes
  useEffect(() => {
    if (zoomContext.canZoom) {
      dispatch({
        type: 'SET_STATE',
        state: {
          minScale: zoomContext.minZoom,
          maxScale: zoomContext.maxZoom,
          scale: zoomContext.scale,
          zoomStep: zoomContext.zoomStep,
        },
      });
    }
  }, [zoomContext]);

  // update the state when the grid context changes
  useEffect(() => {
    if (gridContext.useGrid) {
      dispatch({
        type: 'SET_STATE',
        state: {
          gridX: gridContext.gridX,
          gridY: gridContext.gridY,
          useGrid: gridContext.useGrid,
          showGrid: gridContext.showGrid,
          snapToGrid: gridContext.snapToGrid,
        },
      });
    }
  }, [gridContext]);

  // Add events when the element is re-rendered (the DOM reference changes)
  useEffect(() => {
    console.log('*** elementRef change - useEffect called');
    console.log('State Element:' + state.elementRef?.id);
    console.log('DOM Element:' + ref?.id);
    if (state.elementRef) {
      state.elementRef.addEventListener('mousedown', mouseDown);
      state.elementRef.addEventListener('mouseenter', mouseEnter);
      state.elementRef.addEventListener('mouseleave', mouseLeave);
      if (state.canZoom) {
        document.addEventListener('wheel', wheelHandler, {
          passive: false,
        });
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
      }
    };
  }, [state.elementRef]);

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

  // Default mouse down handler
  const mouseDown = (e: MouseEvent) => {
    // Get the element that we are interacting with
    let target = findInteractionTargetForEvent(e);

    // If the mouse down event happened over a valid interaction target element, then start interacting with it.
    if (target) {
      startMouseInteraction(e.currentTarget as HTMLElement, target.interactionType, e.clientX, e.clientY);
      e.preventDefault();
    }
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
    const originBounds = new DOMRect(target.offsetLeft, target.offsetTop, target.offsetWidth, target.offsetHeight);
    dispatch({
      type: 'SET_STATE',
      state: {
        interactingElementBounds: originBounds,
        interactionType,
        draggingStartX: x,
        draggingStartY: y,
      },
    });
    isAnimating = true;
  };

  // show adornments when mouse enters the element
  const mouseEnter = (e: MouseEvent) => {
    // only handle if we are not already interacting with this element
    console.log(e.currentTarget);
    if (!isAnimating) {
      const listener = e.currentTarget as HTMLElement;
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
      if (listener === state.elementRef) {
        hideAdornments(listener);
      }
    }
    e.preventDefault();
  };

  // Update element position when mouse is moved (resize, drag, ...)
  const mouseMoved = (event: MouseEvent) => {
    dispatch({
      type: 'MOVE',
      x: event.clientX,
      y: event.clientY,
    });
    event.preventDefault();
  };

  // End element interaction
  const mouseUp = (e: MouseEvent) => {
    document.removeEventListener('mousemove', mouseMoved);
    document.removeEventListener('mouseup', mouseUp);
    dispatch({
      type: 'SET_STATE',
      state: {
        interactingElementBounds: null,
      },
    });
    if (isAnimating && state.elementRef && !isInsideElement(e.clientX, e.clientY, state.elementRef)) {
      hideAdornments(state.elementRef);
      const rect = state.interactingElementBounds;

    }
    isAnimating = false;
    e.preventDefault();
  };

  // Scroll wheel events used to zoom element (change its scale)
  const wheelHandler = (event: any) => {
    if (state.canZoom) {
      // zoom only when control key held down
      if (event.ctrlKey) {
        if (event.deltaY > 0) {
          zoomOut();
        } else {
          zoomIn();
        }
        event.preventDefault();
      }
    }
  };

  const isInsideElement = (x: number, y: number, element: HTMLElement): boolean => {
    const bounds = element.getBoundingClientRect();
    return (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom);
  }

  // Removes the 'hidden' class on all elements marked with 'adornment' class, scoped to the containing element.
  const showAdornments = (element: HTMLElement) => {
    const adornments = element.querySelectorAll(':scope .adornment');
    for (let i = 0; i < adornments.length; i++) {
      if (adornments[i].parentElement === element) {
        if (state.canResize) {
          if (adornments[i].className.includes('resize')) {
            if (state.canPosition || (!state.canPosition && !adornments[i].className.includes('nw'))) {
              // If we are not allowed to position the element, remove the top left resize handle ('nw')
              // basically, the element will be anchored at the top left and you can resize using the ne, se, and sw
              // resize handles.
              adornments[i].classList.remove('hidden');
            }
          }
        }
        if (state.canPosition) {
          if (adornments[i].className.includes('drag')) {
            adornments[i].classList.remove('hidden');
          }
        }
      }
    }
  };

  // Adds the 'hidden' class on all elements marked with 'adornment' class, scoped to the containing element.
  const hideAdornments = (element: HTMLElement) => {
    const adornments = element.querySelectorAll(':scope .adornment');
    for (let i = 0; i < adornments.length; i++) {
      adornments[i].classList.add('hidden');
    }
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

  // Enable moving the element around
  const enableMove = () => {
    dispatch({ type: 'SET_STATE', state: { canPosition: true } });
  };

  // Enable resizing the element
  const enableResize = () => {
    dispatch({ type: 'SET_STATE', state: { canResize: true } });
  };

  // Enable zooming (scaling) the element with the mouse wheel
  const enableZoom = () => {
    dispatch({ type: 'SET_STATE', state: { canZoom: true } });
  };

  // Disable moving the element around
  const disableMove = () => {
    dispatch({ type: 'SET_STATE', state: { canPosition: false } });
  };

  // Disable resizing the element
  const disableResize = () => {
    dispatch({ type: 'SET_STATE', state: { canResize: false } });
  };

  // Disable zooming (scaling) the element
  const disableZoom = () => {
    dispatch({ type: 'SET_STATE', state: { canZoom: false } });
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

  // Keep the element within the parent's bounding box when moving
  const keepInsideParentBounds = () => {
    dispatch({ type: 'SET_STATE', state: { constrainToParentBounds: true } });
  };
  // Allow moving the element outside the parent's bounding box
  const allowOutsideParentBounds = () => {
    dispatch({ type: 'SET_STATE', state: { constrainToParentBounds: false } });
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

  const addBox = (props: FlexiboxProps): string => {
    const id = uuid();
    const element = <Flexibox id={id} {...props}></Flexibox >
    dispatch({ type: 'ADD_BOX', id, element });
    return id;
  }

  const removeBox = (id: string): void => {
    const index = state.children?.findIndex((child) => ((child as ReactElement).props.id === id)) ?? -1;
    if (index >= 0) {
      dispatch({ type: 'REMOVE_BOX', id })
    }
  }

  // interactor functions that users of the hook call
  const Interactor = {
    addInteractionTarget,
    enableMove,
    enableResize,
    enableZoom,
    disableMove,
    disableResize,
    disableZoom,
    getExtents,
    keepInsideParentBounds,
    allowOutsideParentBounds,
    resetView,
    zoomIn,
    zoomMax,
    zoomMin,
    zoomOut,
    zoomTo,
    zoomToExtents,
    addBox,
    removeBox
  };

  return {
    state: {
      top: state.bounds?.top ?? 0,
      left: state.bounds?.left ?? 0,
      width: state.bounds?.width ?? 0,
      height: state.bounds?.height ?? 0,
      scale: state.scale ?? 1.0,
    },
    Interactor,
  };
};
