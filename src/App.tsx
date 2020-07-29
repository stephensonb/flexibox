import React from 'react';
import { v4 as uuid } from 'uuid';
import './App.css';
import { Flexibox, FlexiboxProps } from './components/Flexibox';

function App() {
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
    rootProps: { id: uuid(), zoomable: true, constrainToParent: true, draggable: false, resizeable: false, showGrid: false, gridX: 15, gridY: 15, snapToGrid: true, className: "diagram" },
    children: []
  }

  const rootNode: FluidityNode = {
    props: { id: uuid(), x: 100, y: 100, width: 800, height: 800, zoomable: true, constrainToParent: true, resizeable: true, draggable: true, showGrid: true, gridX: 5, gridY: 5, snapToGrid: true },
    parentId: Fluidity.rootProps.id ?? '',
    content: '',
    children: []
  };

  // create 5 boxes
  for (let i = 0; i < 5; i++) {
    rootNode.children.push({
      props: { id: uuid(), constrainToParent: true, draggable: true, resizeable: true, width: 200, height: 200, x: i * 50, y: i * 50 },
      parentId: rootNode.props.id ?? '',
      content: `This is box number ${i} content.`,
      children: []
    })
  }

  Fluidity.children.push(rootNode);

  const renderNode = (node: FluidityNode): JSX.Element => {
    return <Flexibox key={node.props.id}{...node.props}>
      <div>{node.content}</div>
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
        <Flexibox key={Fluidity.rootProps.id}{...Fluidity.rootProps}>
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
