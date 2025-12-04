import { useCallback, useMemo, useState } from "react";
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
import { Sparkles, Save, FolderOpen, Plus, Trash2 } from "lucide-react";
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
  const [currentWorkflowId, setCurrentWorkflowId] = useState<number | null>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const { toast } = useToast();

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
          <span className="text-sm text-muted-foreground">
            {currentWorkflowName || "Untitled Workflow"}
          </span>
        </Panel>

        <Panel position="top-right" className="flex items-center gap-2 mr-2">
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
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="bg-background" />
      </ReactFlow>

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
      return { name: "", visualPrompt: "" };
    case "background":
      return { name: "", visualPrompt: "" };
    case "prop":
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
