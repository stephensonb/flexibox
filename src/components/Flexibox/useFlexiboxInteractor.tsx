import { MutableRefObject, useContext, useLayoutEffect, useReducer, useRef } from 'react';
import { isArray } from 'util';
import { FlexiboxContext, FlexiboxInteractorReducer, MouseButtons } from './';
import { FlexiboxInteractorState } from './FlexiboxInteractorState';
import { FlexiboxProps } from './FlexiboxProps';

// local global variable that indicates if an interaction is occuring with any flexibox element
let isAnimating = false;

export type FlexiboxInteractionTypes = 'pan' | 'drag' | 'resize' | 'select';

export interface FlexiboxInteractionTarget {
  interactionType: FlexiboxInteractionTypes;
  selector: string[] | string;
  buttonState: MouseButtons;
}

// Component definition
export const useFlexiboxInteractor = (props: FlexiboxProps) => {

  // get the context provider for enclosing container (or null if no enclosing container present)
  const context = useContext(FlexiboxContext);

  // Reducer does the heavy lifting - it executes the actions that mutate the element's state
  let [state, dispatch] = useReducer(FlexiboxInteractorReducer, { ...props });

  // mutable reference for the local interactor state
  const reducerState: MutableRefObject<FlexiboxInteractorState> = useRef({});

  reducerState.current = state;

  useLayoutEffect(() => {
    dispatch({ type: 'SET_CONTAINER_SCALE', scale: context.containerScale ?? 1 });
    dispatch({ type: 'SET_GRID_XY', gridX: context.gridX ?? 1, gridY: context.gridY ?? 1 });
    dispatch({ type: 'SET_GRID_SNAP', snapToGrid: context.snapToGrid ?? false });
  }, [context]);

  // Update reducer state if DOM element reference changes
  useLayoutEffect(() => {
    if (reducerState.current.elementRef) {

      const currentRef = reducerState.current.elementRef;

      // Add interaction targets

      // add select box target to content div
      dispatch({ type: 'ADD_TARGET', interactionTarget: { selector: '.clip-content', interactionType: 'select', buttonState: MouseButtons.LeftButton + MouseButtons.shiftKey } });

      // add contents panning target to scrollable clip-contents div
      if (reducerState.current.pannable) {
        dispatch({ type: 'ADD_TARGET', interactionTarget: { selector: '.clip-content', interactionType: 'pan', buttonState: MouseButtons.LeftButton } });
      }

      // add element dragging target
      if (reducerState.current.draggable) {
        dispatch({ type: 'ADD_TARGET', interactionTarget: { selector: '.draggable', interactionType: 'drag', buttonState: MouseButtons.LeftButton } });
      }

      // add element resizing targets
      if (reducerState.current.resizeable) {
        dispatch({ type: 'ADD_TARGET', interactionTarget: { selector: '.resizeable.nw', interactionType: 'resize', buttonState: MouseButtons.LeftButton } });
        dispatch({ type: 'ADD_TARGET', interactionTarget: { selector: '.resizeable.sw', interactionType: 'resize', buttonState: MouseButtons.LeftButton } });
        dispatch({ type: 'ADD_TARGET', interactionTarget: { selector: '.resizeable.ne', interactionType: 'resize', buttonState: MouseButtons.LeftButton } });
        dispatch({ type: 'ADD_TARGET', interactionTarget: { selector: '.resizeable.se', interactionType: 'resize', buttonState: MouseButtons.LeftButton } });
      }

      // Add events
      currentRef?.addEventListener('mousedown', mouseDown);
      currentRef?.addEventListener('mouseenter', mouseEnter);
      currentRef?.addEventListener('mouseleave', mouseLeave);

      // If interactor element is zoomable, add the wheel events
      if (reducerState.current.zoomable) {
        // Add the wheel event listener to the interactor element
        currentRef?.addEventListener('wheel', wheelHandler);
      }

      // on initial display of component, hide any control adornments
      hideAdornments();

      // cleanup code - remove events from the current element if it is being unmounted
      return () => {
        currentRef?.removeEventListener('mousedown', mouseDown);
        currentRef?.removeEventListener('mouseenter', mouseEnter);
        currentRef?.removeEventListener('mouseleave', mouseLeave);
        // document.removeEventListener('wheel', wheelHandler);
        currentRef?.removeEventListener('wheel', wheelHandler);
      };
    }
  }, [reducerState.current.elementRef, reducerState.current.draggable, reducerState.current.pannable, reducerState.current.zoomable, reducerState.current.resizeable]);

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
  const findInteractionTargetForEvent = (event: Event, buttonState: MouseButtons) => {
    const listener = event.currentTarget as HTMLElement;
    let dispatcher = event.target as HTMLElement;

    // If the event dispatcher was the content div of the box then reset the dispatcher to the containing div ('clip-content')
    if (dispatcher.classList.contains('content')) {
      dispatcher = dispatcher.parentElement as HTMLElement;
    }

    let target: FlexiboxInteractionTarget | null = null;

    // See if the element that dispatched the event is an interaction target -- we only look for interaction targets within the
    // element that the event is attached to(the listener)
    if (dispatcher.parentElement === listener) {
      if (reducerState.current.interactionTargets) {
        for (let i = 0; i < reducerState.current.interactionTargets.length && target === null; i++) {
          // Only check targets with a matching button state (combo of mouse buttons + shift/ctrl/alt keys)
          if (reducerState.current.interactionTargets[i].buttonState === buttonState) {
            const elements: NodeListOf<Element>[] = [];
            const selector = reducerState.current.interactionTargets[i].selector;
            // handle a single selector definition
            if (typeof selector === 'string') {
              // Accumulate a list of all elements matching the selector for this interaction target
              elements.push(queryScopedSelectorAll(listener, selector as string));
            } else
              // handle an array of selector definitions
              if (isArray(selector)) {
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
                  target = reducerState.current.interactionTargets[i];
                }
              }
            }
          }
        }
      }
    }
    return target;
  };

  const getMousePositionOffset = (e: MouseEvent, relativeToElement: HTMLElement | undefined | null) => {
    if (relativeToElement) {
      // Calculate the starting mouse position offset
      // get the aggregate scale to calculate offsetX and offsetY position (mouse position relative to top,left of element)
      const agScale = (reducerState.current.scale ?? 1) * (reducerState.current.containerScale ?? 1);
      // get the bounding rectangle of the element
      const containerBounds = relativeToElement.getBoundingClientRect();
      return { x: (e.clientX - containerBounds.left) / agScale, y: (e.clientY - containerBounds.top) / agScale }
    }

    return { x: 0, y: 0 }
  }

  const beginMouseInteraction = (e: MouseEvent, interactionTarget: FlexiboxInteractionTarget) => {
    // Get the DOM element clicked on 
    const listener = e.currentTarget as HTMLElement;

    // Set the initial bounds to the bounds of the current DOM element being interacted with.
    let interactingElementBounds = new DOMRect(listener.offsetLeft, listener.offsetTop, listener.offsetWidth, listener.offsetHeight);

    isAnimating = true;

    let position = getMousePositionOffset(e, listener.parentElement);

    switch (interactionTarget.interactionType) {
      case 'drag':
        listener.style.cursor = 'grabbing';
        break;
      case 'pan':
        position = getMousePositionOffset(e, listener);
        listener.style.cursor = 'grabbing';
        break;
      case 'resize':
        break;
      case 'select':
        position = getMousePositionOffset(e, listener);
        interactingElementBounds = new DOMRect(position.x, position.y, 0, 0);
        listener.style.cursor = 'copy'
        break;
      default:
        isAnimating = false;
        break;
    }

    if (isAnimating) {
      // Add event listeners for further interaction 
      document.addEventListener('mousemove', mouseMoved);
      document.addEventListener('mouseup', mouseUp);
      dispatch({
        type: 'BEGIN_MOUSE_INTERACTION',
        interactingElementBounds,
        activeInteractorTarget: interactionTarget,
        interactionStartMouseX: position.x,
        interactionStartMouseY: position.y
      });

      // Since we handled this event, stop any other listeners from receiving it.
      e.stopImmediatePropagation();

      // Prevent any default handling of this event by the target element.
      e.preventDefault();
    }
  }

  const handleClickEvent = (e: MouseEvent) => {
    const listener = e.currentTarget as HTMLElement;
    if (listener === reducerState.current.elementRef) {
      // OK, no interaction target was clicked, handle other cases.
      // right button clicked
      if (e.button === 0) {
        // shift key held down - add element to select group
        if (e.shiftKey) {
          selectElement(reducerState.current.elementRef);
          e.stopImmediatePropagation();
          e.preventDefault();
        } else if (e.ctrlKey) {
          // ctrl key held down - add/remove element from select group
          if (reducerState.current.elementRef.classList.contains('selected')) {
            reducerState.current.elementRef.classList.remove('selected');
          } else {
            reducerState.current.elementRef.classList.add('selected');
          }
          e.stopImmediatePropagation();
          e.preventDefault();
        } else {
          unSelectElements();
          selectElement(reducerState.current.elementRef);
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      }
    }
  }

  // Mouse down handler
  const mouseDown = (e: MouseEvent) => {
    // Set flags indicating button/key states initiating this action
    const buttonState = e.buttons + (e.shiftKey ? 32 : 0) + (e.ctrlKey ? 64 : 0) + (e.altKey ? 128 : 0);

    // try and find an interaction target in the current element that was clicked on
    let interactionTarget = findInteractionTargetForEvent(e, buttonState);

    // If the mouse down event happened over a valid interaction target element, then start interacting with it.
    if (interactionTarget) {
      beginMouseInteraction(e, interactionTarget);
    } else {
      handleClickEvent(e);
    }
  };

  // show adornments when mouse enters the element
  const mouseEnter = (e: MouseEvent) => {
    // only handle if we are not already interacting with this element
    if (!isAnimating) {
      const listener = e.currentTarget as HTMLElement;
      // If the element that fired this event is the interacting element, then show adornments when entering
      if (listener === reducerState.current.elementRef) {
        showAdornments();
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
      if (listener === reducerState.current.elementRef) {
        hideAdornments();
      }
    }
    e.preventDefault();
  };

  // Update element position when mouse is moved (resize, drag, ...)
  const mouseMoved = (e: MouseEvent) => {
    if (reducerState.current.elementRef) {
      switch (reducerState.current.activeInteractionTarget?.interactionType) {
        // drag box within parent
        case 'drag':
          dispatch({
            type: 'DRAG',
            // mouse position is relative to parent container element
            ...getMousePositionOffset(e, reducerState.current.elementRef.parentElement)
          });
          break;
        // resize the box
        case 'resize':
          dispatch({
            type: 'RESIZE',
            // mouse position is relative to parent container element
            ...getMousePositionOffset(e, reducerState.current.elementRef.parentElement)
          });
          break;
        // pan content view (if content scale > 1.0)
        case 'pan':
          dispatch({
            type: 'PAN',
            // mouse position is relative to current container element
            ...getMousePositionOffset(e, reducerState.current.elementRef)
          });
          break;
        case 'select':
          dispatch({
            type: 'RESIZE_SELECT_BOX',
            // mouse position is relative to current container element
            ...getMousePositionOffset(e, reducerState.current.elementRef)
          });
          // Update the group of elements enclosed by the select box
          selectElements(reducerState.current.selectBoxBounds);
          break;
      }
      e.preventDefault();
    }
  };

  // End element interaction
  const mouseUp = (e: MouseEvent) => {
    // only handle if we were animating before from a previous mouse down event
    if (isAnimating) {
      // remove mouse listeners
      document.removeEventListener('mousemove', mouseMoved);
      document.removeEventListener('mouseup', mouseUp);

      if (reducerState.current.elementRef) {
        // if we were not drawing a select box, then go ahead and select the current element that the mouse up event was
        // received on
        if (reducerState.current.activeInteractionTarget?.interactionType !== 'select') {
          unSelectElements();
          selectElement(reducerState.current.elementRef);
        }

        // If the mouse pointer is outside of the interacting element bounds when mouse is released, then
        // make sure to hide the adornments.
        if (!isInsideElement(e.clientX, e.clientY, reducerState.current.elementRef)) {
          hideAdornments();
        }

        // reset the cursor to the default
        reducerState.current.elementRef.style.cursor = 'default';
      }

      // Tell the reducer that mouse interaction has ended.
      dispatch({ type: 'END_MOUSE_INTERACTION' });

      isAnimating = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  // Scroll wheel events used to zoom element (change its scale)
  const wheelHandler = (e: MouseWheelEvent) => {
    const listener = e.currentTarget as HTMLElement;

    // only handle if the event target is the same as the element that this handler is
    // attached to (not bubbled up from another element) and it is zoomable.
    if (listener === reducerState.current.elementRef && reducerState.current.zoomable) {
      // if deltaY is negative (scroll wheel rotated toward user), zoom out (shrink).
      if (e.deltaY > 0) {
        dispatch({ type: 'ZOOM_OUT' });
      } else
        // deltaY is positive (mouse wheel rotated away from user), zoom in (magnify).
        if (e.deltaY < 0) {
          dispatch({ type: 'ZOOM_IN' });
        }
      // We stop immediate propogation to make sure no other zoomable elements respond to the 
      // wheel event as well and that the browser does not try to scroll when we want to zoom
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  // Adds a 'selected' class to the given element and sets the focus to it
  const selectElement = (element: HTMLElement) => {
    element.classList.add('selected');
    element.focus();
  }

  // Removes the 'selected' class from the current elementRef and sets the focus to it
  const unSelectElement = (element: HTMLElement) => {
    element.classList.remove('selected');
  }

  // Selects all child flexibox elements enclosed by a given bounding rectangle
  const selectElements = (bounds: DOMRect | undefined | null) => {
    if (reducerState.current.elementRef && bounds) {
      // get a list of all child elements with the class 'flexibox'
      reducerState.current.elementRef.querySelectorAll('.flexibox').forEach(element => {
        const el = element as HTMLElement;
        if (el.offsetLeft >= bounds.left &&
          el.offsetTop >= bounds.top &&
          (el.offsetLeft + el.offsetWidth) <= bounds.right &&
          (el.offsetTop + el.offsetHeight) <= bounds.bottom
        ) {
          // element bounds are within the select box, so add the selected class
          el.classList.add('selected');
        } else {
          // element bounds are outside of the select box, so the selected class (ignored if it was not selected before)
          el.classList.remove('selected');
        }
      });
    }
  }

  // Unselect all selected child flexibox elements 
  const unSelectElements = () => {
    if (reducerState.current.elementRef) {
      // get a list of all child elements with the class 'selected'
      document.querySelectorAll('.flexibox.selected').forEach(element => {
        element.classList.remove('selected');
      });
    }
  }

  // Determines if the given coordinates are within the bounds of the given element
  const isInsideElement = (x: number, y: number, element: HTMLElement): boolean => {
    const bounds = element.getBoundingClientRect();
    return (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom);
  }

  // Removes the 'hide-adornments' class from the interactor element.
  const showAdornments = () => {
    reducerState.current.elementRef?.classList.remove('hide-adornments');
  };

  // Adds the 'hide-adornments' class to the interactor element.
  const hideAdornments = () => {
    reducerState.current.elementRef?.classList.add('hide-adornments');
  };

  // interactor functions that users of the hook call
  return {
    state: {
      elementBounds: reducerState.current.elementBounds,
      zoomable: reducerState.current.zoomable,
      scale: reducerState.current.scale,
      selectBoxBounds: reducerState.current.selectBoxBounds,
      clipDivRef: reducerState.current.clipDivRef,
      contentDivRef: reducerState.current.contentDivRef
    },
    dispatch
  };
};
