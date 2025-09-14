import { Task, TimeBlock, UnavailableBlock, Priority, BlockType } from '@/types/task';

export class TimetableScheduler {
  private tasks: Task[] = [];
  private unavailableBlocks: UnavailableBlock[] = [];
  private dayStart = 6; // 6 AM
  private dayEnd = 23; // 11 PM (last task can start at 22:45)
  private shortBreakDuration = 15; // minutes
  private longBreakDuration = 30; // minutes
  private maxContinuousWork = 90; // minutes

  setTasks(tasks: Task[]) {
    this.tasks = tasks.filter(task => !task.completed);
  }

  setUnavailableBlocks(blocks: UnavailableBlock[]) {
    this.unavailableBlocks = blocks;
  }

  generateTimetable(date: Date = new Date()): TimeBlock[] {
    const timetable: TimeBlock[] = [];
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const isToday = targetDate.toDateString() === now.toDateString();
    
    // Don't generate timetables for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      return [];
    }

    // Add unavailable blocks for the specific day only
    this.addUnavailableBlocks(timetable, targetDate);

    // Add existing scheduled tasks for this date that shouldn't be rescheduled
    this.addExistingScheduledTasks(timetable, targetDate, isToday ? now : null);

    // Filter tasks that need to be scheduled/rescheduled for this date
    const eligibleTasks = this.getTasksForRescheduling(targetDate, isToday ? now : null);
    
    // Sort tasks by priority and deadline
    const sortedTasks = this.prioritizeTasks(eligibleTasks, targetDate, isToday ? now : null);

    // Place tasks in available slots
    this.placeTasks(timetable, sortedTasks, targetDate, isToday ? now : null);

    // Add intelligent breaks between work sessions
    this.insertIntelligentBreaks(timetable);

    // Filter out any completed tasks that might have slipped through
    return timetable.filter(block => {
      if (block.type === 'task' && block.task) {
        return !block.task.completed;
      }
      return true;
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  private addUnavailableBlocks(timetable: TimeBlock[], date: Date) {
    this.unavailableBlocks.forEach(block => {
      const blockDate = new Date(date);
      const startTime = new Date(block.startTime);
      const endTime = new Date(block.endTime);

      // Check if this block applies to the target date
      if (this.shouldIncludeBlock(block, date)) {
        blockDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        const blockEndTime = new Date(blockDate);
        blockEndTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

        timetable.push({
          id: `unavailable-${block.id}-${date.toDateString()}`,
          type: 'unavailable',
          startTime: blockDate,
          endTime: blockEndTime,
          title: block.title,
          description: block.description,
          isFixed: true
        });
      }
    });
  }

  private shouldIncludeBlock(block: UnavailableBlock, date: Date): boolean {
    // If not recurring, only include if it's the same date
    if (!block.recurring) {
      const blockDate = new Date(block.startTime);
      const targetDate = new Date(date);
      return blockDate.toDateString() === targetDate.toDateString();
    }

    // Check if this date is in the exceptions list  
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (block.recurring.exceptions?.includes(dateString)) {
      return false;
    }

    if (block.recurring.type === 'daily') return true;
    
    if (block.recurring.type === 'weekly') {
      const dayOfWeek = date.getDay();
      return block.recurring.days?.includes(dayOfWeek) ?? false;
    }

    return false;
  }

  private addExistingScheduledTasks(timetable: TimeBlock[], date: Date, currentTime?: Date | null) {
    const targetDateOnly = new Date(date);
    targetDateOnly.setHours(0, 0, 0, 0);

    const now = currentTime || new Date();
    const isToday = date.toDateString() === now.toDateString();

    this.tasks.forEach(task => {
      if (task.completed || !task.scheduledTime) return;

      const scheduledDate = new Date(task.scheduledTime);
      const scheduledDateOnly = new Date(scheduledDate);
      scheduledDateOnly.setHours(0, 0, 0, 0);

      // Only add if scheduled for this specific date
      if (scheduledDateOnly.getTime() === targetDateOnly.getTime()) {
        // If it's today and the time has passed but task isn't done, don't add it here (it will be rescheduled)
        if (isToday && scheduledDate <= now && !task.completed) {
          return;
        }

        const endTime = new Date(scheduledDate.getTime() + task.duration * 60000);
        
        timetable.push({
          id: `scheduled-${task.id}-${date.toDateString()}`,
          type: 'task',
          taskId: task.id,
          task: task,
          startTime: scheduledDate,
          endTime: endTime,
          title: task.name,
          description: `${task.type} • ${task.priority} priority • ${task.duration}m`
        });
      }
    });
  }

  private getTasksForRescheduling(targetDate: Date, currentTime?: Date | null): Task[] {
    const now = currentTime || new Date();
    const isToday = targetDate.toDateString() === now.toDateString();
    
    // Create clean date-only versions for comparison
    const targetDateOnly = new Date(targetDate);
    targetDateOnly.setHours(0, 0, 0, 0);
    
    const todayOnly = new Date(now);
    todayOnly.setHours(0, 0, 0, 0);
    
    return this.tasks.filter(task => {
      // Don't schedule completed tasks
      if (task.completed) {
        return false;
      }
      
      // Don't schedule in the past - this is critical
      if (targetDateOnly < todayOnly) {
        return false;
      }
      
      const deadlineDate = new Date(task.deadline);
      const deadlineDateOnly = new Date(deadlineDate);
      deadlineDateOnly.setHours(0, 0, 0, 0);
      
      // Check if task is overdue (deadline has passed)
      const isOverdue = deadlineDateOnly < todayOnly;
      
      // Handle already scheduled tasks
      if (task.scheduledTime) {
        const scheduledDate = new Date(task.scheduledTime);
        const scheduledDateOnly = new Date(scheduledDate);
        scheduledDateOnly.setHours(0, 0, 0, 0);
        
        // If the task is scheduled for the target date
        if (scheduledDateOnly.getTime() === targetDateOnly.getTime()) {
          // If it's today and the scheduled time has passed and task isn't done, reschedule it
          if (isToday && scheduledDate <= now && !task.completed) {
            return true;
          }
          // If it's scheduled for today but time hasn't passed, don't reschedule
          if (isToday && scheduledDate > now) {
            return false;
          }
          // For future dates, include scheduled tasks only if we're rescheduling
          return false;
        }
        
        // If scheduled for a past date and task is incomplete, reschedule to target date
        if (scheduledDateOnly < todayOnly && !task.completed) {
          return true;
        }
        
        // If scheduled for a different future date, don't include for this target date
        return false;
      }
      
      // For unscheduled tasks:
      // Include overdue tasks for any date from today onwards (reschedule to next available day)
      if (isOverdue && targetDateOnly >= todayOnly) {
        return true;
      }
      
      // Include tasks due on or after the target date
      return deadlineDateOnly >= targetDateOnly;
    });
  }

  private placeTasks(timetable: TimeBlock[], tasks: Task[], date: Date, currentTime?: Date | null) {
    let lastTaskEndTime: Date | null = null;
    let continuousWorkTime = 0;
    
    for (const task of tasks) {
      const slot = this.findAvailableSlot(timetable, task.duration, date, currentTime, lastTaskEndTime, continuousWorkTime);
      if (slot) {
        const taskBlock: TimeBlock = {
          id: `task-${task.id}-${date.toDateString()}`,
          type: 'task',
          taskId: task.id,
          task: { ...task, scheduledTime: slot.start },
          startTime: slot.start,
          endTime: slot.end,
          title: task.name,
          description: `${task.type} • ${task.priority} priority • ${task.duration}m`
        };
        timetable.push(taskBlock);
        lastTaskEndTime = slot.end;
        continuousWorkTime += task.duration;
        
        // Update the task's scheduled time in our internal tasks array
        this.tasks = this.tasks.map(t => 
          t.id === task.id ? { ...t, scheduledTime: slot.start } : t
        );
        
        // Reset continuous work time after breaks
        if (continuousWorkTime > this.maxContinuousWork) {
          continuousWorkTime = 0;
        }
      }
    }
  }

  private findAvailableSlot(
    timetable: TimeBlock[], 
    duration: number, 
    date: Date, 
    currentTime?: Date | null,
    lastTaskEndTime?: Date | null,
    continuousWorkTime?: number
  ): { start: Date; end: Date } | null {
    const now = currentTime || new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    // Don't allow scheduling on past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      return null; // Can't schedule in the past
    }
    
    let dayStart = new Date(date);
    dayStart.setHours(this.dayStart, 0, 0, 0);
    
    // If today, start from current time (rounded up to next 15min slot)
    if (isToday && now > dayStart) {
      const nextSlot = new Date(now.getTime() + 15 * 60000); // Add 15 minutes buffer
      const minutes = nextSlot.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 15) * 15;
      
      if (roundedMinutes >= 60) {
        dayStart.setHours(nextSlot.getHours() + 1, 0, 0, 0);
      } else {
        dayStart.setHours(nextSlot.getHours(), roundedMinutes, 0, 0);
      }
    }
    
    // Ensure we don't schedule past working hours - task must END before dayEnd
    const dayEnd = new Date(date);
    dayEnd.setHours(this.dayEnd, 0, 0, 0);
    
    // The latest a task can start is dayEnd minus its duration
    const latestTaskStart = new Date(dayEnd.getTime() - duration * 60000);

    // Create time slots (15-minute intervals for better granularity)
    const slots: { start: Date; end: Date; available: boolean }[] = [];
    const current = new Date(dayStart);

    while (current < latestTaskStart) {
      const slotEnd = new Date(current.getTime() + 15 * 60000);
      if (slotEnd <= dayEnd) { // Ensure slot doesn't exceed working hours
        slots.push({
          start: new Date(current),
          end: slotEnd,
          available: true
        });
      }
      current.setTime(current.getTime() + 15 * 60000);
    }

    // Mark unavailable slots - be more strict about conflicts
    timetable.forEach(block => {
      slots.forEach(slot => {
        // Check for any overlap between slot and existing block
        if (this.slotsOverlap(slot.start, slot.end, block.startTime, block.endTime)) {
          slot.available = false;
        }
      });
    });

    // Find consecutive available slots for task duration
    const requiredSlots = Math.ceil(duration / 15);
    
    for (let i = 0; i <= slots.length - requiredSlots; i++) {
      const consecutiveSlots = slots.slice(i, i + requiredSlots);
      
      if (consecutiveSlots.every(slot => slot.available)) {
        const proposedStart = consecutiveSlots[0].start;
        const actualEnd = new Date(proposedStart.getTime() + duration * 60000);
        
        // Ensure the task doesn't extend past working hours
        if (actualEnd > dayEnd) {
          continue;
        }
        
        // Double-check no conflicts with existing blocks
        let hasConflict = false;
        for (const block of timetable) {
          if (this.slotsOverlap(proposedStart, actualEnd, block.startTime, block.endTime)) {
            hasConflict = true;
            break;
          }
        }
        
        if (hasConflict) {
          continue;
        }
        
        // Check if we need a break before this task
        if (lastTaskEndTime && continuousWorkTime && continuousWorkTime >= this.maxContinuousWork) {
          const timeSinceLastTask = proposedStart.getTime() - lastTaskEndTime.getTime();
          const minBreakTime = continuousWorkTime >= 120 ? this.longBreakDuration : this.shortBreakDuration;
          
          if (timeSinceLastTask < minBreakTime * 60000) {
            continue; // Skip this slot, need more break time
          }
        }
        
        return {
          start: proposedStart,
          end: actualEnd
        };
      }
    }

    return null;
  }

  private slotsOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  private insertIntelligentBreaks(timetable: TimeBlock[]) {
    const taskBlocks = timetable.filter(block => block.type === 'task')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const breaksToAdd: TimeBlock[] = [];
    let continuousWorkTime = 0;

    for (let i = 0; i < taskBlocks.length - 1; i++) {
      const currentTask = taskBlocks[i];
      const nextTask = taskBlocks[i + 1];
      
      const taskDuration = currentTask.task?.duration || 0;
      continuousWorkTime += taskDuration;

      // Calculate time gap between tasks
      const timeBetween = nextTask.startTime.getTime() - currentTask.endTime.getTime();
      const minutesBetween = timeBetween / (1000 * 60);

      // Determine if break is needed
      const needsShortBreak = taskDuration >= 45 && minutesBetween >= this.shortBreakDuration;
      const needsLongBreak = continuousWorkTime >= this.maxContinuousWork && minutesBetween >= this.longBreakDuration;
      
      // Avoid scheduling intensive tasks back-to-back
      const currentIntensive = currentTask.task?.priority === 'high' || (currentTask.task?.duration || 0) >= 90;
      const nextIntensive = nextTask.task?.priority === 'high' || (nextTask.task?.duration || 0) >= 90;
      const needsRestBreak = currentIntensive && nextIntensive && minutesBetween >= this.shortBreakDuration;

      if ((needsLongBreak || needsRestBreak || needsShortBreak) && minutesBetween >= this.shortBreakDuration) {
        const breakDuration = needsLongBreak ? this.longBreakDuration : this.shortBreakDuration;
        const breakEnd = new Date(currentTask.endTime.getTime() + breakDuration * 60000);

        if (breakEnd <= nextTask.startTime) {
          const breakType = needsLongBreak ? 'Extended Break' : needsRestBreak ? 'Rest Break' : 'Short Break';
          
          breaksToAdd.push({
            id: `break-${currentTask.id}-${nextTask.id}`,
            type: 'break',
            startTime: new Date(currentTask.endTime),
            endTime: breakEnd,
            title: breakType,
            description: needsLongBreak ? 'Extended rest for wellbeing' : needsRestBreak ? 'Recovery from intensive work' : 'Quick refresh'
          });
          
          // Reset continuous work time after long breaks
          if (needsLongBreak) {
            continuousWorkTime = 0;
          }
        }
      }
      
      // Reset continuous work time if there's a natural long gap
      if (minutesBetween >= 60) {
        continuousWorkTime = 0;
      }
    }

    timetable.push(...breaksToAdd);
  }

  private prioritizeTasks(tasks: Task[], targetDate: Date, currentTime?: Date | null): Task[] {
    const now = currentTime || new Date();
    
    return [...tasks].sort((a, b) => {
      // Calculate urgency scores
      const getScore = (task: Task) => {
        const hoursToDeadline = (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        let score = 0;
        
        // Deadline urgency (0-80)
        if (hoursToDeadline <= 24) score += 80;
        else if (hoursToDeadline <= 48) score += 60;
        else if (hoursToDeadline <= 168) score += 40;
        else score += 15;
        
        // Priority weight (0-40)
        const priorityScores = { high: 40, medium: 25, low: 10 };
        score += priorityScores[task.priority];
        
        // Task type balance (0-15)
        const typeScores = { work: 15, study: 12, leisure: 8 };
        score += typeScores[task.type];
        
        // Reduce score for very long tasks to spread them out
        if (task.duration > 120) score -= 10;
        if (task.duration > 180) score -= 15;
        
        return score;
      };
      
      return getScore(b) - getScore(a);
    });
  }

  rescheduleTask(taskId: string, newStartTime: Date, timetable?: TimeBlock[]): TimeBlock[] {
    // If timetable provided, use it directly; otherwise use last generated timetable
    const currentTimetable = timetable || this.generateTimetable(newStartTime);
    
    const taskIndex = currentTimetable.findIndex(block => block.taskId === taskId);
    if (taskIndex === -1) return currentTimetable;

    const taskBlock = currentTimetable[taskIndex];
    if (!taskBlock.task) return currentTimetable;
    
    const duration = taskBlock.task.duration * 60000; // Convert minutes to milliseconds
    const newEndTime = new Date(newStartTime.getTime() + duration);

    // Check if new time slot is available
    const conflictExists = currentTimetable.some((block, index) => 
      index !== taskIndex && 
      this.slotsOverlap(newStartTime, newEndTime, block.startTime, block.endTime)
    );

    if (!conflictExists) {
      const updatedTimetable = [...currentTimetable];
      updatedTimetable[taskIndex] = {
        ...taskBlock,
        startTime: newStartTime,
        endTime: newEndTime,
        task: taskBlock.task ? { ...taskBlock.task, scheduledTime: newStartTime } : undefined
      };
      
      // Update the task in our tasks array too
      this.tasks = this.tasks.map(task =>
        task.id === taskId ? { ...task, scheduledTime: newStartTime } : task
      );
      
      return updatedTimetable;
    }

    return currentTimetable;
  }

  addUnavailableTime(startTime: Date, endTime: Date, title: string, description?: string): UnavailableBlock {
    const newBlock: UnavailableBlock = {
      id: crypto.randomUUID(),
      startTime,
      endTime,
      title,
      description
    };
    
    this.unavailableBlocks.push(newBlock);
    return newBlock;
  }

  addExceptionToRecurringBlock(blockId: string, exceptionDate: Date): boolean {
    const block = this.unavailableBlocks.find(b => b.id === blockId);
    if (!block || !block.recurring) return false;

    const dateString = exceptionDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!block.recurring.exceptions) {
      block.recurring.exceptions = [];
    }
    
    if (!block.recurring.exceptions.includes(dateString)) {
      block.recurring.exceptions.push(dateString);
    }
    
    return true;
  }

  // Enhanced method to handle rescheduling when unavailable blocks are added  
  addUnavailableBlockAndReschedule(block: UnavailableBlock, targetDate: Date): { 
    updatedTimetable: TimeBlock[], 
    rescheduledTasksCount: number 
  } {
    // Temporarily add the block to check for conflicts (don't persist here, Dashboard will manage state)
    this.unavailableBlocks.push(block);
    
    // Count conflicting tasks that will be rescheduled
    let rescheduledCount = 0;
    
    if (block.recurring) {
      // For recurring blocks, count conflicts across multiple days
      const datesToCheck = [targetDate];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (block.recurring.type === 'daily') {
        // Check next 7 days for daily recurring blocks
        for (let i = 1; i <= 7; i++) {
          const futureDate = new Date(targetDate);
          futureDate.setDate(futureDate.getDate() + i);
          if (futureDate >= today) {
            datesToCheck.push(futureDate);
          }
        }
      } else if (block.recurring.type === 'weekly' && block.recurring.days) {
        // Check next 4 weeks for weekly recurring blocks
        for (let week = 0; week < 4; week++) {
          for (const dayOfWeek of block.recurring.days) {
            const futureDate = new Date(targetDate);
            const daysUntilTarget = (dayOfWeek - targetDate.getDay() + 7) % 7;
            futureDate.setDate(futureDate.getDate() + (week * 7) + daysUntilTarget);
            if (futureDate >= today) {
              datesToCheck.push(futureDate);
            }
          }
        }
      }
      
      // Clear scheduled times for conflicting tasks
      datesToCheck.forEach(date => {
        this.tasks.forEach(task => {
          if (!task.scheduledTime || task.completed) return;
          
          const taskDate = new Date(task.scheduledTime);
          if (taskDate.toDateString() !== date.toDateString()) return;
          
          const blockStart = new Date(date);
          blockStart.setHours(block.startTime.getHours(), block.startTime.getMinutes(), 0, 0);
          const blockEnd = new Date(date);
          blockEnd.setHours(block.endTime.getHours(), block.endTime.getMinutes(), 0, 0);
          
          const taskEnd = new Date(task.scheduledTime.getTime() + task.duration * 60000);
          if (task.scheduledTime < blockEnd && taskEnd > blockStart) {
            task.scheduledTime = undefined; // Clear scheduling, will be rescheduled
            rescheduledCount++;
          }
        });
      });
    } else {
      // For one-time blocks, clear conflicting tasks on the specific date
      const blockStart = new Date(block.startTime);
      const blockEnd = new Date(block.endTime);
      
      this.tasks.forEach(task => {
        if (!task.scheduledTime || task.completed) return;
        
        const taskDate = new Date(task.scheduledTime);
        if (taskDate.toDateString() !== blockStart.toDateString()) return;
        
        const taskEnd = new Date(task.scheduledTime.getTime() + task.duration * 60000);
        if (task.scheduledTime < blockEnd && taskEnd > blockStart) {
          task.scheduledTime = undefined; // Clear scheduling, will be rescheduled
          rescheduledCount++;
        }
      });
    }
    
    // Regenerate timetable to reschedule cleared tasks
    const updatedTimetable = this.generateTimetable(targetDate);
    
    // Remove the temporarily added block - Dashboard will manage the actual state
    this.unavailableBlocks.pop();
    
    return {
      updatedTimetable,
      rescheduledTasksCount: rescheduledCount
    };
  }
}