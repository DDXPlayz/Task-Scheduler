import { useState, useMemo, useEffect } from 'react';
import { Task, ScheduleBlock, TimeBlock, UnavailableBlock } from '@/types/task';
import { TimetableScheduler } from '@/lib/timetable-scheduler';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskForm from '@/components/TaskForm';
import TaskList from '@/components/TaskList';
import ScheduleTimeline from '@/components/ScheduleTimeline';
import TimetableGrid from '@/components/TimetableGrid';
import UnavailableTimeManager from '@/components/UnavailableTimeManager';
import DateSelector from '@/components/DateSelector';
import { Brain, Calendar, CheckSquare, Plus, Sparkles, Grid3X3, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('ai-scheduler-tasks', []);
  const [schedule, setSchedule] = useLocalStorage<ScheduleBlock[]>('ai-scheduler-schedule', []);
  const [timetable, setTimetable] = useLocalStorage<TimeBlock[]>('ai-scheduler-timetable', []);
  const [unavailableBlocks, setUnavailableBlocks] = useLocalStorage<UnavailableBlock[]>('ai-scheduler-unavailable', []);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const scheduler = useMemo(() => new TimetableScheduler(), []);

  const addTask = (taskData: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      completed: false,
      createdAt: new Date()
    };
    
    setTasks(prev => [...prev, newTask]);
    toast({
      title: "Task added!",
      description: `"${newTask.name}" has been added to your task list.`,
    });
  };

  const toggleTaskComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    
    const task = updatedTasks.find(t => t.id === taskId);
    if (task) {
      // Regenerate schedule when task completion changes
      scheduler.setTasks(updatedTasks);
      scheduler.setUnavailableBlocks(unavailableBlocks);
      const newTimetable = scheduler.generateTimetable(selectedDate);
      setTimetable(newTimetable);
      
      // Update timeline with remaining scheduled tasks (exclude completed tasks)
      const allScheduledTasks = updatedTasks.filter(task => task.scheduledTime && !task.completed);
      const scheduleBlocks: ScheduleBlock[] = allScheduledTasks.map(task => ({
        id: `scheduled-${task.id}`,
        type: 'task' as const,
        taskId: task.id,
        task: task,
        startTime: new Date(task.scheduledTime!),
        endTime: new Date(task.scheduledTime!.getTime() + task.duration * 60000),
        title: task.name,
        description: `${task.type} • ${task.priority} priority • ${task.duration}m`,
      }));
      setSchedule(scheduleBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
      
      toast({
        title: task.completed ? "Task completed!" : "Task unmarked",
        description: `"${task.name}" has been ${task.completed ? 'marked as complete and removed from schedule' : 'unmarked'}.`,
      });
    }
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    
    if (task) {
      toast({
        title: "Task deleted",
        description: `"${task.name}" has been removed from your list.`,
        variant: "destructive"
      });
    }
  };

  const generateSchedule = () => {
    scheduler.setTasks(tasks);
    scheduler.setUnavailableBlocks(unavailableBlocks);
    const newSchedule = scheduler.generateTimetable(selectedDate);
    setTimetable(newSchedule);
    
    // Update tasks with scheduled times and sync to timeline
    const updatedTasks = tasks.map(task => {
      const taskBlock = newSchedule.find(block => block.taskId === task.id);
      if (taskBlock) {
        return { ...task, scheduledTime: taskBlock.startTime };
      }
      return task;
    });
    setTasks(updatedTasks);
    
    // Convert all scheduled tasks to ScheduleBlock format for timeline (exclude completed)
    const allScheduledTasks = updatedTasks.filter(task => task.scheduledTime && !task.completed);
    const scheduleBlocks: ScheduleBlock[] = allScheduledTasks.map(task => ({
      id: `scheduled-${task.id}`,
      type: 'task' as const,
      taskId: task.id,
      task: task,
      startTime: new Date(task.scheduledTime!),
      endTime: new Date(task.scheduledTime!.getTime() + task.duration * 60000),
      title: task.name,
      description: `${task.type} • ${task.priority} priority • ${task.duration}m`,
    }));
    
    setSchedule(scheduleBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    
    // Switch to schedule tab when generating schedule
    setActiveTab('schedule');
    
    toast({
      title: "Schedule generated!",
      description: `Smart schedule created with ${scheduleBlocks.length} tasks scheduled.`,
    });
  };

  const generateTimetable = () => {
    // Use the same engine for consistency
    generateSchedule();
    // Switch to timetable tab when generating timetable
    setActiveTab('timetable');
  };

  // Auto-generate schedule when date changes (but not when unavailable blocks change to avoid double-regeneration)
  useEffect(() => {
    if (tasks.length > 0) {
      scheduler.setTasks(tasks);
      scheduler.setUnavailableBlocks(unavailableBlocks);
      const newTimetable = scheduler.generateTimetable(selectedDate);
      setTimetable(newTimetable);
      
      // Sync timeline with all scheduled tasks across all dates (exclude completed tasks)
      const allScheduledTasks = tasks.filter(task => task.scheduledTime && !task.completed);
      const scheduleBlocks: ScheduleBlock[] = allScheduledTasks.map(task => ({
        id: `scheduled-${task.id}`,
        type: 'task' as const,
        taskId: task.id,
        task: task,
        startTime: new Date(task.scheduledTime!),
        endTime: new Date(task.scheduledTime!.getTime() + task.duration * 60000),
        title: task.name,
        description: `${task.type} • ${task.priority} priority • ${task.duration}m`,
      }));
      
      setSchedule(scheduleBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    }
  }, [selectedDate, tasks, scheduler]); // Removed unavailableBlocks dependency to prevent double-regeneration

  const handleRescheduleTask = (taskId: string, newStartTime: Date) => {
    // Prevent rescheduling to past times
    const now = new Date();
    if (newStartTime <= now) {
      toast({
        title: "Cannot schedule in the past",
        description: "Please select a future time slot.",
        variant: "destructive"
      });
      return;
    }

    // Don't reschedule completed tasks
    const targetTask = tasks.find(task => task.id === taskId);
    if (targetTask && targetTask.completed) {
      toast({
        title: "Cannot reschedule completed task",
        description: "Completed tasks cannot be rescheduled.",
        variant: "destructive"
      });
      return;
    }

    if (!targetTask) return;

    // Check if the new time slot conflicts with existing blocks
    const taskEndTime = new Date(newStartTime.getTime() + targetTask.duration * 60000);
    const hasConflict = timetable.some(block => {
      // Skip the current task's block
      if (block.taskId === taskId) return false;
      
      // Check for overlap with other blocks
      return (newStartTime < block.endTime && taskEndTime > block.startTime);
    });

    if (hasConflict) {
      toast({
        title: "Time slot occupied",
        description: "Cannot reschedule task to an occupied time slot.",
        variant: "destructive"
      });
      return;
    }

    // Check working hours
    const dayEnd = new Date(newStartTime);
    dayEnd.setHours(23, 0, 0, 0);
    
    if (taskEndTime > dayEnd) {
      toast({
        title: "Outside working hours",
        description: "Task would extend past 11:00 PM. Please choose an earlier time.",
        variant: "destructive"
      });
      return;
    }

    // Update the scheduler's tasks with the new scheduled time
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, scheduledTime: newStartTime } : task
    );
    setTasks(updatedTasks);
    scheduler.setTasks(updatedTasks);

    // Use the reschedule method to update the timetable properly
    const newTimetable = scheduler.rescheduleTask(taskId, newStartTime, timetable);
    setTimetable(newTimetable);
    
    // Update the schedule timeline with all scheduled tasks (exclude completed)
    const allScheduledTasks = updatedTasks.filter(task => task.scheduledTime && !task.completed);
    const scheduleBlocks: ScheduleBlock[] = allScheduledTasks.map(task => ({
      id: `scheduled-${task.id}`,
      type: 'task' as const,
      taskId: task.id,
      task: task,
      startTime: new Date(task.scheduledTime!),
      endTime: new Date(task.scheduledTime!.getTime() + task.duration * 60000),
      title: task.name,
      description: `${task.type} • ${task.priority} priority • ${task.duration}m`,
    }));
    setSchedule(scheduleBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    
    const taskName = updatedTasks.find(t => t.id === taskId)?.name || 'Task';
    toast({
      title: "Task rescheduled", 
      description: `"${taskName}" moved to ${newStartTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}.`,
    });
  };

  const handleAddUnavailableTime = (startTime: Date, endTime: Date, title: string, description?: string) => {
    // Create and store the unavailable block
    const newBlock: UnavailableBlock = {
      id: crypto.randomUUID(),
      startTime,
      endTime,
      title,
      description
    };
    
    // Check for overlapping tasks that need to be rescheduled
    const conflictingTasks = timetable.filter(block => {
      if (block.type !== 'task' || !block.task) return false;
      return startTime < block.endTime && endTime > block.startTime;
    });
    
    setUnavailableBlocks(prev => [...prev, newBlock]);
    
    // Immediately regenerate timetable to reschedule conflicting tasks
    const updatedUnavailableBlocks = [...unavailableBlocks, newBlock];
    scheduler.setTasks(tasks);
    scheduler.setUnavailableBlocks(updatedUnavailableBlocks);
    const newTimetable = scheduler.generateTimetable(selectedDate);
    setTimetable(newTimetable);
    
    // Update tasks with new scheduled times and sync to timeline
    const updatedTasks = tasks.map(task => {
      const taskBlock = newTimetable.find(block => block.taskId === task.id);
      if (taskBlock && !task.completed) {
        return { ...task, scheduledTime: taskBlock.startTime };
      }
      return task;
    });
    setTasks(updatedTasks);
    
    // Update schedule timeline with rescheduled tasks
    const allScheduledTasks = updatedTasks.filter(task => task.scheduledTime && !task.completed);
    const scheduleBlocks: ScheduleBlock[] = allScheduledTasks.map(task => ({
      id: `scheduled-${task.id}`,
      type: 'task' as const,
      taskId: task.id,
      task: task,
      startTime: new Date(task.scheduledTime!),
      endTime: new Date(task.scheduledTime!.getTime() + task.duration * 60000),
      title: task.name,
      description: `${task.type} • ${task.priority} priority • ${task.duration}m`,
    }));
    setSchedule(scheduleBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    
    const conflictCount = conflictingTasks.length;
    toast({
      title: "Time blocked",
      description: `"${title}" added.${conflictCount > 0 ? ` ${conflictCount} task${conflictCount > 1 ? 's' : ''} rescheduled.` : ''}`,
    });
  };

  const handleAddUnavailableBlock = (block: Omit<UnavailableBlock, 'id'>) => {
    const newBlock: UnavailableBlock = {
      ...block,
      id: crypto.randomUUID()
    };
    
    // Check for overlapping tasks across multiple days if it's a recurring block
    let conflictingTasksCount = 0;
    if (block.recurring) {
      // For recurring blocks, check current date and next few days for conflicts
      const datesToCheck = [selectedDate];
      if (block.recurring.type === 'daily') {
        // Check next 7 days for daily recurring blocks
        for (let i = 1; i <= 7; i++) {
          const futureDate = new Date(selectedDate);
          futureDate.setDate(futureDate.getDate() + i);
          datesToCheck.push(futureDate);
        }
      } else if (block.recurring.type === 'weekly' && block.recurring.days) {
        // Check next 4 weeks for weekly recurring blocks
        for (let week = 0; week < 4; week++) {
          for (const dayOfWeek of block.recurring.days) {
            const futureDate = new Date(selectedDate);
            futureDate.setDate(futureDate.getDate() + (week * 7) + (dayOfWeek - selectedDate.getDay()));
            if (futureDate >= selectedDate) {
              datesToCheck.push(futureDate);
            }
          }
        }
      }
      
      // Estimate conflicts across dates
      datesToCheck.forEach(date => {
        const estimatedConflicts = tasks.filter(task => {
          if (!task.scheduledTime || task.completed) return false;
          const taskDate = new Date(task.scheduledTime);
          const isSameDate = taskDate.toDateString() === date.toDateString();
          if (!isSameDate) return false;
          
          const blockStart = new Date(date);
          blockStart.setHours(block.startTime.getHours(), block.startTime.getMinutes(), 0, 0);
          const blockEnd = new Date(date);
          blockEnd.setHours(block.endTime.getHours(), block.endTime.getMinutes(), 0, 0);
          
          const taskEnd = new Date(task.scheduledTime.getTime() + task.duration * 60000);
          return taskDate < blockEnd && taskEnd > blockStart;
        });
        conflictingTasksCount += estimatedConflicts.length;
      });
    } else {
      // For one-time blocks, check only the specific date
      const blockDate = new Date(block.startTime);
      const conflictingTasks = timetable.filter(timeBlock => {
        if (timeBlock.type !== 'task' || !timeBlock.task) return false;
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);
        return blockStart < timeBlock.endTime && blockEnd > timeBlock.startTime;
      });
      conflictingTasksCount = conflictingTasks.length;
    }
    
    setUnavailableBlocks(prev => [...prev, newBlock]);
    
    // Immediately regenerate timetable to reschedule conflicting tasks
    const updatedUnavailableBlocks = [...unavailableBlocks, newBlock];
    scheduler.setTasks(tasks);
    scheduler.setUnavailableBlocks(updatedUnavailableBlocks);
    const newTimetable = scheduler.generateTimetable(selectedDate);
    setTimetable(newTimetable);
    
    // Update tasks with new scheduled times and sync to timeline
    const updatedTasks = tasks.map(task => {
      const taskBlock = newTimetable.find(timeBlock => timeBlock.taskId === task.id);
      if (taskBlock && !task.completed) {
        return { ...task, scheduledTime: taskBlock.startTime };
      }
      return task;
    });
    setTasks(updatedTasks);
    
    // Update schedule timeline with rescheduled tasks
    const allScheduledTasks = updatedTasks.filter(task => task.scheduledTime && !task.completed);
    const scheduleBlocks: ScheduleBlock[] = allScheduledTasks.map(task => ({
      id: `scheduled-${task.id}`,
      type: 'task' as const,
      taskId: task.id,
      task: task,
      startTime: new Date(task.scheduledTime!),
      endTime: new Date(task.scheduledTime!.getTime() + task.duration * 60000),
      title: task.name,
      description: `${task.type} • ${task.priority} priority • ${task.duration}m`,
    }));
    setSchedule(scheduleBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    
    toast({
      title: "Unavailable time added",
      description: `"${block.title}" added.${conflictingTasksCount > 0 ? ` ${conflictingTasksCount} task${conflictingTasksCount > 1 ? 's' : ''} will be rescheduled.` : ''}`,
    });
  };

  const handleDeleteUnavailableBlock = (blockId: string) => {
    const block = unavailableBlocks.find(b => b.id === blockId);
    setUnavailableBlocks(prev => prev.filter(b => b.id !== blockId));
    
    // Don't auto-reschedule when removing blocks - only when adding them
    if (block) {
      toast({
        title: "Time block removed",
        description: `"${block.title}" has been deleted.`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteTimeBlock = (blockId: string) => {
    const block = timetable.find(b => b.id === blockId);
    
    if (!block) return;
    
    if (block.type === 'unavailable') {
      // Find the matching unavailable block and check if it's recurring
      const blockDate = new Date(block.startTime);
      const matchingBlock = unavailableBlocks.find(b => {
        const existingDate = new Date(b.startTime);
        return blockDate.getHours() === existingDate.getHours() && 
               blockDate.getMinutes() === existingDate.getMinutes() &&
               block.endTime.getHours() === b.endTime.getHours() &&
               block.endTime.getMinutes() === b.endTime.getMinutes() &&
               block.title === b.title;
      });

      if (matchingBlock && matchingBlock.recurring) {
        // For recurring blocks, add an exception instead of deleting
        scheduler.addExceptionToRecurringBlock(matchingBlock.id, selectedDate);
        
        // Update the unavailableBlocks to include the exception
        setUnavailableBlocks(prev => prev.map(b => {
          if (b.id === matchingBlock.id) {
            const dateString = selectedDate.toISOString().split('T')[0];
            const exceptions = b.recurring?.exceptions || [];
            if (!exceptions.includes(dateString)) {
              return {
                ...b,
                recurring: {
                  ...b.recurring!,
                  exceptions: [...exceptions, dateString]
                }
              };
            }
          }
          return b;
        }));

        toast({
          title: "Exception added",
          description: `"${block.title}" will not occur on this date, but will continue recurring on other days.`,
          variant: "default"
        });
      } else {
        // For one-time blocks, remove completely
        setUnavailableBlocks(prev => prev.filter(b => {
          const existingDate = new Date(b.startTime);
          return !(blockDate.getTime() === existingDate.getTime() && 
                  block.endTime.getTime() === b.endTime.getTime() && 
                  block.title === b.title);
        }));

        toast({
          title: "Block removed",
          description: `"${block.title}" has been removed completely.`,
          variant: "destructive"
        });
      }
      
      // Remove from timetable without rescheduling
      setTimetable(prev => prev.filter(b => b.id !== blockId));
    } else if (block.type === 'task' && block.taskId) {
      // For task blocks, clear the scheduled time and remove from timetable
      setTasks(prev => prev.map(task => 
        task.id === block.taskId ? { ...task, scheduledTime: undefined } : task
      ));
      
      // Remove from timetable
      setTimetable(prev => prev.filter(b => b.id !== blockId));
      
      // Update schedule timeline to remove the deleted task
      setSchedule(prev => prev.filter(s => s.taskId !== block.taskId));

      toast({
        title: "Task unscheduled",
        description: `"${block.title}" has been removed from the schedule.`,
        variant: "destructive"
      });
    } else {
      // For other blocks (like breaks), just remove from timetable
      setTimetable(prev => prev.filter(b => b.id !== blockId));

      toast({
        title: "Block removed",
        description: `"${block.title}" has been removed from the schedule.`,
        variant: "destructive"
      });
    }
  };

  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Task Scheduler</h1>
                <p className="text-sm text-muted-foreground">Intelligent productivity planning</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="text-foreground font-medium">{incompleteTasks.length} pending</p>
                <p className="text-muted-foreground">{completedTasks.length} completed</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={generateSchedule}
                  disabled={incompleteTasks.length === 0}
                  size="sm"
                  variant="outline"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
                
                <Button 
                  onClick={generateTimetable}
                  disabled={incompleteTasks.length === 0}
                  className="bg-gradient-primary hover:opacity-90 transition-opacity"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Timetable
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Timetable
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="blocks" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Blocks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <Card className="p-6 bg-gradient-card border-border shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Tasks</span>
                    <span className="font-semibold text-foreground">{tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-semibold text-foreground">{incompleteTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-semibold text-foreground">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span className="font-semibold text-foreground">
                      {Math.round(incompleteTasks.reduce((sum, task) => sum + task.duration, 0) / 60 * 10) / 10}h
                    </span>
                  </div>
                </div>
              </Card>

              {/* Add Task */}
              <Card className="p-6 bg-gradient-card border-border shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Quick Add Task
                </h3>
                <TaskForm onSubmit={addTask} />
              </Card>
            </div>

            {/* Recent Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Tasks</h3>
              <TaskList 
                tasks={tasks.slice(-3)} 
                onToggleComplete={toggleTaskComplete}
                onDeleteTask={deleteTask}
              />
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add New Task</h3>
                <TaskForm onSubmit={addTask} />
              </div>
              
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-4">Your Tasks</h3>
                <TaskList 
                  tasks={tasks} 
                  onToggleComplete={toggleTaskComplete}
                  onDeleteTask={deleteTask}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timetable" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3">
                <TimetableGrid
                  timetable={timetable}
                  selectedDate={selectedDate}
                  onRescheduleTask={handleRescheduleTask}
                  onAddUnavailableTime={handleAddUnavailableTime}
                  onDeleteTimeBlock={handleDeleteTimeBlock}
                />
              </div>
              
              <div className="space-y-4">
                <DateSelector
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
                
                <Card className="p-4 bg-gradient-card border-border shadow-card">
                  <div className="flex gap-2">
                    <Button 
                      onClick={generateTimetable}
                      disabled={incompleteTasks.length === 0}
                      className="w-full bg-gradient-primary hover:opacity-90"
                    >
                      <Grid3X3 className="w-4 h-4 mr-2" />
                      Generate Timetable
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-card border-border shadow-card">
                  <h4 className="font-semibold text-foreground mb-3">Quick Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks scheduled:</span>
                      <span className="font-medium text-foreground">
                        {timetable.filter(b => b.type === 'task').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Break time:</span>
                      <span className="font-medium text-foreground">
                        {Math.round(timetable.filter(b => b.type === 'break')
                          .reduce((total, b) => total + (b.endTime.getTime() - b.startTime.getTime()), 0) / (1000 * 60))}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unavailable:</span>
                      <span className="font-medium text-foreground">
                        {timetable.filter(b => b.type === 'unavailable').length} blocks
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            
            {timetable.length === 0 && (
              <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
                <Grid3X3 className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Timetable Generated Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Set up your unavailable times and generate a timetable to see your optimized daily schedule.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={() => setActiveTab('blocks')}
                    variant="outline"
                  >
                    Set Time Blocks
                  </Button>
                  <Button 
                    onClick={generateTimetable}
                    disabled={incompleteTasks.length === 0}
                    className="bg-gradient-primary hover:opacity-90 transition-opacity"
                  >
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Generate Timetable
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <ScheduleTimeline schedule={schedule} allTasks={tasks} />
            
            {schedule.length === 0 && (
              <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
                <Brain className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Timeline Generated Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add some tasks and click "Generate Schedule" to see your AI-optimized timeline.
                </p>
                <Button 
                  onClick={() => setActiveTab('tasks')}
                  variant="outline"
                  className="mr-2"
                >
                  Add Tasks
                </Button>
                <Button 
                  onClick={generateSchedule}
                  disabled={incompleteTasks.length === 0}
                  className="bg-gradient-primary hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Timeline
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="blocks" className="space-y-6">
            <UnavailableTimeManager
              unavailableBlocks={unavailableBlocks}
              onAddBlock={handleAddUnavailableBlock}
              onDeleteBlock={handleDeleteUnavailableBlock}
              onAddOneTimeBlock={handleAddUnavailableTime}
              selectedDate={selectedDate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}