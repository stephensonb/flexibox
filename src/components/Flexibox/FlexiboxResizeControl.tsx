import React from 'react';

export interface FlexiboxResizeControlProps {
  canResize?: boolean;
}

// Flexibox resize control component
export const FlexiboxResizeControl: React.FC<FlexiboxResizeControlProps> = ({ children, canResize = false }) => {
  if (canResize) {
    return (
      <React.Fragment>
        <div className="adornment resize nw"></div>
        <div className="adornment resize sw"></div>
        <div className="adornment resize ne"></div>
        <div className="adornment resize se"></div>
        {children}
      </React.Fragment>
    );
  } else {
    return <React.Fragment>{children}</React.Fragment>;
  }
};
