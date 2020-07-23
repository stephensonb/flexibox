import React, { useEffect, useRef, useState } from 'react';
import { Flexibox, useFlexiboxInteractor, FlexiboxProps } from './components/Flexibox';
import './App.css';
import { v4 as uuid } from 'uuid';

function App() {
  const rootRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const [elRef, setElRef] = useState({} as React.MutableRefObject<HTMLDivElement | null>);
  const { state, Interactor } = useFlexiboxInteractor(elRef.current, {});

  useEffect(() => {
    setElRef(rootRef);
    console.log(rootRef);
  }, [elRef]);

  interface FluidityNode {
    props: FlexiboxProps;
    parentId: string;
    content: string;
    children: FluidityNode[];
  }

  interface FluidityGraph {
    rootProps: FlexiboxProps;
    children: FluidityNode[];
  }

  const Fluidity: FluidityGraph = {
    rootProps: { id: uuid(), canZoom: false, constrainToParentBounds: true, canPosition: false, canResize: false, useGrid: true, showGrid: false, gridX: 15, gridY: 15, snapToGrid: true, className: "diagram" },
    children: []
  }

  const rootNode: FluidityNode = {
    props: { id: uuid(), x: 100, y: 100, width: 800, height: 800, constrainToParentBounds: false, canPosition: true, canResize: true, useGrid: true, showGrid: true, gridX: 5, gridY: 5, snapToGrid: true },
    parentId: Fluidity.rootProps.id ?? '',
    content: '',
    children: []
  };

  // create 5 boxes
  for (let i = 0; i < 5; i++) {
    rootNode.children.push({
      props: { id: uuid(), constrainToParentBounds: true, canPosition: true, canResize: true, width: 200, height: 200, x: i * 50, y: i * 50 },
      parentId: rootNode.props.id ?? '',
      content: `This is box number ${i} content.`,
      children: []
    })
  }

  Fluidity.children.push(rootNode);

  const renderNode = (node: FluidityNode): JSX.Element => {
    return <Flexibox key={node.props.id}{...node.props}>
      {React.createElement('div', null, node.content)}
      {/* Render child nodes if they exist */}
      {(() => {
        if (node.children.length > 0) {
          return node.children.map(childNode => renderNode(childNode));
        }
      })()}
    </Flexibox>
  }

  return (
    <div className="App">
      <header className="App-header">
        <Flexibox {...Fluidity.rootProps}>
          {(() => {
            if (Fluidity.children.length > 0) {
              return Fluidity.children.map(childNode => renderNode(childNode));
            }
          })()}
        </Flexibox>
      </header>
    </div>
  );
}

export default App;
