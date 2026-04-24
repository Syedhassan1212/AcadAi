'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Node {
  id: string;
  title: string;
  topic: string;
  mastery: number;
  completion: number;
}

interface Edge {
  from_subtopic_id: string;
  to_subtopic_id: string;
}

interface KnowledgeGraphProps {
  subjectId: string;
  data: {
    nodes: Node[];
    edges: Edge[];
  };
}

export default function KnowledgeGraph({ subjectId, data }: KnowledgeGraphProps) {
  const router = useRouter();
  const { nodes, edges } = data;

  const layout = useMemo(() => {
    if (nodes.length === 0) return { positionedNodes: [], edgePaths: [] };

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(n => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    edges.forEach(e => {
      if (adj.has(e.from_subtopic_id)) {
        adj.get(e.from_subtopic_id)?.push(e.to_subtopic_id);
        inDegree.set(e.to_subtopic_id, (inDegree.get(e.to_subtopic_id) || 0) + 1);
      }
    });

    // Layered layout
    const layers: string[][] = [];
    let remaining = new Set(nodes.map(n => n.id));

    while (remaining.size > 0) {
      const currentLayer = Array.from(remaining).filter(id => {
        const deps = edges.filter(e => e.to_subtopic_id === id);
        return deps.every(e => !remaining.has(e.from_subtopic_id));
      });

      if (currentLayer.length === 0) {
        // Handle cycles or disconnected nodes
        layers.push(Array.from(remaining));
        break;
      }

      layers.push(currentLayer);
      currentLayer.forEach(id => remaining.delete(id));
    }

    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 600;
    const PADDING = 100;

    const positionedNodes = layers.flatMap((layer, lIdx) => {
      const y = PADDING + (lIdx * (SVG_HEIGHT - 2 * PADDING)) / Math.max(1, layers.length - 1);
      return layer.map((id, nIdx) => {
        const x = PADDING + (nIdx + 1) * (SVG_WIDTH - 2 * PADDING) / (layer.length + 1);
        return { ...nodeMap.get(id)!, x, y };
      });
    });

    const posMap = new Map(positionedNodes.map(n => [n.id, n]));
    const edgePaths = edges.filter(e => posMap.has(e.from_subtopic_id) && posMap.has(e.to_subtopic_id)).map(e => {
      const from = posMap.get(e.from_subtopic_id)!;
      const to = posMap.get(e.to_subtopic_id)!;
      return { from, to };
    });

    return { positionedNodes, edgePaths };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant/40">
        <span className="material-symbols-outlined text-6xl mb-4">hub</span>
        <p className="text-sm font-medium">Upload material to generate your knowledge graph</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 overflow-auto scrollbar-hide">
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-full min-w-[800px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="16"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-outline-variant)" opacity="0.5" />
          </marker>
        </defs>

        {/* Edges */}
        {layout.edgePaths.map((path, i) => (
          <path
            key={`edge-${i}`}
            d={`M ${path.from.x} ${path.from.y} C ${path.from.x} ${(path.from.y + path.to.y)/2}, ${path.to.x} ${(path.from.y + path.to.y)/2}, ${path.to.x} ${path.to.y}`}
            fill="none"
            stroke="var(--color-outline-variant)"
            strokeWidth="1.5"
            strokeOpacity="0.3"
            markerEnd="url(#arrowhead)"
          />
        ))}

        {/* Nodes */}
        {layout.positionedNodes.map((node) => {
          const isMastered = node.mastery >= 80;
          const isLearning = node.mastery < 80 && node.mastery > 0;
          
          return (
            <g 
              key={node.id} 
              className="group cursor-pointer"
              onClick={() => router.push(`/subjects/${subjectId}/subtopics/${node.id}`)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r="10"
                className={`transition-all duration-300 ${
                  isMastered ? 'fill-emerald-400' : isLearning ? 'fill-primary' : 'fill-outline-variant/30'
                }`}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r="14"
                className="fill-none stroke-primary/20 stroke-2 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              
              {/* Tooltip-like label */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <rect
                  x={node.x - 60}
                  y={node.y + 15}
                  width="120"
                  height="40"
                  rx="8"
                  className="fill-surface-container-highest stroke-outline-variant/20 shadow-xl"
                />
                <text
                  x={node.x}
                  y={node.y + 32}
                  textAnchor="middle"
                  className="fill-on-surface text-[10px] font-bold font-headline"
                >
                  {node.title.length > 18 ? node.title.slice(0, 15) + '...' : node.title}
                </text>
                <text
                  x={node.x}
                  y={node.y + 46}
                  textAnchor="middle"
                  className="fill-on-surface-variant text-[8px] font-bold uppercase tracking-wider"
                >
                   Mastery: {Math.round(node.mastery)}%
                </text>
              </g>

              {/* Static Label (shortened) */}
              <text
                x={node.x}
                y={node.y - 18}
                textAnchor="middle"
                className="fill-on-surface-variant text-[9px] font-semibold opacity-60 group-hover:opacity-100 transition-opacity"
              >
                {node.title.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
