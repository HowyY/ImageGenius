import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Panel,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CharacterNode } from "@/components/nodes/CharacterNode";
import { StyleNode } from "@/components/nodes/StyleNode";
import { AngleNode } from "@/components/nodes/AngleNode";
import { PoseNode } from "@/components/nodes/PoseNode";
import { OutputNode } from "@/components/nodes/OutputNode";
import { NodeToolbar } from "@/components/nodes/NodeToolbar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const nodeTypes = {
  character: CharacterNode,
  style: StyleNode,
  angle: AngleNode,
  pose: PoseNode,
  output: OutputNode,
};

type NodeData = Record<string, unknown>;

const createInitialNodes = (): Node<NodeData>[] => [
  {
    id: "character-1",
    type: "character",
    position: { x: 50, y: 150 },
    data: { name: "", visualPrompt: "" },
  },
  {
    id: "style-1",
    type: "style",
    position: { x: 350, y: 50 },
    data: { styleId: "" },
  },
  {
    id: "angle-1",
    type: "angle",
    position: { x: 350, y: 200 },
    data: { angle: "front" },
  },
  {
    id: "pose-1",
    type: "pose",
    position: { x: 350, y: 350 },
    data: { pose: "standing" },
  },
  {
    id: "output-1",
    type: "output",
    position: { x: 650, y: 150 },
    data: {},
  },
];

const initialEdges: Edge[] = [
  { id: "e-char-style", source: "character-1", target: "style-1", animated: true },
  { id: "e-char-angle", source: "character-1", target: "angle-1", animated: true },
  { id: "e-char-pose", source: "character-1", target: "pose-1", animated: true },
  { id: "e-style-output", source: "style-1", target: "output-1", animated: true },
  { id: "e-angle-output", source: "angle-1", target: "output-1", animated: true },
  { id: "e-pose-output", source: "pose-1", target: "output-1", animated: true },
];

export default function NodeEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const updateNodeData = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...newData },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onChange: (newData: Record<string, unknown>) => updateNodeData(node.id, newData),
      },
    }));
  }, [nodes, updateNodeData]);

  const addNode = useCallback(
    (type: string) => {
      const id = `${type}-${Date.now()}`;
      const newNode: Node<NodeData> = {
        id,
        type,
        position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
        data: getDefaultDataForType(type),
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full" data-testid="node-editor-page">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Panel position="top-left" className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Beta
          </Badge>
          <span className="text-sm text-muted-foreground">Node Editor</span>
        </Panel>
        <NodeToolbar onAddNode={addNode} />
        <Controls className="bg-card border rounded-md" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="bg-background" />
      </ReactFlow>
    </div>
  );
}

function getDefaultDataForType(type: string): NodeData {
  switch (type) {
    case "character":
      return { name: "", visualPrompt: "" };
    case "style":
      return { styleId: "" };
    case "angle":
      return { angle: "front" };
    case "pose":
      return { pose: "standing" };
    case "output":
      return {};
    default:
      return {};
  }
}
