import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { normalizeUUID, formatUUID } from '../utils/bleUuid';
import { 
  NUS_SERVICE_UUID, 
  NUS_TX_CHARACTERISTIC_UUID,
  CCCD_UUID,
  parseNusBlinkRate,
  parseBlinkRateFromText,
  parseHeartRateBlinkRate
} from '../utils/bleNus';

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

// Calibrated eye state thresholds based on observed light levels
const EYE_OPEN_THRESHOLD = 220; // Values >= 220 indicate eye is open (observed range: 250-290)
const EYE_CLOSED_THRESHOLD = 200; // Values <= 200 indicate eye is closed (observed range: 160-180)
const ROLLING_WINDOW_MS = 60000; // 60 seconds

type EyeState = 'open' | 'closed' | 'unknown';

function toServiceString(uuid: string | number): string {
  if (typeof uuid === 'number') {
    const hex = uuid.toString(16).padStart(4, '0');
    return `0000${hex}-0000-1000-8000-00805f9b34fb`;
  }
  return uuid;
}

export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => 'bluetooth' in navigator && navigator.bluetooth !== undefined);
  const [latestReading, setLatestReading] = useState<string | null>(null);
  
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

  const setOnBlinkRateChange = useCallback((callback: (blinkRate: number) => void) => {
    onBlinkRateChangeRef.current = callback;
  }, []);

  const classifyEyeState = (lightLevel: number): EyeState => {
    if (lightLevel >= EYE_OPEN_THRESHOLD) {
      return 'open';
    } else if (lightLevel <= EYE_CLOSED_THRESHOLD) {
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

    // Parse the raw sensor value
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

    if (rawSensorValue === null) return;

    // Calibrated blink detection logic
    const now = Date.now();
    const newEyeState = classifyEyeState(rawSensorValue);
    const previousEyeState = currentEyeStateRef.current;
    
    // Count a blink on transition from open to closed
    if (previousEyeState === 'open' && newEyeState === 'closed') {
      blinkTimestampsRef.current.push({ timestamp: now });
      console.log(`Blink detected! Light level: ${rawSensorValue} (open→closed transition), Total blinks in window: ${blinkTimestampsRef.current.length}`);
    }
    
    // Update current eye state
    currentEyeStateRef.current = newEyeState;

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
  }, []);

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
  }, [cleanupConnection]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (deviceRef.current && serverRef.current) {
        const isActuallyConnected = serverRef.current.connected;
        
        if (!isActuallyConnected && connectionState === 'connected') {
          console.log('GATT connection lost, updating UI state');
          setConnectionState('disconnected');
          notificationsEnabledRef.current = false;
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [connectionState]);

  const discoverNotifyingCharacteristic = async (
    server: BluetoothRemoteGATTServer,
    attemptToken: number
  ): Promise<BluetoothRemoteGATTCharacteristic> => {
    console.log('Starting cross-service auto-discovery for notifying characteristics...');
    
    if (attemptToken !== attemptTokenRef.current) {
      throw new Error('Connection attempt was cancelled');
    }
    
    try {
      const services = await server.getPrimaryServices();
      console.log(`Found ${services.length} primary services`);
      
      for (const service of services) {
        if (attemptToken !== attemptTokenRef.current) {
          throw new Error('Connection attempt was cancelled');
        }
        
        try {
          const characteristics = await service.getCharacteristics();
          console.log(`Service ${service.uuid}: found ${characteristics.length} characteristics`);
          
          for (const char of characteristics) {
            if (char.properties.notify) {
              console.log(`Found notifying characteristic: ${char.uuid} in service ${service.uuid}`);
              return char;
            }
          }
        } catch (err) {
          console.warn(`Failed to scan characteristics for service ${service.uuid}:`, err);
          continue;
        }
      }
      
      throw new Error('No notify-capable characteristic found on this device. Please ensure your ESP32 firmware exposes at least one characteristic with notify property enabled.');
    } catch (err: any) {
      if (err.message?.includes('cancelled')) {
        throw err;
      }
      if (err.message?.includes('No notify-capable characteristic')) {
        throw err;
      }
      throw new Error(`Failed to discover services and characteristics: ${err.message || 'Unknown error'}. Please check your device firmware.`);
    }
  };

  const enableNotifications = async (
    characteristic: BluetoothRemoteGATTCharacteristic,
    attemptToken: number
  ): Promise<void> => {
    console.log('Starting notifications on characteristic...');
    
    try {
      await characteristic.startNotifications();
      console.log('startNotifications() succeeded');
    } catch (err: any) {
      throw new Error(`Failed to start notifications: ${err.message || 'Unknown error'}. Please ensure your ESP32 firmware supports notifications on this characteristic.`);
    }

    if (attemptToken !== attemptTokenRef.current) {
      throw new Error('Connection attempt was cancelled');
    }

    characteristic.addEventListener(
      'characteristicvaluechanged',
      handleCharacteristicValueChanged as EventListener
    );
    console.log('Notification event listener registered');

    try {
      console.log('Attempting to write to CCCD descriptor (0x2902)...');
      const cccdDescriptor = await characteristic.getDescriptor(CCCD_UUID);
      
      if (attemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      const cccdValue = new Uint8Array([0x01, 0x00]);
      await cccdDescriptor.writeValue(cccdValue);
      console.log('CCCD descriptor write succeeded - ESP32 should now detect connection');
    } catch (cccdErr: any) {
      console.warn('CCCD descriptor write failed (this may be normal):', cccdErr.message || cccdErr);
      console.log('Notifications may still work via startNotifications() alone');
    }

    notificationsEnabledRef.current = true;
    console.log('Notifications fully enabled');
  };

  const connect = useCallback(async (options: ConnectOptions) => {
    const {
      serviceUUID = NUS_SERVICE_UUID,
      characteristicUUID = NUS_TX_CHARACTERISTIC_UUID,
      autoDiscover = true,
      useCustomProfile = false
    } = options;

    if (!isSupported || !navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Please use a Chromium-based browser like Chrome, Edge, or Opera.');
      return;
    }

    if (isConnectingRef.current) {
      console.log('Connection attempt already in progress, ignoring new request');
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptStartRef.current;
    if (timeSinceLastAttempt < MIN_CONNECTION_INTERVAL_MS) {
      const waitTime = MIN_CONNECTION_INTERVAL_MS - timeSinceLastAttempt;
      console.log(`Waiting ${waitTime}ms before next connection attempt...`);
      setConnectionState('connecting');
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    isConnectingRef.current = true;
    lastAttemptStartRef.current = Date.now();
    attemptTokenRef.current += 1;
    const currentAttemptToken = attemptTokenRef.current;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setError(null);
    setConnectionState('connecting');
    notificationsEnabledRef.current = false;

    // Reset blink detection state on new connection
    blinkTimestampsRef.current = [];
    currentEyeStateRef.current = 'unknown';

    const isCustomMode = useCustomProfile || !serviceUUID || serviceUUID.toString().trim() === '';
    
    const normalizedServiceUUID = serviceUUID && serviceUUID.toString().trim() !== '' 
      ? normalizeUUID(serviceUUID) 
      : undefined;
    const normalizedCharUUID = characteristicUUID && characteristicUUID.toString().trim() !== ''
      ? normalizeUUID(characteristicUUID)
      : undefined;

    try {
      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      let device: BluetoothDevice;
      
      if (isCustomMode) {
        console.log('Using custom/unknown profile mode with acceptAllDevices');
        const optionalServices: string[] = [NUS_SERVICE_UUID];
        if (normalizedServiceUUID && normalizedServiceUUID !== NUS_SERVICE_UUID) {
          optionalServices.push(toServiceString(normalizedServiceUUID));
        }
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices
        });
      } else {
        console.log(`Using known profile mode with service filter: ${formatUUID(normalizedServiceUUID!)}`);
        const optionalServices: string[] = [];
        if (normalizedCharUUID) {
          optionalServices.push(toServiceString(normalizedServiceUUID!));
        }
        device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [toServiceString(normalizedServiceUUID!)] }],
          optionalServices
        });
      }

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      console.log(`Device selected: ${device.name || 'Unknown'}`);
      deviceRef.current = device;

      const disconnectListener = () => {
        console.log('Device disconnected');
        disconnect();
      };
      device.addEventListener('gattserverdisconnected', disconnectListener);
      disconnectListenerRef.current = disconnectListener;

      console.log('Connecting to GATT server...');
      const server = await device.gatt!.connect();
      serverRef.current = server;
      console.log('GATT server connected');

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      console.log(`Waiting ${MTU_EXCHANGE_DELAY_MS}ms for MTU exchange...`);
      await new Promise(resolve => setTimeout(resolve, MTU_EXCHANGE_DELAY_MS));

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      let characteristic: BluetoothRemoteGATTCharacteristic;

      if (autoDiscover) {
        characteristic = await discoverNotifyingCharacteristic(server, currentAttemptToken);
      } else {
        if (!normalizedServiceUUID || !normalizedCharUUID) {
          throw new Error('Service UUID and Characteristic UUID are required when auto-discovery is disabled');
        }

        console.log(`Getting service ${formatUUID(normalizedServiceUUID)}...`);
        const service = await server.getPrimaryService(toServiceString(normalizedServiceUUID));
        
        if (currentAttemptToken !== attemptTokenRef.current) {
          throw new Error('Connection attempt was cancelled');
        }

        console.log(`Getting characteristic ${formatUUID(normalizedCharUUID)}...`);
        characteristic = await service.getCharacteristic(toServiceString(normalizedCharUUID));
      }

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      characteristicRef.current = characteristic;
      console.log(`Using characteristic: ${characteristic.uuid}`);

      await enableNotifications(characteristic, currentAttemptToken);

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      setConnectionState('connected');
      console.log('Connection fully established with notifications enabled');

    } catch (err: any) {
      console.error('Connection error:', err);
      
      if (err.message?.includes('cancelled')) {
        console.log('Connection attempt was cancelled by user or new attempt');
      } else {
        setError(err.message || 'Failed to connect to device');
      }
      
      cleanupConnection();
      deviceRef.current = null;
      setConnectionState('disconnected');
    } finally {
      isConnectingRef.current = false;
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [isSupported, cleanupConnection, disconnect, handleCharacteristicValueChanged]);

  return (
    <BluetoothContext.Provider
      value={{
        connectionState,
        error,
        connect,
        disconnect,
        isSupported,
        setOnBlinkRateChange,
        latestReading,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetooth must be used within BluetoothProvider');
  }
  return context;
}
