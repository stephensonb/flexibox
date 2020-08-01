// Basic Flexibox component definition - provides, snapping, resize and positioning capability
// See Flexibox.css for styling definitions
import React, { createContext, MutableRefObject, PropsWithChildren, useRef, useLayoutEffect, useContext, useEffect } from 'react';
import { FlexiboxProps, useFlexiboxInteractor } from './';
import './Flexibox.css';
import { FlexiboxContextState } from './FlexiboxContextState';

// Flexibox context - provide this elements' state to child elements
export const FlexiboxContext = createContext<FlexiboxContextState>({});

// Flexibox component
export const Flexibox: React.FC<PropsWithChildren<FlexiboxProps>> = ({
  minScale = 0.3,
  maxScale = 100,
  scale = 1.0,
  zoomable = false,
  pannable = false,
  gridX = 15.0,
  gridY = 15.0,
  snapToGrid = false,
  showGrid = false,
  zoomStep = 0.1,
  minHeight = 50,
  minWidth = 50,
  ...props
}) => {

  // DOM element reference - realized during render
  const componentRef: MutableRefObject<HTMLDivElement | null> = useRef(null);

  // Custom hook to handle all user interaction with the base flexibox
  const { state, dispatch } = useFlexiboxInteractor({
    minScale,
    maxScale,
    scale,
    zoomable,
    pannable,
    gridX,
    gridY,
    snapToGrid,
    showGrid,
    zoomStep,
    minHeight,
    minWidth,
    ...props
  });

  const context = useContext(FlexiboxContext);

  useLayoutEffect(() => {
    if (componentRef.current) {
      dispatch({ type: 'SET_ELEMENT_REF', ref: componentRef.current as HTMLDivElement });
    }
  }, [dispatch]);

  // Scale the contents of a zoomable element prior to committing render.
  // Triggered when the element is re - rendered or the zoomable or scale state changes.
  useLayoutEffect(() => {
    if (state.zoomable && state.scale && state.contentDivRef && state.clipDivRef) {
      // Save the current scroll position prior to re-scaling the content div
      const saveScrollX = state.clipDivRef?.scrollLeft;
      const saveScrollY = state.clipDivRef?.scrollTop;
      const cssText = `background-size: ${gridX}px ${gridY}px; `;
      // if ((state.scale ?? 1) < 1) {
      //   state.contentDivRef.style.cssText = cssText + `transform-origin: 0px 0px; width: ${100 / state.scale}%; height: ${100 / state.scale}%; transform: scale(${state.scale}) translate(0px, 0px);`;
      // } else {
      state.contentDivRef.style.cssText = cssText + `transform-origin: 0px 0px; width: 100%; height: 100%; transform: scale(${state.scale});`;
      // }
      // Re-apply the scroll position after scaling
      state.clipDivRef.scrollTo(saveScrollX, saveScrollY);
    }
  }, [state.zoomable, state.scale, state.clipDivRef, state.contentDivRef])

  // Adjust size of select box if displayed and the coords changes
  useLayoutEffect(() => {
    if (componentRef.current && state.selectBoxBounds) {
      const clipDiv = componentRef.current.querySelector("div.clip-content") as HTMLElement;
      const selectBoxDiv = clipDiv.querySelector("div.selectBox") as HTMLElement;
      selectBoxDiv.style.left = state.selectBoxBounds.left + 'px';
      selectBoxDiv.style.top = state.selectBoxBounds.top + 'px';
      selectBoxDiv.style.width = state.selectBoxBounds.width + 'px';
      selectBoxDiv.style.height = state.selectBoxBounds.height + 'px';
    }
  }, [state.selectBoxBounds])

  // Conditionally wrap a child element that can zoom or snap to grid it's contents with a context
  const getChildren = () => {
    if (snapToGrid || zoomable) {
      return <FlexiboxContext.Provider value={{
        snapToGrid,
        gridX,
        gridY,
        containerScale: (state.scale ?? 1) * (context.containerScale ?? 1),
        providerId: componentRef.current?.id
      }}>{props.children}</FlexiboxContext.Provider >
    } else {
      return props.children;
    }
  }

  // Builds the main content of the component
  return (
    <div
      id={props.id}
      ref={componentRef}
      className={'flexibox'}
      style={{
        top: `${state.elementBounds?.y ?? props.y ?? '0'}px`,
        left: `${state.elementBounds?.x ?? props.x ?? '0'}px`,
        height: `${state.elementBounds?.height ?? props.height}px`,
        width: `${state.elementBounds?.width ?? props.height}px`,
      }
      }>

      {/* If resizeable, render adornments for resizing */}
      {props.resizeable ? <>
        <div className={'adornment draggable'} />
        <div className={'adornment resizeable sw'} />
        <div className={'adornment resizeable ne'} />
        <div className={'adornment resizeable se'} />
      </> : ''}

      {/* If draggable, render adornments for dragging */}
      {props.draggable ? <div className='adornment resizeable nw' /> : ''}

      {/* container to clip contents if it is zoomed or panned */}
      <div className={'clip-content'}>
        {/* content container for the flexibox */}
        <div className={'content ' + (showGrid ? 'grid ' : '') + (props.className || '')}
          style={{
            backgroundSize: `${gridX * (state.scale ?? 1)}px ${gridY * (state.scale ?? 1)}px`
          }}
        >
          {/* div for showing the select box if selecting a group of elements */}
          {state.selectBoxBounds ? <div className='selectBox' /> : ''}
          {getChildren()}
        </div >
      </div >
    </div >
  );
};
