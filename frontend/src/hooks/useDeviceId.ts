import { useState, useEffect } from 'react';

const DEVICE_ID_KEY = 'sleep-tracker-device-id';

export function useDeviceId() {
  const [deviceId, setDeviceIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(DEVICE_ID_KEY) || '';
    } catch {
      return '';
    }
  });

  const setDeviceId = (id: string) => {
    setDeviceIdState(id);
    try {
      if (id) {
        localStorage.setItem(DEVICE_ID_KEY, id);
      } else {
        localStorage.removeItem(DEVICE_ID_KEY);
      }
    } catch (error) {
      console.warn('Failed to persist device ID:', error);
    }
  };

  const isValid = deviceId.trim().length > 0;

  return { deviceId, setDeviceId, isValid };
}
