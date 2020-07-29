import { CSSProperties } from 'react';
import { FlexiboxState } from './';

export interface FlexiboxProps extends FlexiboxState {
  id?: string;
  style?: CSSProperties;
  className?: string;
  // Events
  onZoom?: (scale: number) => void;
  onDrag?: (position: Position) => void;
  onResize?: (bounds: DOMRect) => void;
  onDrop?: (data: string) => void;
}