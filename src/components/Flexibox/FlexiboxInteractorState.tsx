import { FlexiboxProps } from './FlexiboxProps';
import { FlexiboxInteractionTarget } from './useFlexiboxInteractor';

export interface FlexiboxInteractorState extends FlexiboxProps {
  /* Scaling applied to the enclosing container - this is an aggregate scale - it is the product of all of the scaling applied to all enclosing containers
  * in the hierarchy (e.g.):
  *
  *  <Flexibox scale=2.0>     <--- This element does not have an enclosing container, so containerScale defaults to 1.0
  *   <Flexibox scale=1.2>    <--- This element's containerScale from the context of the enclosing element = 2.0 --> (2.0)
  *     <Flexibox scale=0.3>  <--- This element's containerScale from the context of the enclosing element = 2.4 --> (2.0 * 1.2)
  *       <Flexibox>          <--- This element's containerScale from the context of the enclosing element = 0.72 --> (2.0 * 1.2 * 0.3)
  *       </Flexibox>
  *     </Flexibox>
  *   </Flexibox>
  *  </Flexibox>
  * 
  **/
  containerScale?: number;
  elementBounds?: DOMRect;
  elementRef?: HTMLDivElement | null;
  interactingElementBounds?: DOMRect | null;
  interactionTargets?: FlexiboxInteractionTarget[];
  activeInteractionTarget?: FlexiboxInteractionTarget | null;
  startX?: number;
  startY?: number;
  selectBoxBounds?: DOMRect | null;
  clipDivRef?: HTMLDivElement;
  contentDivRef?: HTMLDivElement;
}
