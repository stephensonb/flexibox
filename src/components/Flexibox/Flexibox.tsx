// Basic Flexibox component definition - provides, snapping, resize and positioning capability
// See Flexibox.css for styling definitions
import React, { PropsWithChildren, useEffect, useRef, useState, createContext, ReactNode, ReactElement } from 'react';
import {
  useFlexiboxInteractor,
  FlexiboxProps,
  FlexiboxState
} from './';
import './Flexibox.css';
import { FlexiboxContextState } from './FlexiboxContextState';

// Flexibox context - provide this elements' state to child elements
export const FlexiboxContext = createContext<FlexiboxContextState>({});

// Flexibox component
export const Flexibox: React.FC<PropsWithChildren<FlexiboxProps>> = (props) => {

  // Set default values for some optional props.
  props = {
    ...props,
    minScale: props.minScale ?? 0.1,
    maxScale: props.maxScale ?? 100,
    scale: props.scale ?? 1.0,
    zoomable: props.zoomable ?? false,
    pannable: props.pannable ?? props.zoomable ?? false,
    gridX: props.gridX ?? 15.0,
    gridY: props.gridY ?? 15.0,
    snapToGrid: props.snapToGrid ?? false,
    showGrid: props.showGrid ?? false,
    zoomStep: props.zoomStep ?? 0.1
  }

  // DOM element reference - realized during render
  const thisRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  // Perform initialization whenever we re-render to the DOM and the DOM element reference changes
  const [elRef, setElRef] = useState({} as React.MutableRefObject<HTMLDivElement | null>);

  const [context, setContext] = useState({} as FlexiboxContextState);

  // Custom hook to handle all user interaction with the flexibox
  const { state, Interactor } = useFlexiboxInteractor(elRef?.current, props);

  // Perform initialization whenever we re-render to the DOM and the DOM element reference changes
  useEffect(() => {
    // Set the reference to the rendered element in the DOM
    if (thisRef) {
      setElRef(thisRef);
    }
    // add interaction elements only if flexibox element has been rendered.
    if (elRef.current && elRef.current !== state.elementRef) {
      Interactor.addInteractionTarget({ selector: '.clip-content > .content', interactionType: 'pan' });
      Interactor.addInteractionTarget({ selector: '.draggable', interactionType: 'drag' });
      Interactor.addInteractionTarget({ selector: '.resizeable.nw', interactionType: 'resize-nw' });
      Interactor.addInteractionTarget({ selector: '.resizeable.sw', interactionType: 'resize-sw' });
      Interactor.addInteractionTarget({ selector: '.resizeable.ne', interactionType: 'resize-ne' });
      Interactor.addInteractionTarget({ selector: '.resizeable.se', interactionType: 'resize-se' });

      setContext({
        snapToGrid: props.snapToGrid ?? false,
        gridX: props.gridX ?? 15,
        gridY: props.gridY ?? 15,
        scale: state.scale ?? props.scale ?? 1.0,
        providerId: props.id ?? ''
      })
    }
  }, [elRef, Interactor, state.elementRef, props.snapToGrid, props.zoomable, props.gridX, props.gridY, props.scale, state.scale, state.zoomable]);

  // Update the context if the scale for child elements is changed 
  useEffect(() => {
    console.log('changing scale: ' + state.scale)
    setContext({
      ...context,
      scale: state.scale
    })
  }, [state.scale]);

  const getChildren = () => {
    if (props.snapToGrid || props.zoomable) {
      return <FlexiboxContext.Provider value={context}>{props.children}</FlexiboxContext.Provider>
    } else {
      return props.children;
    }
  }

  const computeContentStyle = () => {
    let width: string = '';
    let height: string = '';
    let transformOrigin: string;
    let translate: string;
    // width = state.scale ? `calc(100% / ${state.scale < 1 ? state.scale : 1})` : '';
    // height = state.scale ? `calc(100% / ${state.scale < 1 ? state.scale : 1})` : '';
    transformOrigin = state.contentOrigin ? `${state.contentOrigin.x}px ${state.contentOrigin.y}px` : '0px 0px';
    translate = state.contentOrigin ? `translate(${state.contentOrigin.x}px, ${state.contentOrigin.y}px)` : 'translate(0px, 0px)';
    return {
      width,
      height,
      transformOrigin,
      transform: state.scale ? `scale(${state.scale}) ${translate}` : 'scale(1) translate(0px, 0px)'
    }

  }

  // Builds the main content of the component
  return (
    <div
      id={props.id}
      ref={thisRef}
      className={'flexibox ' + (props.showGrid ? 'grid' : '')}
      style={{
        top: state.bounds?.top ? `${state.bounds.y} px` : '',
        left: state.bounds?.left ? `${state.bounds.x} px` : '',
        height: state.bounds?.height ? `${state.bounds.height} px` : '100%',
        width: state.bounds?.width ? `${state.bounds.width} px` : '100%',
        backgroundSize: `${props.gridX} px ${props.gridY} px`,
      }
      }>
      <div className={'adornment draggable'} />
      <div className={'adornment resizeable sw'} />
      <div className={'adornment resizeable ne'} />
      <div className={'adornment resizeable se'} />
      {props.draggable ? <div className='adornment resizeable nw' /> : ''}
      <div className={'clip-content'}>
        <div
          className={'content ' + (props.className || '')}
          style={{ ...computeContentStyle() }}
        >
          {getChildren()}
        </div >
      </div >
    </div >
  );
};
