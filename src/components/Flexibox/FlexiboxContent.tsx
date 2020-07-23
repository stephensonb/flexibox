import React, { PropsWithChildren, useContext, Fragment, CSSProperties } from 'react';
import { FlexiboxGridContext } from './';
export interface FlexiboxContentProps {
  className?: string;
  style?: CSSProperties;
}

// Flexibox content wrapper
export const FlexiboxContent: React.FC<PropsWithChildren<FlexiboxContentProps>> = ({ className, style, children }) => {
  const gridContext = useContext(FlexiboxGridContext);
  return (
    // <div className={"content" + (className ? ' ' + className : '')} style={gridContext.showGrid ? { backgroundColor: 'transparent' } : {}}>{children}</div>);
    <div className={"content " + (className ? className : '')} style={style}>{children}</div>);
};
