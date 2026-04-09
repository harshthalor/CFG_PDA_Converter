/**
 * DerivationTreeView - Renders a CFG derivation tree
 * 
 * Displays the tree structure of a derivation using a simple
 * recursive layout. Variables are shown in boxes, terminals as leaves.
 */

import type { DerivationNode } from '../../types';

interface DerivationTreeViewProps {
  tree: DerivationNode;
}

export function DerivationTreeView({ tree }: DerivationTreeViewProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex justify-center min-w-max">
        <TreeNode node={tree} />
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: DerivationNode;
}

function TreeNode({ node }: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  
  return (
    <div className="flex flex-col items-center">
      {/* Node itself */}
      <div
        className={`
          px-2 py-1 rounded text-sm font-mono
          ${node.isTerminal 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
            : 'bg-purple-100 text-purple-800 border border-purple-300'}
          ${node.symbol === 'ε' ? 'italic text-gray-500' : ''}
        `}
        title={node.ruleUsed ? `Rule: ${node.ruleUsed.variable} → ${node.ruleUsed.production}` : undefined}
      >
        {node.symbol}
      </div>
      
      {/* Children */}
      {hasChildren && (
        <>
          {/* Connector line down */}
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* Horizontal line across all children */}
          {node.children.length > 1 && (
            <div className="flex items-start">
              <div 
                className="h-px bg-gray-300" 
                style={{ width: `${(node.children.length - 1) * 3}rem` }}
              ></div>
            </div>
          )}
          
          {/* Children nodes */}
          <div className="flex gap-4">
            {node.children.map((child, idx) => (
              <div key={child.id || idx} className="flex flex-col items-center">
                {node.children.length > 1 && (
                  <div className="w-px h-4 bg-gray-300"></div>
                )}
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
