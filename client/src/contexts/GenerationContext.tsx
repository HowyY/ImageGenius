import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateRequest, GenerateResponse } from "@shared/schema";

export type GenerationStatus = "pending" | "generating" | "completed" | "failed";
export type GenerationStage = "starting" | "processing" | "receiving";

export interface GenerationTask {
  id: string;
  prompt: string;
  styleId: string;
  engine: string;
  sceneId?: number;
  sceneName?: string;
  status: GenerationStatus;
  stage: GenerationStage;
  imageUrl?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

interface GenerationContextType {
  tasks: GenerationTask[];
  activeTaskCount: number;
  startGeneration: (request: GenerateRequest & { sceneName?: string }) => Promise<GenerateResponse>;
  clearCompletedTasks: () => void;
  clearTask: (taskId: string) => void;
  isGenerating: (sceneId?: number) => boolean;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return context;
}

interface GenerationProviderProps {
  children: ReactNode;
}

export function GenerationProvider({ children }: GenerationProviderProps) {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);

  const updateTask = useCallback((taskId: string, updates: Partial<GenerationTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const startGeneration = useCallback(async (request: GenerateRequest & { sceneName?: string }): Promise<GenerateResponse> => {
    const taskId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTask: GenerationTask = {
      id: taskId,
      prompt: request.prompt,
      styleId: request.styleId,
      engine: request.engine,
      sceneId: request.sceneId,
      sceneName: request.sceneName,
      status: "generating",
      stage: "starting",
      startedAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);

    try {
      updateTask(taskId, { stage: "processing" });
      
      const response = await apiRequest("POST", "/api/generate", request);
      
      updateTask(taskId, { stage: "receiving" });
      const result = await response.json() as GenerateResponse;
      
      updateTask(taskId, {
        status: "completed",
        imageUrl: result.imageUrl,
        completedAt: Date.now(),
      });

      return result;
    } catch (error) {
      updateTask(taskId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Generation failed",
        completedAt: Date.now(),
      });
      throw error;
    }
  }, [updateTask]);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(task => task.status === "generating" || task.status === "pending"));
  }, []);

  const clearTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const isGenerating = useCallback((sceneId?: number) => {
    if (sceneId !== undefined) {
      return tasks.some(task => task.sceneId === sceneId && task.status === "generating");
    }
    return tasks.some(task => task.status === "generating");
  }, [tasks]);

  const activeTaskCount = tasks.filter(t => t.status === "generating").length;

  return (
    <GenerationContext.Provider
      value={{
        tasks,
        activeTaskCount,
        startGeneration,
        clearCompletedTasks,
        clearTask,
        isGenerating,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}
