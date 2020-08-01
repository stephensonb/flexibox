export interface FlexiboxState {
    draggable?: boolean;
    resizeable?: boolean;
    constrainToParent?: boolean;
    // Size and position
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    // Grid props
    snapToGrid?: boolean;
    showGrid?: boolean;
    gridX?: number;
    gridY?: number;
    // Zoom props
    scale?: number;
    zoomable?: boolean;
    zoomStep?: number;
    maxZoom?: number;
    minZoom?: number;
    minScale?: number;
    maxScale?: number;
    // Pan contents (if zoomable)
    pannable?: boolean;
}

