import { useState, useEffect, useMemo } from 'react';
import { Task, TimeBlock, UnavailableBlock } from '@/types/task';
import { TimetableScheduler } from '@/lib/timetable-scheduler';

// Local Storage Hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item, (key, value) => {
        // Parse Date objects
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      }) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Scheduler Hook
export const useScheduler = (tasks: Task[], unavailableBlocks: UnavailableBlock[]) => {
  const scheduler = useMemo(() => new TimetableScheduler(), []);

  const generateTimetableForDate = (date: Date): TimeBlock[] => {
    scheduler.setTasks(tasks);
    scheduler.setUnavailableBlocks(unavailableBlocks);
    return scheduler.generateTimetable(date);
  };

  const rescheduleTask = (taskId: string, newStartTime: Date, currentTimetable: TimeBlock[]): TimeBlock[] => {
    return scheduler.rescheduleTask(taskId, newStartTime, currentTimetable);
  };

  const addUnavailableBlockAndReschedule = (block: UnavailableBlock, targetDate: Date) => {
    scheduler.setTasks(tasks);
    scheduler.setUnavailableBlocks(unavailableBlocks);
    return scheduler.addUnavailableBlockAndReschedule(block, targetDate);
  };

  return {
    generateTimetableForDate,
    rescheduleTask,
    addUnavailableBlockAndReschedule
  };
};