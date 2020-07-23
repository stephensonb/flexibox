import React from 'react';

export interface FlexiboxZoomState {
  canZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  scale?: number;
  zoomIn?: () => void;
  setState?: React.Dispatch<React.SetStateAction<FlexiboxZoomState>>;
}

export const FlexiboxZoomContext = React.createContext<FlexiboxZoomState>({});

export const FlexiboxZoomControl: React.FC<FlexiboxZoomState> = (props) => {
  const [zoomState, setZoomState] = React.useState<FlexiboxZoomState>({});
  // update the state values for the context if they change
  React.useEffect(() => {
    setZoomState({
      canZoom: props.canZoom ?? false,
      minZoom: props.minZoom ?? 0.1,
      maxZoom: props.maxZoom ?? 1.9,
      scale: 1.0,
      zoomStep: props.zoomStep ?? 0.1,
    });
  }, []);

  if (props.canZoom) {
    return (
      <FlexiboxZoomContext.Provider value={{ ...zoomState, setState: setZoomState }}>
        {props.children}
      </FlexiboxZoomContext.Provider>
    );
  } else {
    return <React.Fragment>{props.children}</React.Fragment>;
  }
};
