import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Task, ScheduleBlock } from '@/types/task';

// Tailwind utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Task helper functions
export const convertTasksToScheduleBlocks = (tasks: Task[]): ScheduleBlock[] => {
  return tasks
    .filter(task => task.scheduledTime && !task.completed)
    .map(task => ({
      id: `scheduled-${task.id}`,
      type: 'task' as const,
      taskId: task.id,
      task: task,
      startTime: new Date(task.scheduledTime!),
      endTime: new Date(task.scheduledTime!.getTime() + task.duration * 60000),
      title: task.name,
      description: `${task.type} • ${task.priority} priority • ${task.duration}m`,
    }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
};

export const updateTaskScheduledTime = (tasks: Task[], taskId: string, newTime: Date): Task[] => {
  return tasks.map(task => 
    task.id === taskId ? { ...task, scheduledTime: newTime } : task
  );
};

export const toggleTaskCompletion = (tasks: Task[], taskId: string): Task[] => {
  return tasks.map(task => 
    task.id === taskId ? { ...task, completed: !task.completed } : task
  );
};

export const removeTaskById = (tasks: Task[], taskId: string): Task[] => {
  return tasks.filter(task => task.id !== taskId);
};