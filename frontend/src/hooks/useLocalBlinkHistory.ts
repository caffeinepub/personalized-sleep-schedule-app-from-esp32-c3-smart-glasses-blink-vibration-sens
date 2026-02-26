import { useState, useCallback, useEffect } from 'react';

export interface BlinkRateDataPoint {
  timestamp: number;
  blinkRate: number;
  /** Eye state classification derived from light level thresholds, if available. */
  eyeState?: 'blink' | 'eyes open' | null;
}

const STORAGE_KEY = 'blink_history';
const MAX_HISTORY_POINTS = 1000;

function loadFromStorage(): BlinkRateDataPoint[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.warn('Failed to load blink history from localStorage:', error);
  }
  return [];
}

function saveToStorage(data: BlinkRateDataPoint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save blink history to localStorage:', error);
  }
}

export function useLocalBlinkHistory() {
  const [history, setHistory] = useState<BlinkRateDataPoint[]>(() => loadFromStorage());
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  /**
   * Adds a new blink rate data point to history.
   * @param blinkRate - The blink rate value to record.
   * @param eyeState  - Optional eye state label ('blink' | 'eyes open' | null).
   */
  const addDataPoint = useCallback((blinkRate: number, eyeState?: 'blink' | 'eyes open' | null) => {
    const dataPoint: BlinkRateDataPoint = {
      timestamp: Date.now(),
      blinkRate,
      ...(eyeState !== undefined ? { eyeState } : {}),
    };

    setHistory((prev) => {
      const updated = [...prev, dataPoint];
      const trimmed = updated.slice(-MAX_HISTORY_POINTS);
      
      // Save to localStorage
      saveToStorage(trimmed);
      setLastSaveTime(Date.now());
      
      return trimmed;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear blink history from localStorage:', error);
    }
  }, []);

  // Load from storage on mount
  useEffect(() => {
    const loaded = loadFromStorage();
    if (loaded.length > 0) {
      setHistory(loaded);
    }
  }, []);

  return {
    history,
    addDataPoint,
    clearHistory,
    lastSaveTime,
    totalPoints: history.length,
  };
}
