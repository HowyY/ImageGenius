import { useCallback, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Panel,
  Node,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
  NodeMouseHandler,
  EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

import { CharacterNode } from "@/components/nodes/CharacterNode";
import { StyleNode } from "@/components/nodes/StyleNode";
import { AngleNode } from "@/components/nodes/AngleNode";
import { PoseNode } from "@/components/nodes/PoseNode";
import { OutputNode } from "@/components/nodes/OutputNode";
import { BackgroundNode } from "@/components/nodes/BackgroundNode";
import { PropNode } from "@/components/nodes/PropNode";
import { NodeToolbar } from "@/components/nodes/NodeToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Sparkles, Save, FolderOpen, Plus, Trash2, Copy, Clipboard } from "lucide-react";
import type { SelectNodeWorkflow } from "@shared/schema";

const nodeTypes = {
  character: CharacterNode,
  style: StyleNode,
  angle: AngleNode,
  pose: PoseNode,
  output: OutputNode,
  background: BackgroundNode,
  prop: PropNode,
};

type NodeData = Record<string, unknown>;

const createInitialNodes = (): Node<NodeData>[] => [
  {
    id: "character-1",
    type: "character",
    position: { x: 50, y: 150 },
    data: { characterId: "", name: "", visualPrompt: "" },
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

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  type: "node" | "edge" | "pane" | null;
  targetId: string | null;
}

function NodeEditorContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<number | null>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    type: null,
    targetId: null,
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { getNodes, getEdges, screenToFlowPosition } = useReactFlow();

  const { data: workflows = [] } = useQuery<SelectNodeWorkflow[]>({
    queryKey: ["/api/node-workflows"],
  });

  const saveWorkflowMutation = useMutation({
    mutationFn: async (data: { name: string; nodes: Node<NodeData>[]; edges: Edge[] }) => {
      const cleanNodes = data.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: { ...node.data, onChange: undefined },
      }));
      
      if (currentWorkflowId) {
        return apiRequest("PATCH", `/api/node-workflows/${currentWorkflowId}`, {
          name: data.name,
          nodes: cleanNodes,
          edges: data.edges,
        });
      } else {
        return apiRequest("POST", "/api/node-workflows", {
          name: data.name,
          nodes: cleanNodes,
          edges: data.edges,
        });
      }
    },
    onSuccess: async (response) => {
      const savedWorkflow = await response.json();
      setCurrentWorkflowId(savedWorkflow.id);
      setCurrentWorkflowName(savedWorkflow.name);
      queryClient.invalidateQueries({ queryKey: ["/api/node-workflows"] });
      toast({
        title: "Workflow saved",
        description: `"${savedWorkflow.name}" has been saved successfully.`,
      });
      setSaveDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save workflow",
        variant: "destructive",
      });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/node-workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/node-workflows"] });
      toast({
        title: "Workflow deleted",
        description: "Workflow has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete workflow",
        variant: "destructive",
      });
    },
  });

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
    (type: string, position?: { x: number; y: number }) => {
      const id = `${type}-${Date.now()}`;
      const nodePosition = position || { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 };
      const newNode: Node<NodeData> = {
        id,
        type,
        position: nodePosition,
        data: getDefaultDataForType(type),
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const deleteSelectedElements = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => edge.selected);
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return;
    }

    const nodeIdsToDelete = new Set(selectedNodes.map((node) => node.id));
    
    setNodes((nds) => nds.filter((node) => !nodeIdsToDelete.has(node.id)));
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !edge.selected &&
          !nodeIdsToDelete.has(edge.source) &&
          !nodeIdsToDelete.has(edge.target)
      )
    );

    toast({
      title: "Deleted",
      description: `Deleted ${selectedNodes.length} node(s) and ${selectedEdges.length} edge(s).`,
    });
  }, [nodes, edges, setNodes, setEdges, toast]);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    },
    [setEdges]
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const nodeToDuplicate = nodes.find((node) => node.id === nodeId);
      if (!nodeToDuplicate) return;

      const newNode: Node<NodeData> = {
        ...nodeToDuplicate,
        id: `${nodeToDuplicate.type}-${Date.now()}`,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50,
        },
        selected: false,
        data: { ...nodeToDuplicate.data },
      };
      setNodes((nds) => [...nds, newNode]);
      toast({
        title: "Node duplicated",
        description: "A copy of the node has been created.",
      });
    },
    [nodes, setNodes, toast]
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        type: "node",
        targetId: node.id,
      });
    },
    []
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        type: "edge",
        targetId: edge.id,
      });
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        type: "pane",
        targetId: null,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  }, []);

  const handleSave = () => {
    if (currentWorkflowId && currentWorkflowName) {
      saveWorkflowMutation.mutate({
        name: currentWorkflowName,
        nodes,
        edges,
      });
    } else {
      setNewWorkflowName("");
      setSaveDialogOpen(true);
    }
  };

  const handleSaveAs = () => {
    setNewWorkflowName(currentWorkflowName || "");
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    if (!newWorkflowName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the workflow.",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentWorkflowId(null);
    saveWorkflowMutation.mutate({
      name: newWorkflowName.trim(),
      nodes,
      edges,
    });
  };

  const handleLoad = (workflow: SelectNodeWorkflow) => {
    const loadedNodes = (workflow.nodes as Node<NodeData>[]).map(node => ({
      ...node,
      data: { ...node.data },
    }));
    setNodes(loadedNodes);
    setEdges(workflow.edges as Edge[]);
    setCurrentWorkflowId(workflow.id);
    setCurrentWorkflowName(workflow.name);
    setLoadDialogOpen(false);
    toast({
      title: "Workflow loaded",
      description: `"${workflow.name}" has been loaded.`,
    });
  };

  const handleNew = () => {
    setNodes(createInitialNodes());
    setEdges(initialEdges);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName("");
    toast({
      title: "New workflow",
      description: "Started a new workflow.",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      deleteWorkflowMutation.mutate(id);
      if (currentWorkflowId === id) {
        handleNew();
      }
    }
  };

  return (
    <div
      ref={reactFlowWrapper}
      className="h-[calc(100vh-3.5rem)] w-full"
      data-testid="node-editor-page"
      onClick={closeContextMenu}
    >
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={closeContextMenu}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        selectNodesOnDrag
        snapToGrid
        snapGrid={[15, 15]}
        fitView
        className="bg-background"
      >
        <Panel position="top-left" className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Beta
          </Badge>
          <span className="text-sm text-muted-foreground">
            {currentWorkflowName || "Untitled Workflow"}
          </span>
        </Panel>

        <Panel position="top-center" className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleNew}
            data-testid="button-new-workflow"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLoadDialogOpen(true)}
            data-testid="button-load-workflow"
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Load
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveWorkflowMutation.isPending}
            data-testid="button-save-workflow"
          >
            <Save className="w-4 h-4 mr-1" />
            {saveWorkflowMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </Panel>

        <NodeToolbar onAddNode={addNode} />
        <Controls className="bg-card border rounded-md" />
        <MiniMap
          className="bg-card border rounded-md"
          nodeColor={(node) => {
            switch (node.type) {
              case "character":
                return "#3b82f6";
              case "background":
                return "#10b981";
              case "prop":
                return "#f59e0b";
              case "style":
                return "#a855f7";
              case "angle":
                return "#22c55e";
              case "pose":
                return "#f97316";
              case "output":
                return "#06b6d4";
              default:
                return "#6b7280";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="bg-background" />
      </ReactFlow>

      {contextMenu.show && (
        <div
          className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "node" && contextMenu.targetId && (
            <>
              <button
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  duplicateNode(contextMenu.targetId!);
                  closeContextMenu();
                }}
                data-testid="context-menu-duplicate"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </button>
              <button
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-destructive"
                onClick={() => {
                  deleteNode(contextMenu.targetId!);
                  closeContextMenu();
                }}
                data-testid="context-menu-delete-node"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Node
              </button>
            </>
          )}
          {contextMenu.type === "edge" && contextMenu.targetId && (
            <button
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-destructive"
              onClick={() => {
                deleteEdge(contextMenu.targetId!);
                closeContextMenu();
              }}
              data-testid="context-menu-delete-edge"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Edge
            </button>
          )}
          {contextMenu.type === "pane" && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Add Node
              </div>
              {[
                { type: "character", label: "Character" },
                { type: "background", label: "Background" },
                { type: "prop", label: "Prop" },
                { type: "style", label: "Style" },
                { type: "angle", label: "Angle" },
                { type: "pose", label: "Pose" },
                { type: "output", label: "Output" },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    const position = screenToFlowPosition({
                      x: contextMenu.x,
                      y: contextMenu.y,
                    });
                    addNode(type, position);
                    closeContextMenu();
                  }}
                  data-testid={`context-menu-add-${type}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Workflow name..."
              data-testid="input-workflow-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfirm}
              disabled={saveWorkflowMutation.isPending}
            >
              {saveWorkflowMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Workflow</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {workflows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved workflows yet.
              </p>
            ) : (
              workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
                  onClick={() => handleLoad(workflow)}
                  data-testid={`workflow-item-${workflow.id}`}
                >
                  <div>
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(workflow.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(workflow.id);
                    }}
                    data-testid={`button-delete-workflow-${workflow.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDefaultDataForType(type: string): NodeData {
  switch (type) {
    case "character":
      return { characterId: "", name: "", visualPrompt: "", styleId: "", generatedImage: "" };
    case "background":
      return { assetId: "", name: "", visualPrompt: "", styleId: "", generatedImage: "" };
    case "prop":
      return { assetId: "", name: "", visualPrompt: "", styleId: "", generatedImage: "" };
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

export default function NodeEditor() {
  return (
    <ReactFlowProvider>
      <NodeEditorContent />
    </ReactFlowProvider>
  );
}
