import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';

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

  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(new Date());

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
     onSelect(getLocalDateStr(newDate));
     onClose();
  };

  const handleQuickAction = (action: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
      const today = new Date();
      if (action === 'today') {
          onSelect(getLocalDateStr(today));
      } else if (action === 'tomorrow') {
          const tmr = new Date(today);
          tmr.setDate(today.getDate() + 1);
          onSelect(getLocalDateStr(tmr));
      } else if (action === 'nextWeek') {
          const next = new Date(today);
          next.setDate(today.getDate() + 7);
          onSelect(getLocalDateStr(next));
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
        className="absolute top-full right-0 mt-2 z-50 w-72 bg-white dark:bg-zinc-900 rounded-[24px] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-6 animate-in fade-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-bold text-black dark:text-white pl-1">
                {monthNames[month]} {year}
            </span>
            <div className="flex gap-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                    <Icons.ChevronLeft />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                    <Icons.ChevronRight />
                </button>
            </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 mb-2 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase">
                    {d}
                </div>
            ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-1 mb-4">
            {blanks.map((_, i) => <div key={`blank-${i}`} />)}
            {days.map(d => {
                const dateStr = getLocalDateStr(new Date(year, month, d));
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;

                return (
                    <button
                        key={d}
                        onClick={() => handleSelect(d)}
                        className={`
                            h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200
                            ${isSelected 
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-md scale-105 font-bold' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'}
                            ${!isSelected && isToday ? 'text-blue-500 font-bold bg-blue-50 dark:bg-blue-900/20' : ''}
                        `}
                    >
                        {d}
                    </button>
                );
            })}
        </div>
        
        {/* Shortcuts */}
        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap gap-2">
            <button 
                onClick={() => handleQuickAction('today')}
                className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
                Today
            </button>
            <button 
                onClick={() => handleQuickAction('tomorrow')}
                className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
                Tomorrow
            </button>
            <button 
                onClick={() => handleQuickAction('nextWeek')}
                className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
                Next Week
            </button>
            <button 
                onClick={() => handleQuickAction('clear')}
                className="px-3 py-1.5 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-900/30 text-[10px] font-bold text-gray-400 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors ml-auto"
            >
                Clear
            </button>
        </div>
    </div>
  );
};