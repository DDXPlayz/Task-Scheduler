import React, { useState } from 'react';
import { format, addDays, subDays, startOfToday, isAfter, isBefore } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export default function DateSelector({ selectedDate, onDateChange, className }: DateSelectorProps) {
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  
  const today = startOfToday();

  const handlePreviousDay = () => {
    const previousDay = subDays(selectedDate, 1);
    if (isBefore(previousDay, today)) {
      toast({
        title: "Cannot go to past dates",
        description: "You can only view schedules for today and future dates.",
        variant: "destructive"
      });
      return;
    }
    onDateChange(previousDay);
  };

  const handleNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    onDateChange(nextDay);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (isBefore(date, today)) {
      toast({
        title: "Cannot select past dates",
        description: "You can only schedule for today and future dates.",
        variant: "destructive"
      });
      return;
    }
    
    onDateChange(date);
    setIsCalendarOpen(false);
  };

  const handleManualInput = (value: string) => {
    setManualInput(value);
    
    if (value.length === 10) { // YYYY-MM-DD format
      const date = new Date(value + 'T12:00:00'); // Add noon to avoid timezone issues
      
      if (!isNaN(date.getTime())) {
        if (isBefore(date, today)) {
          toast({
            title: "Cannot select past dates",
            description: "You can only schedule for today and future dates.",
            variant: "destructive"
          });
          return;
        }
        onDateChange(date);
        setManualInput('');
      }
    }
  };

  const formatSelectedDate = () => {
    return format(selectedDate, 'EEEE, MMMM d, yyyy');
  };

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isTomorrow = selectedDate.toDateString() === addDays(today, 1).toDateString();

  return (
    <Card className={cn("p-4 bg-gradient-card border-border shadow-card", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">Date Selection</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousDay}
              disabled={isBefore(subDays(selectedDate, 1), today)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleCalendarSelect}
                  disabled={(date) => isBefore(date, today)}
                  initialFocus
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">
            {formatSelectedDate()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {isToday && "Today"}
            {isTomorrow && "Tomorrow"}
            {!isToday && !isTomorrow && format(selectedDate, 'EEEE')}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-date" className="text-sm text-muted-foreground">
            Or enter date manually (YYYY-MM-DD):
          </Label>
          <Input
            id="manual-date"
            type="date"
            min={format(today, 'yyyy-MM-dd')}
            value={manualInput || format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => handleManualInput(e.target.value)}
            className="text-center"
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(today)}
            disabled={isToday}
            className="flex-1"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(addDays(today, 1))}
            disabled={isTomorrow}
            className="flex-1"
          >
            Tomorrow
          </Button>
        </div>
      </div>
    </Card>
  );
}