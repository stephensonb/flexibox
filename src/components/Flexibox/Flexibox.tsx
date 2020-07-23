// Basic Flexibox component definitio - provides, snapping, resize and positioning capability
// See Flexibox.css for styling definitions
import React, { PropsWithChildren, useEffect, useRef, useState, useContext } from 'react';
import {
  useFlexiboxInteractor,
  FlexiboxProps,
  FlexiboxZoomContext,
  FlexiboxGridContext,
  FlexiboxDragControl,
  FlexiboxResizeControl,
  FlexiboxContent,
  FlexiboxZoomControl,
  FlexiboxGridControl,
} from './';
import './Flexibox.css';

// Flexibox component
export const Flexibox: React.FC<PropsWithChildren<FlexiboxProps>> = (props) => {
  const thisRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const [elRef, setElRef] = useState({} as React.MutableRefObject<HTMLDivElement | null>);
  const { state, Interactor } = useFlexiboxInteractor(elRef?.current, props);
  const zoomContext = useContext(FlexiboxZoomContext);
  const gridContext = useContext(FlexiboxGridContext);

  // Perform initialization whenever we re-render to the DOM and the DOM element reference changes
  useEffect(() => {
    // Set the reference to the rendered element in the DOM
    if (thisRef) {
      setElRef(thisRef);
    }
    if (elRef.current) {
      // add the interaction targets for dragging and resizing the box
      Interactor.addInteractionTarget({ selector: '.adornment.drag', interactionType: 'drag' });
      Interactor.addInteractionTarget({ selector: '.adornment.resize.nw', interactionType: 'resize-nw' });
      Interactor.addInteractionTarget({ selector: '.adornment.resize.sw', interactionType: 'resize-sw' });
      Interactor.addInteractionTarget({ selector: '.adornment.resize.ne', interactionType: 'resize-ne' });
      Interactor.addInteractionTarget({ selector: '.adornment.resize.se', interactionType: 'resize-se' });
      console.log(
        'Element ID: ' +
        elRef.current.id +
        '  ZoomContext: ' +
        (zoomContext.setState !== undefined) +
        ' GridContext: ' +
        (gridContext.setState !== undefined) +
        ' style:' +
        props?.style
      );
    }
  }, [elRef]);

  // Builds the main content of the component
  return (
    <FlexiboxZoomControl
      canZoom={props.canZoom}
      minZoom={props.minScale}
      maxZoom={props.maxScale}
      zoomStep={props.zoomStep}>
      <FlexiboxGridControl
        useGrid={props.useGrid}
        showGrid={props.showGrid}
        gridX={props.gridX}
        gridY={props.gridY}
        snapToGrid={props.snapToGrid}>
        {/* COMPONENT DIV DEFINITION */}
        <div
          id={props.id}
          ref={thisRef}
          className={'flexibox'}
          style={{
            top: state.top ? `${state.top}px` : '',
            left: state.left ? `${state.left}px` : '',
            height: state.height ? `${state.height}px` : '100%',
            width: state.width ? `${state.width}px` : '100%',
            transform: props.canZoom ? `scale(${state.scale})` : '',
          }}>
          <FlexiboxDragControl canPosition={props.canPosition}>
            <FlexiboxResizeControl canResize={props.canResize}>
            </FlexiboxResizeControl>
          </FlexiboxDragControl>
          {/* INTERACTION CONTROLS */}
          <FlexiboxContent className={(props.className || '') + ' ' + (props.useGrid && props.showGrid ? 'grid' : '')} style={{
            backgroundSize: `${props.gridX!}px ${props.gridY!}px`,
          }}>{props.children}</FlexiboxContent>
        </div>
      </FlexiboxGridControl>
    </FlexiboxZoomControl >
  );
};
