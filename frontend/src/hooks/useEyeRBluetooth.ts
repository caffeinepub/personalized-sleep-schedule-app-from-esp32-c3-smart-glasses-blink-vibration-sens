import { useState, useCallback, useRef, useEffect } from 'react';
import { normalizeUUID, formatUUID } from '../utils/bleUuid';
import { 
  NUS_SERVICE_UUID, 
  NUS_TX_CHARACTERISTIC_UUID,
  CCCD_UUID,
  parseNusBlinkRate,
  parseBlinkRateFromText,
  parseHeartRateBlinkRate,
  parseBatteryData,
  parseChargingStatus
} from '../utils/bleNus';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface ConnectOptions {
  serviceUUID?: string | number;
  characteristicUUID?: string | number;
  autoDiscover?: boolean;
  useCustomProfile?: boolean;
}

const MIN_CONNECTION_INTERVAL_MS = 2000;
const MTU_EXCHANGE_DELAY_MS = 500;

function toServiceString(uuid: string | number): string {
  if (typeof uuid === 'number') {
    const hex = uuid.toString(16).padStart(4, '0');
    return `0000${hex}-0000-1000-8000-00805f9b34fb`;
  }
  return uuid;
}

export function useEyeRBluetooth() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => 'bluetooth' in navigator && navigator.bluetooth !== undefined);
  const [latestReading, setLatestReading] = useState<string | null>(null);
  const [latestBlinkRate, setLatestBlinkRate] = useState<number | null>(null);
  const [batteryPercentage, setBatteryPercentage] = useState<number | undefined>(undefined);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const disconnectListenerRef = useRef<((event: Event) => void) | null>(null);
  const notificationsEnabledRef = useRef<boolean>(false);
  
  const isConnectingRef = useRef(false);
  const lastAttemptStartRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attemptTokenRef = useRef<number>(0);

  const handleCharacteristicValueChanged = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    
    if (!value) return;

    // Decode raw data using TextDecoder
    let decodedText = '';
    try {
      const decoder = new TextDecoder('utf-8');
      decodedText = decoder.decode(value);
      setLatestReading(decodedText.trim());
      console.log(`Raw notification data: "${decodedText.trim()}"`);
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
        const chargingStatus = parseChargingStatus(decodedText);
        if (chargingStatus !== null) {
          setIsCharging(chargingStatus);
        }
      }
    }

    // Parse blink rate from decoded text
    let blinkRate: number | null = null;
    if (decodedText) {
      blinkRate = parseBlinkRateFromText(decodedText);
      
      if (blinkRate !== null) {
        console.log(`Parsed blink rate: ${blinkRate}`);
        setLatestBlinkRate(blinkRate);
      }
    }

    // Fallback: Try NUS DataView parsing
    if (blinkRate === null) {
      blinkRate = parseNusBlinkRate(value);
      if (blinkRate !== null) {
        setLatestBlinkRate(blinkRate);
      }
    }
    
    // Fallback: Try Heart Rate format
    if (blinkRate === null) {
      blinkRate = parseHeartRateBlinkRate(value);
      if (blinkRate !== null) {
        setLatestBlinkRate(blinkRate);
      }
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
    setLatestBlinkRate(null);
    setBatteryPercentage(undefined);
    setIsCharging(false);
  }, [cleanupConnection]);

  // Monitor GATT connection status
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
      
      throw new Error('No notify-capable characteristic found on this device.');
    } catch (err: any) {
      if (err.message?.includes('cancelled')) {
        throw err;
      }
      if (err.message?.includes('No notify-capable characteristic')) {
        throw err;
      }
      throw new Error(`Failed to discover services and characteristics: ${err.message || 'Unknown error'}`);
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
      throw new Error(`Failed to start notifications: ${err.message || 'Unknown error'}`);
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
      console.log('CCCD descriptor write succeeded');
    } catch (cccdErr: any) {
      console.warn('CCCD descriptor write failed (this may be normal):', cccdErr.message || cccdErr);
    }

    notificationsEnabledRef.current = true;
    console.log('Notifications fully enabled');
  };

  const connect = useCallback(async (options: ConnectOptions = {}) => {
    const {
      serviceUUID = NUS_SERVICE_UUID,
      characteristicUUID = NUS_TX_CHARACTERISTIC_UUID,
      autoDiscover = true,
      useCustomProfile = false
    } = options;

    if (!isSupported || !navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser.');
      return;
    }

    if (isConnectingRef.current) {
      console.log('Connection attempt already in progress');
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

    // Reset battery state on new connection
    setBatteryPercentage(undefined);
    setIsCharging(false);

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
        console.log('Using custom/unknown profile mode');
        const optionalServices: string[] = [NUS_SERVICE_UUID];
        if (normalizedServiceUUID && normalizedServiceUUID !== NUS_SERVICE_UUID) {
          optionalServices.push(toServiceString(normalizedServiceUUID));
        }
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices
        });
      } else {
        console.log(`Using known profile mode with service: ${formatUUID(normalizedServiceUUID!)}`);
        const optionalServices: string[] = [NUS_SERVICE_UUID];
        if (normalizedServiceUUID !== NUS_SERVICE_UUID) {
          optionalServices.push(toServiceString(normalizedServiceUUID!));
        }
        device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [normalizedServiceUUID!] }],
          optionalServices
        });
      }

      console.log('Step 1: Device Selected');

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      deviceRef.current = device;

      const handleDisconnect = () => {
        console.log('Device disconnected');
        cleanupConnection();
        setConnectionState('disconnected');
        isConnectingRef.current = false;
      };
      disconnectListenerRef.current = handleDisconnect;
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      if (!device.gatt) {
        throw new Error('Device does not support GATT (BLE)');
      }

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      const server = await device.gatt.connect();
      serverRef.current = server;

      console.log('Step 2: GATT Connected');

      // Force MTU exchange delay
      console.log(`Waiting ${MTU_EXCHANGE_DELAY_MS}ms for MTU exchange...`);
      await new Promise(resolve => setTimeout(resolve, MTU_EXCHANGE_DELAY_MS));

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

      // Universal service search
      try {
        console.log('Attempting universal service discovery...');
        const allServices = await server.getPrimaryServices();
        console.log(`Found ${allServices.length} primary services`);
        
        let nusService: BluetoothRemoteGATTService | null = null;
        
        for (const service of allServices) {
          const serviceUuidNormalized = service.uuid.toLowerCase();
          const nusUuidNormalized = NUS_SERVICE_UUID.toLowerCase();
          
          if (serviceUuidNormalized === nusUuidNormalized) {
            console.log('Found NUS service via universal discovery');
            nusService = service;
            break;
          }
        }
        
        if (nusService) {
          console.log('Step 3: Service Found');
          console.log('Getting NUS TX characteristic...');
          
          if (currentAttemptToken !== attemptTokenRef.current) {
            throw new Error('Connection attempt was cancelled');
          }
          
          const txCharacteristic = await nusService.getCharacteristic(NUS_TX_CHARACTERISTIC_UUID);
          console.log('NUS TX characteristic found');
          characteristic = txCharacteristic;
          console.log('Step 4: Characteristic Found');
        } else {
          console.warn('NUS service not found via universal discovery');
          
          if (isCustomMode) {
            console.log('Falling back to cross-service discovery...');
            characteristic = await discoverNotifyingCharacteristic(server, currentAttemptToken);
            console.log('Step 3: Service Found');
            console.log('Step 4: Characteristic Found');
          } else {
            throw new Error('Nordic UART Service (NUS) not found on device');
          }
        }
      } catch (discoveryError: any) {
        console.error('Service discovery error:', discoveryError);
        throw discoveryError;
      }

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      if (!characteristic) {
        throw new Error('Failed to find a suitable characteristic');
      }

      characteristicRef.current = characteristic;

      await enableNotifications(characteristic, currentAttemptToken);

      if (currentAttemptToken !== attemptTokenRef.current) {
        throw new Error('Connection attempt was cancelled');
      }

      setConnectionState('connected');
      isConnectingRef.current = false;
      console.log('Connection complete - notifications enabled');

    } catch (err: any) {
      console.error('Connection error:', err);
      
      if (!err.message?.includes('cancelled')) {
        setError(err.message || 'Failed to connect');
      }
      
      cleanupConnection();
      deviceRef.current = null;
      isConnectingRef.current = false;
      setConnectionState('disconnected');
    }
  }, [isSupported, cleanupConnection, handleCharacteristicValueChanged]);

  return {
    connectionState,
    error,
    connect,
    disconnect,
    isSupported,
    latestReading,
    latestBlinkRate,
    batteryPercentage,
    isCharging,
  };
}
