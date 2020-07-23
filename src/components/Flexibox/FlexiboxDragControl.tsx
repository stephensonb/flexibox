import React from 'react';

export interface FlexiboxDragControlProps {
  canPosition?: boolean;
}

// Flexibox drag control component
export const FlexiboxDragControl: React.FC<FlexiboxDragControlProps> = ({ children, canPosition = false }) => {
  if (canPosition) {
    return (
      <React.Fragment>
        <div className="adornment drag"></div>
        {children}
      </React.Fragment>
    );
  } else {
    return <React.Fragment>{children}</React.Fragment>;
  }
};
