import { ScheduleBlock, TimeBlock, Task } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, Briefcase, BookOpen, Gamepad2, Calendar } from 'lucide-react';

interface ScheduleTimelineProps {
  schedule: ScheduleBlock[];
  allTasks?: Task[];
}

export default function ScheduleTimeline({ schedule, allTasks = [] }: ScheduleTimelineProps) {
  const getTaskIcon = (type?: string) => {
    switch (type) {
      case 'work': return <Briefcase className="w-4 h-4" />;
      case 'study': return <BookOpen className="w-4 h-4" />;
      case 'leisure': return <Gamepad2 className="w-4 h-4" />;
      default: return <Coffee className="w-4 h-4" />;
    }
  };

  const getBlockColor = (block: ScheduleBlock) => {
    if (block.type === 'break') {
      return 'border-l-accent bg-accent/10';
    }
    
    switch (block.task?.type) {
      case 'work': return 'border-l-primary bg-primary/10';
      case 'study': return 'border-l-secondary bg-secondary/10';
      case 'leisure': return 'border-l-green-500 bg-green-500/10';
      default: return 'border-l-muted bg-muted/10';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const getDuration = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    return Math.round(diff / (1000 * 60));
  };

  // Get all scheduled tasks with their times, sorted chronologically
  const allScheduledTasks = allTasks
    .filter(task => task.scheduledTime && !task.completed)
    .map(task => ({
      ...task,
      scheduledDate: new Date(task.scheduledTime!),
      deadline: new Date(task.deadline)
    }))
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

  if (schedule.length === 0 && allScheduledTasks.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
        <p className="text-muted-foreground">Generate a schedule to see your optimized timeline!</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="space-y-6">
        {/* Today's Schedule */}
        {schedule.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Today's Schedule</h3>
            </div>
            
            <div className="space-y-3">
              {schedule.map((block, index) => (
                <div 
                  key={block.id} 
                  className={`p-4 rounded-lg border-l-4 ${getBlockColor(block)} transition-all duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50">
                        {getTaskIcon(block.task?.type)}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{block.title}</h4>
                        {block.description && (
                          <p className="text-sm text-muted-foreground mt-1">{block.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{formatTime(block.startTime)} - {formatTime(block.endTime)}</span>
                          <span>•</span>
                          <span>{getDuration(block.startTime, block.endTime)}m</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {block.task && (
                        <>
                          <Badge variant={block.task.priority === 'high' ? 'destructive' : 'secondary'}>
                            {block.task.priority}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {block.task.type}
                          </Badge>
                        </>
                      )}
                      {block.type === 'break' && (
                        <Badge className="bg-accent text-accent-foreground">
                          Break
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-background/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total productive time:</span>
                <span className="font-semibold text-foreground">
                  {schedule
                    .filter(block => block.type === 'task')
                    .reduce((total, block) => total + getDuration(block.startTime, block.endTime), 0)}m
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Break time:</span>
                <span className="font-semibold text-foreground">
                  {schedule
                    .filter(block => block.type === 'break')
                    .reduce((total, block) => total + getDuration(block.startTime, block.endTime), 0)}m
                </span>
              </div>
            </div>
          </div>
        )}

        {/* All Scheduled Tasks */}
        {allScheduledTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-secondary" />
              <h3 className="text-lg font-semibold text-foreground">All Scheduled Tasks</h3>
            </div>
            
            <div className="space-y-3">
              {allScheduledTasks.map((task) => {
                const isOverdue = task.deadline < new Date();
                const isToday = task.scheduledDate.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={task.id} 
                    className={`p-4 rounded-lg border-l-4 transition-all duration-200 hover:scale-[1.02] ${
                      task.priority === 'high' ? 'border-l-destructive bg-destructive/10' :
                      task.priority === 'medium' ? 'border-l-warning bg-warning/10' :
                      'border-l-success bg-success/10'
                    } ${isOverdue ? 'bg-destructive/20 border-l-destructive' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50">
                          {getTaskIcon(task.type)}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{task.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.type} • {task.priority} priority • {task.duration}m
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className={isToday ? 'font-medium text-primary' : ''}>
                              {formatDate(task.scheduledDate)} at {formatTime(task.scheduledDate)}
                            </span>
                            <span>•</span>
                            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                              Due: {formatDate(task.deadline)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {task.type}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        )}
                        {isToday && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            Today
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}