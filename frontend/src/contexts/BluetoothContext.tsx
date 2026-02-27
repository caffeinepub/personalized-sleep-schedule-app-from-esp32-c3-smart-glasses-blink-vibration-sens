import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { normalizeUUID, formatUUID } from '../utils/bleUuid';
import { 
  NUS_SERVICE_UUID, 
  NUS_TX_CHARACTERISTIC_UUID,
  CCCD_UUID,
  parseNusBlinkRate,
  parseBlinkRateFromText,
  parseHeartRateBlinkRate,
  parseEyeStateToken,
  parseBatteryData,
  parseChargingStatus,
  parseEyeStateFromLight,
  EYES_CLOSED_MAX,
  BLINK_MIN,
  BLINK_MAX,
  EYES_OPEN_MIN,
  EYES_OPEN_MAX,
} from '../utils/bleNus';
import { useLocalBlinkHistory } from '../hooks/useLocalBlinkHistory';
import { useActor } from '../hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface BluetoothContextValue {
  connectionState: ConnectionState;
  error: string | null;
  connect: (options: ConnectOptions) => Promise<void>;
  disconnect: () => void;
  isSupported: boolean;
  onBlinkRateChange?: (blinkRate: number) => void;
  setOnBlinkRateChange: (callback: (blinkRate: number) => void) => void;
  latestReading: string | null;
  batteryPercentage: number | undefined;
  isCharging: boolean;
  /** Sends a vibration trigger BLE command and records actuation latency on the backend. */
  triggerVibration: () => Promise<void>;
}

interface ConnectOptions {
  serviceUUID?: string | number;
  characteristicUUID?: string | number;
  autoDiscover?: boolean;
  useCustomProfile?: boolean;
}

interface BlinkTimestamp {
  timestamp: number;
}

const BluetoothContext = createContext<BluetoothContextValue | undefined>(undefined);

const MIN_CONNECTION_INTERVAL_MS = 2000;
const MTU_EXCHANGE_DELAY_MS = 500;

// Calibrated eye state thresholds — derived from bleNus.ts constants (single source of truth)
// Eyes closed:  lightLevel < EYES_CLOSED_MAX (< 600, exclusive)
// Blink:        BLINK_MIN (1500) – BLINK_MAX (1700) inclusive
// Eyes open:    EYES_OPEN_MIN (1800) – EYES_OPEN_MAX (2000) inclusive
const ROLLING_WINDOW_MS = 60000; // 60 seconds

type EyeState = 'open' | 'closed' | 'unknown';

export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => 'bluetooth' in navigator && navigator.bluetooth !== undefined);
  const [latestReading, setLatestReading] = useState<string | null>(null);
  const [batteryPercentage, setBatteryPercentage] = useState<number | undefined>(undefined);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const disconnectListenerRef = useRef<((event: Event) => void) | null>(null);
  const onBlinkRateChangeRef = useRef<((blinkRate: number) => void) | undefined>(undefined);
  const notificationsEnabledRef = useRef<boolean>(false);
  
  const isConnectingRef = useRef(false);
  const lastAttemptStartRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attemptTokenRef = useRef<number>(0);

  // Blink detection state with calibrated eye state tracking
  const blinkTimestampsRef = useRef<BlinkTimestamp[]>([]);
  const currentEyeStateRef = useRef<EyeState>('unknown');

  // Local blink history for persisting eye state events
  const { addDataPoint } = useLocalBlinkHistory();

  // Backend actor for latency recording
  const { actor } = useActor();
  const actorRef = useRef(actor);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  const queryClient = useQueryClient();

  const setOnBlinkRateChange = useCallback((callback: (blinkRate: number) => void) => {
    onBlinkRateChangeRef.current = callback;
  }, []);

  /**
   * Classifies a raw light level into an EyeState using the canonical threshold
   * constants from bleNus.ts.
   *
   * - 'closed'  when lightLevel < EYES_CLOSED_MAX (< 600)
   * - 'closed'  when lightLevel is in [BLINK_MIN, BLINK_MAX] (1500–1700)
   * - 'open'    when lightLevel is in [EYES_OPEN_MIN, EYES_OPEN_MAX] (1800–2000)
   * - 'unknown' otherwise
   */
  const classifyEyeState = (lightLevel: number): EyeState => {
    if (lightLevel < EYES_CLOSED_MAX) {
      return 'closed';
    } else if (lightLevel >= EYES_OPEN_MIN && lightLevel <= EYES_OPEN_MAX) {
      return 'open';
    } else if (lightLevel >= BLINK_MIN && lightLevel <= BLINK_MAX) {
      return 'closed';
    } else {
      return 'unknown';
    }
  };

  const handleCharacteristicValueChanged = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    
    if (!value) return;

    // Decode as UTF-8 text for raw display
    let decodedText = '';
    try {
      const decoder = new TextDecoder('utf-8');
      decodedText = decoder.decode(value);
      setLatestReading(decodedText.trim());
    } catch (err) {
      console.warn('Failed to decode as UTF-8 text:', err);
    }

    // Parse battery data from the notification
    if (decodedText) {
      const batteryData = parseBatteryData(decodedText);
      if (batteryData !== null) {
        setBatteryPercentage(batteryData.percentage);
        setIsCharging(batteryData.isCharging);
      } else {
        // Check for standalone charging status update
        const chargingStatus = parseChargingStatus(decodedText);
        if (chargingStatus !== null) {
          setIsCharging(chargingStatus);
        }
      }
    }

    const now = Date.now();
    let newEyeState: EyeState = 'unknown';

    // First, check for eye-state tokens (e.g., "close", "open")
    if (decodedText) {
      const eyeStateToken = parseEyeStateToken(decodedText);
      
      if (eyeStateToken === 'close') {
        newEyeState = 'closed';
        const previousEyeState = currentEyeStateRef.current;
        
        // Count a blink on transition to closed (from open or unknown)
        // De-duplication: only count if we weren't already in closed state
        if (previousEyeState !== 'closed') {
          blinkTimestampsRef.current.push({ timestamp: now });
          // Record eye-closed timestamp on the backend (fire-and-forget)
          if (actorRef.current) {
            actorRef.current.recordEyeClosedTimestamp().catch(() => {});
          }
        }
      } else if (eyeStateToken === 'open') {
        newEyeState = 'open';
      }
    }

    // If no token was detected, try parsing numeric light level
    if (newEyeState === 'unknown') {
      let rawSensorValue: number | null = null;
      
      if (decodedText) {
        rawSensorValue = parseBlinkRateFromText(decodedText);
      }

      if (rawSensorValue === null) {
        rawSensorValue = parseNusBlinkRate(value);
      }
      
      if (rawSensorValue === null) {
        rawSensorValue = parseHeartRateBlinkRate(value);
      }

      // Only process numeric values if we got one
      if (rawSensorValue !== null) {
        newEyeState = classifyEyeState(rawSensorValue);
        const previousEyeState = currentEyeStateRef.current;

        // Use parseEyeStateFromLight to get the canonical eye state label for recording
        const eyeStateLabel = parseEyeStateFromLight(rawSensorValue);

        if (eyeStateLabel !== null) {
          // Record the event with its eye state label into local blink history
          // Use the current rolling blink count as the blinkRate value
          const currentBlinkCount = blinkTimestampsRef.current.length;
          addDataPoint(currentBlinkCount, eyeStateLabel);
        }

        // Count a blink on transition from open to closed (numeric path)
        if (previousEyeState === 'open' && newEyeState === 'closed') {
          blinkTimestampsRef.current.push({ timestamp: now });
          // Record eye-closed timestamp on the backend (fire-and-forget)
          if (actorRef.current) {
            actorRef.current.recordEyeClosedTimestamp().catch(() => {});
          }
        }
      }
    }
    
    // Update current eye state if we determined a new state
    if (newEyeState !== 'unknown') {
      currentEyeStateRef.current = newEyeState;
    }

    // Prune timestamps older than 60 seconds
    const cutoffTime = now - ROLLING_WINDOW_MS;
    blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
      (blink) => blink.timestamp >= cutoffTime
    );

    // Calculate blinks per minute (count of blinks in the last 60 seconds)
    const blinksInWindow = blinkTimestampsRef.current.length;

    // Emit the computed blink rate
    if (onBlinkRateChangeRef.current) {
      onBlinkRateChangeRef.current(blinksInWindow);
    }
  }, [addDataPoint]);

  const cleanupConnection = useCallback(() => {
    if (characteristicRef.current) {
      try {
        characteristicRef.current.stopNotifications().catch(() => {});
        characteristicRef.current.removeEventListener(
          'characteristicvaluechanged',
          handleCharacteristicValueChanged as EventListener
        );
      } catch (err) {
        console.warn('Error cleaning up characteristic:', err);
      }
      characteristicRef.current = null;
    }

    if (deviceRef.current && disconnectListenerRef.current) {
      try {
        deviceRef.current.removeEventListener('gattserverdisconnected', disconnectListenerRef.current);
      } catch (err) {
        console.warn('Error removing disconnect listener:', err);
      }
      disconnectListenerRef.current = null;
    }

    if (serverRef.current?.connected) {
      try {
        serverRef.current.disconnect();
      } catch (err) {
        console.warn('Error disconnecting GATT server:', err);
      }
    }
    
    serverRef.current = null;
    notificationsEnabledRef.current = false;
  }, [handleCharacteristicValueChanged]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    cleanupConnection();
    deviceRef.current = null;
    isConnectingRef.current = false;
    setConnectionState('disconnected');
    setLatestReading(null);
    
    // Reset blink detection state
    blinkTimestampsRef.current = [];
    currentEyeStateRef.current = 'unknown';

    // Reset battery state
    setBatteryPercentage(undefined);
    setIsCharging(false);
  }, [cleanupConnection]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (deviceRef.current && serverRef.current) {
        const isActuallyConnected = serverRef.current.connected;
        
        if (!isActuallyConnected && connectionState === 'connected') {
          setConnectionState('disconnected');
          notificationsEnabledRef.current = false;
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [connectionState]);

  const connect = useCallback(async (options: ConnectOptions = {}) => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser.');
      return;
    }

    const now = Date.now();
    if (isConnectingRef.current) {
      return;
    }
    if (now - lastAttemptStartRef.current < MIN_CONNECTION_INTERVAL_MS) {
      return;
    }

    isConnectingRef.current = true;
    lastAttemptStartRef.current = now;
    const myToken = ++attemptTokenRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setConnectionState('connecting');
    setError(null);

    try {
      cleanupConnection();

      const characteristicUUID = options.characteristicUUID ?? NUS_TX_CHARACTERISTIC_UUID;
      const normalizedCharacteristicUUID = normalizeUUID(characteristicUUID);

      // Use acceptAllDevices so the browser shows all nearby BLE devices,
      // and declare the NUS service UUID in optionalServices so GATT access is granted.
      const requestOptions: RequestDeviceOptions = {
        acceptAllDevices: true,
        optionalServices: [NUS_SERVICE_UUID],
      };

      const device = await navigator.bluetooth!.requestDevice(requestOptions);

      if (myToken !== attemptTokenRef.current) {
        isConnectingRef.current = false;
        return;
      }

      deviceRef.current = device;

      const onDisconnect = () => {
        if (myToken !== attemptTokenRef.current) return;
        setConnectionState('disconnected');
        notificationsEnabledRef.current = false;
      };
      disconnectListenerRef.current = onDisconnect;
      device.addEventListener('gattserverdisconnected', onDisconnect);

      const server = await device.gatt!.connect();

      if (myToken !== attemptTokenRef.current) {
        server.disconnect();
        isConnectingRef.current = false;
        return;
      }

      serverRef.current = server;

      await new Promise(resolve => setTimeout(resolve, MTU_EXCHANGE_DELAY_MS));

      if (myToken !== attemptTokenRef.current) {
        server.disconnect();
        isConnectingRef.current = false;
        return;
      }

      let service: BluetoothRemoteGATTService;
      try {
        service = await server.getPrimaryService(NUS_SERVICE_UUID);
      } catch (err) {
        throw new Error(`NUS Service (${NUS_SERVICE_UUID}) not found on device. Make sure the device is advertising the correct service.`);
      }

      let characteristic: BluetoothRemoteGATTCharacteristic;
      try {
        characteristic = await service.getCharacteristic(normalizedCharacteristicUUID);
      } catch (err) {
        throw new Error(`Characteristic ${formatUUID(characteristicUUID)} not found in NUS service.`);
      }

      characteristicRef.current = characteristic;

      characteristic.addEventListener(
        'characteristicvaluechanged',
        handleCharacteristicValueChanged as EventListener
      );

      await characteristic.startNotifications();
      notificationsEnabledRef.current = true;

      // Attempt to enable CCCD (0x2902) descriptor for notifications
      try {
        const cccdDescriptor = await (characteristic as any).getDescriptor(CCCD_UUID);
        if (cccdDescriptor) {
          const enableNotifications = new Uint8Array([0x01, 0x00]);
          await cccdDescriptor.writeValue(enableNotifications);
        }
      } catch (cccdErr) {
        // CCCD write is optional; startNotifications() may handle it automatically
      }

      if (myToken !== attemptTokenRef.current) {
        server.disconnect();
        isConnectingRef.current = false;
        return;
      }

      setConnectionState('connected');
    } catch (err: any) {
      if (myToken !== attemptTokenRef.current) {
        isConnectingRef.current = false;
        return;
      }

      if (err?.name === 'NotFoundError' || err?.message?.includes('User cancelled')) {
        setError('Device selection cancelled.');
      } else if (err?.name === 'SecurityError') {
        setError('Bluetooth permission denied. Please allow Bluetooth access.');
      } else if (err?.name === 'NetworkError') {
        setError('Failed to connect to device. Make sure it is powered on and in range.');
      } else {
        setError(err?.message ?? 'Unknown Bluetooth error occurred.');
      }
      setConnectionState('disconnected');
    } finally {
      if (myToken === attemptTokenRef.current) {
        isConnectingRef.current = false;
      }
    }
  }, [isSupported, cleanupConnection, handleCharacteristicValueChanged]);

  /**
   * Sends a 'trigger-vibration' BLE write command and records actuation latency
   * on the backend by calling triggerVibrationAndCalculateLatency().
   */
  const triggerVibration = useCallback(async () => {
    // Write the vibration command over BLE if connected
    if (characteristicRef.current && serverRef.current?.connected) {
      try {
        const encoder = new TextEncoder();
        const command = encoder.encode('trigger-vibration');
        // Use writeValueWithoutResponse if available, otherwise writeValue
        const char = characteristicRef.current as any;
        if (char.writeValueWithoutResponse) {
          await char.writeValueWithoutResponse(command);
        } else {
          await char.writeValue(command);
        }
      } catch (err) {
        console.warn('BLE vibration write failed:', err);
      }
    }

    // Calculate and store actuation latency on the backend
    if (actorRef.current) {
      try {
        await actorRef.current.triggerVibrationAndCalculateLatency();
        // Invalidate the latency query so the dashboard refreshes immediately
        queryClient.invalidateQueries({ queryKey: ['actuationLatency'] });
      } catch (err) {
        console.warn('Failed to record actuation latency:', err);
      }
    }
  }, [queryClient]);

  const value: BluetoothContextValue = {
    connectionState,
    error,
    connect,
    disconnect,
    isSupported,
    setOnBlinkRateChange,
    latestReading,
    batteryPercentage,
    isCharging,
    triggerVibration,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth(): BluetoothContextValue {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
}
