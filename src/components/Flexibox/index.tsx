export * from './Flexibox';
export * from './FlexiboxState';
export * from './FlexiboxInteractorActions';
export * from './FlexiboxInteractorReducer';
export * from './FlexiboxInteractorState';
export * from './FlexiboxProps';
export * from './useFlexiboxInteractor';


export enum MouseButtons {
    NoButton = 0,
    LeftButton = 1,
    MiddleButton = 2,
    RightButton = 4,
    BackButton = 8,
    ForwardButton = 16,
    shiftKey = 32,
    ctrlKey = 64,
    altKey = 128
}

export type Position2D = {
    x: number;
    y: number;
}