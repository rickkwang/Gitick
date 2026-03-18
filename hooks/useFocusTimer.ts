import { useCallback, useEffect, useRef, useState } from 'react';
import { FOCUS_DEFAULT_SECONDS, FocusModeType, formatTimerLabel, getDefaultFocusSeconds } from '../utils/focusTimer';
import { playSuccessSound } from '../utils/audio';

interface UseFocusTimerOptions {
  filter: string;
  showToast: (message: string) => void;
}

export interface UseFocusTimerReturn {
  focusTimeLeft: number;
  isFocusActive: boolean;
  focusModeType: FocusModeType;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  handleSetTimeLeft: (val: number | ((prev: number) => number)) => void;
  handleFocusModeChange: (nextMode: FocusModeType) => void;
  resetFocusState: () => void;
}

export const useFocusTimer = ({ filter, showToast }: UseFocusTimerOptions): UseFocusTimerReturn => {
  const [focusEndTime, setFocusEndTime] = useState<number | null>(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState(FOCUS_DEFAULT_SECONDS);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [focusModeType, setFocusModeType] = useState<FocusModeType>('focus');
  const isFocusActiveRef = useRef(isFocusActive);

  useEffect(() => {
    isFocusActiveRef.current = isFocusActive;
  }, [isFocusActive]);

  const switchTimerMode = useCallback((nextMode: FocusModeType, autoStart = false) => {
    const nextDuration = getDefaultFocusSeconds(nextMode);
    setFocusModeType(nextMode);
    setFocusTimeLeft(nextDuration);
    if (autoStart) {
      setFocusEndTime(Date.now() + nextDuration * 1000);
      setIsFocusActive(true);
      return;
    }
    setFocusEndTime(null);
    setIsFocusActive(false);
  }, []);

  const startTimer = () => {
    if (isFocusActiveRef.current) return;
    const startSeconds = Math.max(1, Math.floor(focusTimeLeft));
    setFocusTimeLeft(startSeconds);
    setFocusEndTime(Date.now() + startSeconds * 1000);
    setIsFocusActive(true);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const pauseTimer = () => {
    setIsFocusActive(false);
    setFocusEndTime(null);
  };

  const resetTimer = () => {
    pauseTimer();
    setFocusTimeLeft(getDefaultFocusSeconds(focusModeType));
  };

  // Timer tick
  useEffect(() => {
    let interval: number | null = null;

    if (isFocusActive && focusEndTime) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((focusEndTime - now) / 1000);

        if (diff <= 0) {
          const completedMode = focusModeType;
          const nextMode = completedMode === 'focus' ? 'break' : 'focus';
          document.title = 'Gitick - Done!';
          const msg =
            completedMode === 'focus'
              ? 'Focus session finished. Time for a break.'
              : 'Break finished. Back to focus.';
          showToast(msg);
          playSuccessSound();
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Gitick Timer', { body: msg, icon: '/favicon.ico' });
          }
          switchTimerMode(nextMode, true);
        } else {
          const shouldSyncThisTick = filter === 'focus' || diff <= 60 || diff % 10 === 0;
          if (shouldSyncThisTick) {
            setFocusTimeLeft((prev) => (prev === diff ? prev : diff));
          }
          document.title = `${formatTimerLabel(diff)} - ${focusModeType === 'focus' ? 'Focus' : 'Break'}`;
        }
      }, 1000);
    } else {
      document.title = 'Gitick - Minimalist Tasks';
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusActive, focusEndTime, focusModeType, switchTimerMode, filter, showToast]);

  const handleSetTimeLeft = (val: number | ((prev: number) => number)) => {
    setFocusTimeLeft((prev) => {
      const nextValue = typeof val === 'function' ? val(prev) : val;
      const safeValue = Math.max(1, Math.floor(nextValue));
      if (isFocusActiveRef.current) {
        setFocusEndTime(Date.now() + safeValue * 1000);
      }
      return safeValue;
    });
  };

  const handleFocusModeChange = (nextMode: FocusModeType) => {
    switchTimerMode(nextMode, false);
  };

  const resetFocusState = () => {
    setFocusEndTime(null);
    setFocusTimeLeft(FOCUS_DEFAULT_SECONDS);
    setIsFocusActive(false);
    setFocusModeType('focus');
  };

  return {
    focusTimeLeft,
    isFocusActive,
    focusModeType,
    startTimer,
    pauseTimer,
    resetTimer,
    handleSetTimeLeft,
    handleFocusModeChange,
    resetFocusState,
  };
};
