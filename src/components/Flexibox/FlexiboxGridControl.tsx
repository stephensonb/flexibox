import React from 'react';
import { v4 as uuid, v4 } from 'uuid';

export interface FlexiboxGridState {
  id?: string;
  useGrid?: boolean;
  gridX?: number;
  gridY?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  setState?: React.Dispatch<React.SetStateAction<FlexiboxGridState>>;
}

export const FlexiboxGridContext = React.createContext<FlexiboxGridState>({});

export const FlexiboxGridControl: React.FC<FlexiboxGridState> = (props) => {
  const [gridState, setGridState] = React.useState<FlexiboxGridState>({});

  React.useEffect(() => {
    setGridState({
      gridX: props.gridX ?? 5.0,
      gridY: props.gridY ?? 5.0,
      useGrid: props.useGrid ?? false,
      showGrid: props.showGrid ?? false,
      snapToGrid: props.snapToGrid ?? false,
      id: v4()
    });
  }, []);

  // if (props.useGrid) {
  return (
    <FlexiboxGridContext.Provider value={{ ...gridState, setState: setGridState }}>
      {props.children}
    </FlexiboxGridContext.Provider>
  );
  // } else {
  //   return <React.Fragment>{props.children}</React.Fragment>;
  // }
};
