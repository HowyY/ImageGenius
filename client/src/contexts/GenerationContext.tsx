import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateRequest, GenerateResponse } from "@shared/schema";

export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export interface GenerationTask {
  id: string;
  prompt: string;
  styleId: string;
  engine: string;
  sceneId?: number;
  sceneName?: string;
  status: GenerationStatus;
  progress: number;
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
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const updateTask = useCallback((taskId: string, updates: Partial<GenerationTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const startProgressSimulation = useCallback((taskId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 90) {
        progress = 90;
        clearInterval(interval);
        progressIntervals.current.delete(taskId);
      }
      updateTask(taskId, { progress: Math.min(progress, 90) });
    }, 500);
    progressIntervals.current.set(taskId, interval);
  }, [updateTask]);

  const stopProgressSimulation = useCallback((taskId: string) => {
    const interval = progressIntervals.current.get(taskId);
    if (interval) {
      clearInterval(interval);
      progressIntervals.current.delete(taskId);
    }
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
      progress: 0,
      startedAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);
    startProgressSimulation(taskId);

    try {
      const response = await apiRequest("POST", "/api/generate", request);
      const result = await response.json() as GenerateResponse;
      
      stopProgressSimulation(taskId);
      updateTask(taskId, {
        status: "completed",
        progress: 100,
        imageUrl: result.imageUrl,
        completedAt: Date.now(),
      });

      return result;
    } catch (error) {
      stopProgressSimulation(taskId);
      updateTask(taskId, {
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
        completedAt: Date.now(),
      });
      throw error;
    }
  }, [startProgressSimulation, stopProgressSimulation, updateTask]);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(task => task.status === "generating" || task.status === "pending"));
  }, []);

  const clearTask = useCallback((taskId: string) => {
    stopProgressSimulation(taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, [stopProgressSimulation]);

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
