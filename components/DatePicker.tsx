import React, { useState } from 'react';
import { Icons } from '../constants';
import { addDaysLocalIsoDate, toLocalIsoDate } from '../utils/date';

interface DatePickerProps {
  selectedDate?: string; // YYYY-MM-DD
  onSelect: (date: string | undefined) => void;
  onClose: () => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onSelect, onClose }) => {
  // Initialize view based on selected date or today
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });

  const todayStr = toLocalIsoDate(new Date());

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelect = (day: number) => {
     const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
     onSelect(toLocalIsoDate(newDate));
     onClose();
  };

  const handleQuickAction = (action: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
      const today = new Date();
      if (action === 'today') {
          onSelect(toLocalIsoDate(today));
      } else if (action === 'tomorrow') {
          onSelect(addDaysLocalIsoDate(1, today));
      } else if (action === 'nextWeek') {
          onSelect(addDaysLocalIsoDate(7, today));
      } else if (action === 'clear') {
          onSelect(undefined);
      }
      onClose();
  };

  // Calendar Logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div 
        className="absolute top-full right-0 mt-2 z-50 w-72 bg-primary-50 dark:bg-dark-bg rounded-xl shadow-lg ring-1 ring-primary-200/50 dark:ring-dark-border/50 p-6 animate-in fade-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-bold text-primary-900 dark:text-dark-text pl-1">
                {monthNames[month]} {year}
            </span>
            <div className="flex gap-1">
                <button 
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="p-1.5 rounded-full hover:bg-primary-200/50 dark:hover:bg-dark-border text-primary-500 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text transition-colors"
                >
                    <Icons.ChevronLeft />
                </button>
                <button
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="p-1.5 rounded-full hover:bg-primary-200/50 dark:hover:bg-dark-border text-primary-500 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text transition-colors"
                >
                    <Icons.ChevronRight />
                </button>
            </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 mb-2 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-[10px] font-bold text-primary-400 dark:text-dark-muted uppercase">
                    {d}
                </div>
            ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-1 mb-4">
            {blanks.map((_, i) => <div key={`blank-${i}`} />)}
            {days.map(d => {
                const dateStr = toLocalIsoDate(new Date(year, month, d));
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;

                return (
                    <button
                        key={d}
                        onClick={() => handleSelect(d)}
                        className={`
                            h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200
                            ${isSelected
                                ? 'bg-[var(--accent)] text-white dark:bg-[var(--accent)] dark:text-white shadow-md scale-105 font-bold'
                                : 'text-primary-700 dark:text-dark-text hover:bg-primary-200/50 dark:hover:bg-dark-border'}
                            ${!isSelected && isToday ? 'text-[var(--accent)] font-bold bg-[var(--accent-soft)]' : ''}
                        `}
                    >
                        {d}
                    </button>
                );
            })}
        </div>
        
        {/* Shortcuts */}
        <div className="pt-3 border-t border-primary-200/80 dark:border-dark-border flex flex-wrap gap-2">
            <button 
                onClick={() => handleQuickAction('today')}
                className="px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-dark-border text-[10px] font-bold text-primary-600 dark:text-dark-text hover:bg-primary-200/50 dark:hover:bg-dark-border transition-colors"
            >
                Today
            </button>
            <button 
                onClick={() => handleQuickAction('tomorrow')}
                className="px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-dark-border text-[10px] font-bold text-primary-600 dark:text-dark-text hover:bg-primary-200/50 dark:hover:bg-dark-border transition-colors"
            >
                Tomorrow
            </button>
            <button 
                onClick={() => handleQuickAction('nextWeek')}
                className="px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-dark-border text-[10px] font-bold text-primary-600 dark:text-dark-text hover:bg-primary-200/50 dark:hover:bg-dark-border transition-colors"
            >
                Next Week
            </button>
            <button 
                onClick={() => handleQuickAction('clear')}
                className="px-3 py-1.5 rounded-lg border border-transparent hover:border-[var(--status-danger-border)] text-[10px] font-bold text-primary-400 dark:text-dark-muted hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] transition-colors ml-auto"
            >
                Clear
            </button>
        </div>
    </div>
  );
};
