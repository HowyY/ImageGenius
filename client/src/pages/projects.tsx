import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Video, LayoutGrid } from "lucide-react";
import type { SelectStoryboard } from "@shared/schema";
import { StageNavigation } from "@/components/StageNavigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type StageStatus = "in_progress" | "completed" | "in_production" | "all";

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StageStatus>("all");
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: storyboards = [], isLoading } = useQuery<SelectStoryboard[]>({
    queryKey: ["/api/storyboards"],
  });

  const createStoryboardMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/storyboards", { name });
      return res.json();
    },
    onSuccess: (newStoryboard: SelectStoryboard) => {
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards"] });
      setShowNewProjectDialog(false);
      setNewProjectName("");
      toast({
        title: "Project Created",
        description: `"${newStoryboard.name}" has been created.`,
      });
      localStorage.setItem("currentStoryboardId", String(newStoryboard.id));
      setLocation(`/storyboard?id=${newStoryboard.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createStoryboardMutation.mutate(newProjectName.trim());
    }
  };

  const filteredProjects = storyboards.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.stageStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: storyboards.length,
    completed: storyboards.filter((p) => p.stageStatus === "completed").length,
    inProgress: storyboards.filter((p) => p.stageStatus === "in_progress" || !p.stageStatus).length,
    inProduction: storyboards.filter((p) => p.stageStatus === "in_production").length,
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case "in_production":
        return <Badge variant="default" className="bg-purple-600">In Production</Badge>;
      default:
        return <Badge variant="secondary">In Progress</Badge>;
    }
  };

  const getStageLabel = (stage?: string | null) => {
    switch (stage) {
      case "script": return "Script Outline";
      case "storyboard": return "Storyboard";
      case "audio": return "Audio";
      case "video": return "Video";
      default: return "Script Outline";
    }
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-projects"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StageStatus)}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowNewProjectDialog(true)} data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary" data-testid="stat-total">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Projects</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500" data-testid="stat-completed">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500" data-testid="stat-in-progress">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-500" data-testid="stat-in-production">{stats.inProduction}</div>
              <div className="text-sm text-muted-foreground">In Production</div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first project to get started"}
            </p>
            <Button asChild>
              <Link href="/storyboard">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/storyboard?id=${project.id}`}>
                <Card
                  className="overflow-hidden hover-elevate cursor-pointer transition-all"
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="aspect-video bg-muted flex items-center justify-center relative">
                    <Video className="h-8 w-8 text-muted-foreground" />
                    <div className="absolute bottom-2 right-2">
                      {getStatusBadge(project.stageStatus)}
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium truncate" data-testid={`text-project-name-${project.id}`}>
                      {project.name}
                    </h3>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">16:9</span>
                      <span className="text-xs text-primary">{getStageLabel(project.currentStage)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      <StageNavigation />

      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-new-project">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new storyboard project
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="project-name" className="mb-2 block">
              Project Name
            </Label>
            <Input
              id="project-name"
              placeholder="Enter project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newProjectName.trim()) {
                  handleCreateProject();
                }
              }}
              data-testid="input-new-project-name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewProjectDialog(false);
                setNewProjectName("");
              }}
              data-testid="button-cancel-new-project"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || createStoryboardMutation.isPending}
              data-testid="button-confirm-new-project"
            >
              {createStoryboardMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
