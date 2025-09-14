import { useState, FormEvent } from 'react';
import { Task, TaskType, Priority } from '@/types/task';
import { Button, Input, Label, Card, Badge } from '@/components/ui/basic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox } from '@/components/ui/forms';
import { Calendar, Clock, Flag, Briefcase, Trash2 } from 'lucide-react';

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
}

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

// Task Form Component
export function TaskForm({ onSubmit }: TaskFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    deadline: '',
    priority: '' as Priority,
    type: '' as TaskType
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.duration || !formData.deadline || !formData.priority || !formData.type) {
      return;
    }

    const task = {
      name: formData.name,
      duration: parseInt(formData.duration),
      deadline: new Date(formData.deadline),
      priority: formData.priority,
      type: formData.type
    };

    onSubmit(task);
    setFormData({
      name: '',
      duration: '',
      deadline: '',
      priority: '' as Priority,
      type: '' as TaskType
    });
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2 text-foreground">
            <Briefcase className="w-4 h-4 text-primary" />
            Task Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your task..."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background/50 border-border"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2 text-foreground">
              <Clock className="w-4 h-4 text-primary" />
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              placeholder="60"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="bg-background/50 border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-2 text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              Deadline
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="bg-background/50 border-border"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Flag className="w-4 h-4 text-primary" />
              Priority
            </Label>
            <Select value={formData.priority} onValueChange={(value: Priority) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger className="bg-background/50 border-border">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Briefcase className="w-4 h-4 text-primary" />
              Type
            </Label>
            <Select value={formData.type} onValueChange={(value: TaskType) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="bg-background/50 border-border">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="study">Study</SelectItem>
                <SelectItem value="leisure">Leisure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
          Add Task
        </Button>
      </form>
    </Card>
  );
}

// Task List Component
export function TaskList({ tasks, onToggleComplete, onDeleteTask }: TaskListProps) {
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-accent text-accent-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (type: Task['type']) => {
    switch (type) {
      case 'work': return 'bg-primary text-primary-foreground';
      case 'study': return 'bg-secondary text-secondary-foreground';
      case 'leisure': return 'bg-gradient-success text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDeadline = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 0) return 'Overdue';
    if (hours < 24) return `${hours}h remaining`;
    const days = Math.floor(hours / 24);
    return `${days}d remaining`;
  };

  if (tasks.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-card border-border shadow-card">
        <p className="text-muted-foreground">No tasks yet. Add your first task to get started!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className={`p-4 transition-all duration-200 bg-gradient-card border-border shadow-card hover:shadow-glow ${
            task.completed ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => onToggleComplete(task.id)}
              className="mt-1"
            />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className={`font-semibold ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteTask(task.id)}
                  className="text-muted-foreground hover:text-destructive p-1 h-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {task.duration}m
                </div>
                
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDeadline(task.deadline)}
                </div>
                
                <Badge className={getPriorityColor(task.priority)}>
                  <Flag className="w-3 h-3 mr-1" />
                  {task.priority}
                </Badge>
                
                <Badge className={getTypeColor(task.type)}>
                  {task.type}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}