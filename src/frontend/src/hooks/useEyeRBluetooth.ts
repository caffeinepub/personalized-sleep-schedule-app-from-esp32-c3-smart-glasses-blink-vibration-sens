import { useState, useEffect, useCallback, useRef } from 'react';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface UseEyeRBluetoothOptions {
  onBlinkRateChange?: (blinkRate: number) => void;
}

interface UseEyeRBluetoothReturn {
  connectionState: ConnectionState;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isSupported: boolean;
}

const SERVICE_UUID = 0x180d; // Heart Rate Service UUID (numeric alias)
const CHARACTERISTIC_UUID = 0x2a37; // Heart Rate Measurement Characteristic UUID (numeric alias)

export function useEyeRBluetooth(options: UseEyeRBluetoothOptions = {}): UseEyeRBluetoothReturn {
  const { onBlinkRateChange } = options;
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => 'bluetooth' in navigator && navigator.bluetooth !== undefined);
  
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);

  const handleCharacteristicValueChanged = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    
    if (!value) return;

    // Parse the DataView to extract blink rate
    // Standard Heart Rate Measurement format:
    // Byte 0: Flags
    // Byte 1+: Heart Rate Value (uint8 or uint16 depending on flags)
    const flags = value.getUint8(0);
    const is16Bit = (flags & 0x01) !== 0;
    
    let blinkRate: number;
    if (is16Bit) {
      blinkRate = value.getUint16(1, true); // little-endian
    } else {
      blinkRate = value.getUint8(1);
    }

    if (onBlinkRateChange) {
      onBlinkRateChange(blinkRate);
    }
  }, [onBlinkRateChange]);

  const disconnect = useCallback(() => {
    if (characteristicRef.current) {
      try {
        characteristicRef.current.removeEventListener(
          'characteristicvaluechanged',
          handleCharacteristicValueChanged as EventListener
        );
      } catch (err) {
        console.warn('Error removing characteristic listener:', err);
      }
      characteristicRef.current = null;
    }

    if (serverRef.current?.connected) {
      try {
        serverRef.current.disconnect();
      } catch (err) {
        console.warn('Error disconnecting GATT server:', err);
      }
    }
    
    serverRef.current = null;
    deviceRef.current = null;
    setConnectionState('disconnected');
  }, [handleCharacteristicValueChanged]);

  const connect = useCallback(async () => {
    if (!isSupported || !navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Please use a Chromium-based browser like Chrome, Edge, or Opera.');
      return;
    }

    setError(null);
    setConnectionState('connecting');

    try {
      // Request device - filter by Heart Rate service (0x180d)
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }]
      });

      deviceRef.current = device;

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        disconnect();
      });

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }
      serverRef.current = server;

      // Get service
      const service = await server.getPrimaryService(SERVICE_UUID);

      // Try to get the standard heart rate characteristic first
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
      try {
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      } catch (err) {
        // If standard characteristic not found, try to find any notifying characteristic
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.notify) {
            characteristic = char;
            break;
          }
        }
        
        if (!characteristic) {
          throw new Error('No notifying characteristic found on service 0x180d. Please ensure your device supports notifications.');
        }
      }

      characteristicRef.current = characteristic;

      // Start notifications
      await characteristic.startNotifications();

      // Add event listener
      characteristic.addEventListener(
        'characteristicvaluechanged',
        handleCharacteristicValueChanged as EventListener
      );

      setConnectionState('connected');
      setError(null);
    } catch (err: any) {
      console.error('Bluetooth connection error:', err);
      
      // Handle user cancellation
      if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
        setError('Device selection was cancelled. Please try again.');
      } else if (err.name === 'SecurityError') {
        setError('Bluetooth access was denied. Please check your browser permissions.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to connect to Eye-R device. Please ensure the device is powered on and in range.');
      }
      
      disconnect();
    }
  }, [isSupported, disconnect, handleCharacteristicValueChanged]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    error,
    connect,
    disconnect,
    isSupported,
  };
}
