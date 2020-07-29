import React, { CSSProperties, PropsWithChildren } from 'react';
export interface FlexiboxContentProps {
  className?: string;
  style?: CSSProperties;
}

// Flexibox content wrapper
export const FlexiboxContent: React.FC<PropsWithChildren<FlexiboxContentProps>> = ({ className, style, children }) => {
  return (
    // <div className={"content" + (className ? ' ' + className : '')} style={gridContext.showGrid ? { backgroundColor: 'transparent' } : {}}>{children}</div>);
    <div className={"content " + (className ? className : '')} style={style}>{children}</div>);
};
