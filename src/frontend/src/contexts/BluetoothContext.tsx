import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";
import { useLocalBlinkHistory } from "../hooks/useLocalBlinkHistory";
import {
  BLINK_MAX,
  BLINK_MIN,
  CCCD_UUID,
  EYES_CLOSED_MAX,
  EYES_OPEN_MAX,
  EYES_OPEN_MIN,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
  isEsp32PipeFormat,
  parseBatteryData,
  parseBlinkRateFromText,
  parseChargingStatus,
  parseEsp32PipeFormat,
  parseEyeStateFromLight,
  parseEyeStateToken,
  parseHeartRateBlinkRate,
  parseNusBlinkRate,
} from "../utils/bleNus";
import { formatUUID, normalizeUUID } from "../utils/bleUuid";

type ConnectionState = "disconnected" | "connecting" | "connected";

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
  /** Most recent actuation latency (ms) parsed from LAT: field, or undefined if not yet received */
  actuationLatency: number | undefined;
  /** Sends a vibration trigger BLE command and records actuation latency on the backend. */
  triggerVibration: () => Promise<void>;
  /** Register a callback that fires whenever a new VAL: light level reading arrives */
  setOnLightLevelChange: (callback: (value: number) => void) => void;
  /** Running total of all blinks detected since device connected */
  totalBlinkCount: number;
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

const BluetoothContext = createContext<BluetoothContextValue | undefined>(
  undefined,
);

const MIN_CONNECTION_INTERVAL_MS = 2000;
const MTU_EXCHANGE_DELAY_MS = 500;

const ROLLING_WINDOW_MS = 60000; // 60 seconds

type EyeState = "open" | "closed" | "unknown";

export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(
    () => "bluetooth" in navigator && navigator.bluetooth !== undefined,
  );
  const [latestReading, setLatestReading] = useState<string | null>(null);
  const [batteryPercentage, setBatteryPercentage] = useState<
    number | undefined
  >(undefined);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [actuationLatency, setActuationLatency] = useState<number | undefined>(
    undefined,
  );
  const [totalBlinkCount, setTotalBlinkCount] = useState<number>(0);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(
    null,
  );
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const disconnectListenerRef = useRef<((event: Event) => void) | null>(null);
  const onBlinkRateChangeRef = useRef<
    ((blinkRate: number) => void) | undefined
  >(undefined);
  const onLightLevelChangeRef = useRef<((value: number) => void) | undefined>(
    undefined,
  );
  const notificationsEnabledRef = useRef<boolean>(false);

  const isConnectingRef = useRef(false);
  const lastAttemptStartRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attemptTokenRef = useRef<number>(0);

  // Blink detection state with calibrated eye state tracking
  const blinkTimestampsRef = useRef<BlinkTimestamp[]>([]);
  const currentEyeStateRef = useRef<EyeState>("unknown");

  /**
   * Debounce ref for blink counting via the numeric VAL path.
   * True while VAL is currently below 600 (inside a blink event).
   */
  const isInsideBlinkEventRef = useRef<boolean>(false);

  // Local blink history for persisting eye state events
  const { addDataPoint } = useLocalBlinkHistory();

  // Backend actor for latency recording
  const { actor } = useActor();
  const actorRef = useRef(actor);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  const queryClient = useQueryClient();

  const setOnBlinkRateChange = useCallback(
    (callback: (blinkRate: number) => void) => {
      onBlinkRateChangeRef.current = callback;
    },
    [],
  );

  const setOnLightLevelChange = useCallback(
    (callback: (value: number) => void) => {
      onLightLevelChangeRef.current = callback;
    },
    [],
  );

  const classifyEyeState = useCallback((lightLevel: number): EyeState => {
    if (lightLevel < EYES_CLOSED_MAX) {
      return "closed";
    }
    if (lightLevel >= EYES_OPEN_MIN && lightLevel <= EYES_OPEN_MAX) {
      return "open";
    }
    if (lightLevel >= BLINK_MIN && lightLevel <= BLINK_MAX) {
      return "closed";
    }
    return "unknown";
  }, []);

  const handleCharacteristicValueChanged = useCallback(
    (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;

      if (!value) return;

      // Decode as UTF-8 text for raw display
      let decodedText = "";
      try {
        const decoder = new TextDecoder("utf-8");
        decodedText = decoder.decode(value);
        setLatestReading(decodedText.trim());
      } catch (err) {
        console.warn("Failed to decode as UTF-8 text:", err);
      }

      const now = Date.now();

      // -----------------------------------------------------------------------
      // ESP32 pipe-delimited format: "BAT:85|LAT:2050|VAL:450"
      // Handle this format first — it takes priority over legacy parsers.
      // -----------------------------------------------------------------------
      if (decodedText && isEsp32PipeFormat(decodedText)) {
        const parsed = parseEsp32PipeFormat(decodedText);

        // Update battery from BAT: field
        if (parsed.battery !== null) {
          setBatteryPercentage(parsed.battery);
        }

        // Update actuation latency from LAT: field
        if (parsed.latency !== null) {
          setActuationLatency(parsed.latency);
        }

        // Process VAL: field for blink detection and light level chart
        if (parsed.value !== null) {
          const rawSensorValue = parsed.value;

          // Emit light level to chart callback
          if (onLightLevelChangeRef.current) {
            onLightLevelChangeRef.current(rawSensorValue);
          }

          const newEyeState = classifyEyeState(rawSensorValue);
          const eyeStateLabel = parseEyeStateFromLight(rawSensorValue);

          if (eyeStateLabel !== null) {
            const currentBlinkCount = blinkTimestampsRef.current.length;
            addDataPoint(currentBlinkCount, eyeStateLabel);
          }

          // Blink counting with debounce for the VAL < 600 threshold
          if (rawSensorValue < EYES_CLOSED_MAX) {
            if (!isInsideBlinkEventRef.current) {
              isInsideBlinkEventRef.current = true;
              blinkTimestampsRef.current.push({ timestamp: now });
              setTotalBlinkCount((c) => c + 1);
              if (actorRef.current) {
                actorRef.current.recordEyeClosedTimestamp().catch(() => {});
              }
            }
          } else {
            isInsideBlinkEventRef.current = false;
          }

          if (newEyeState !== "unknown") {
            currentEyeStateRef.current = newEyeState;
          }
        }

        // Prune timestamps older than 60 seconds
        const cutoffTime = now - ROLLING_WINDOW_MS;
        blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
          (blink) => blink.timestamp >= cutoffTime,
        );

        // Emit blink rate
        if (onBlinkRateChangeRef.current) {
          onBlinkRateChangeRef.current(blinkTimestampsRef.current.length);
        }

        return; // Done — skip legacy parsers
      }

      // -----------------------------------------------------------------------
      // Legacy parsing path (non-pipe-delimited formats)
      // -----------------------------------------------------------------------

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

      let newEyeState: EyeState = "unknown";

      // First, check for eye-state tokens (e.g., "close", "open")
      if (decodedText) {
        const eyeStateToken = parseEyeStateToken(decodedText);

        if (eyeStateToken === "close") {
          newEyeState = "closed";
          const previousEyeState = currentEyeStateRef.current;

          if (previousEyeState !== "closed") {
            blinkTimestampsRef.current.push({ timestamp: now });
            setTotalBlinkCount((c) => c + 1);
            if (actorRef.current) {
              actorRef.current.recordEyeClosedTimestamp().catch(() => {});
            }
          }
        } else if (eyeStateToken === "open") {
          newEyeState = "open";
        }
      }

      // If no token was detected, try parsing numeric light level
      if (newEyeState === "unknown") {
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

        if (rawSensorValue !== null) {
          newEyeState = classifyEyeState(rawSensorValue);

          if (onLightLevelChangeRef.current) {
            onLightLevelChangeRef.current(rawSensorValue);
          }

          const eyeStateLabel = parseEyeStateFromLight(rawSensorValue);

          if (eyeStateLabel !== null) {
            const currentBlinkCount = blinkTimestampsRef.current.length;
            addDataPoint(currentBlinkCount, eyeStateLabel);
          }

          if (rawSensorValue < EYES_CLOSED_MAX) {
            if (!isInsideBlinkEventRef.current) {
              isInsideBlinkEventRef.current = true;
              blinkTimestampsRef.current.push({ timestamp: now });
              setTotalBlinkCount((c) => c + 1);
              if (actorRef.current) {
                actorRef.current.recordEyeClosedTimestamp().catch(() => {});
              }
            }
          } else {
            isInsideBlinkEventRef.current = false;
          }
        }
      }

      if (newEyeState !== "unknown") {
        currentEyeStateRef.current = newEyeState;
      }

      const cutoffTime = now - ROLLING_WINDOW_MS;
      blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
        (blink) => blink.timestamp >= cutoffTime,
      );

      const blinksInWindow = blinkTimestampsRef.current.length;

      if (onBlinkRateChangeRef.current) {
        onBlinkRateChangeRef.current(blinksInWindow);
      }
    },
    [addDataPoint, classifyEyeState],
  );

  const cleanupConnection = useCallback(() => {
    if (characteristicRef.current) {
      try {
        characteristicRef.current.stopNotifications().catch(() => {});
        characteristicRef.current.removeEventListener(
          "characteristicvaluechanged",
          handleCharacteristicValueChanged as EventListener,
        );
      } catch (err) {
        console.warn("Error cleaning up characteristic:", err);
      }
      characteristicRef.current = null;
    }

    if (deviceRef.current && disconnectListenerRef.current) {
      try {
        deviceRef.current.removeEventListener(
          "gattserverdisconnected",
          disconnectListenerRef.current,
        );
      } catch (err) {
        console.warn("Error removing disconnect listener:", err);
      }
      disconnectListenerRef.current = null;
    }

    if (serverRef.current?.connected) {
      try {
        serverRef.current.disconnect();
      } catch (err) {
        console.warn("Error disconnecting GATT server:", err);
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
    setConnectionState("disconnected");
    setLatestReading(null);

    blinkTimestampsRef.current = [];
    currentEyeStateRef.current = "unknown";
    isInsideBlinkEventRef.current = false;
    setTotalBlinkCount(0);

    setBatteryPercentage(undefined);
    setIsCharging(false);
    setActuationLatency(undefined);
  }, [cleanupConnection]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (deviceRef.current && serverRef.current) {
        const isActuallyConnected = serverRef.current.connected;

        if (!isActuallyConnected && connectionState === "connected") {
          setConnectionState("disconnected");
          notificationsEnabledRef.current = false;
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [connectionState]);

  const connect = useCallback(
    async (options: ConnectOptions = {}) => {
      if (!isSupported) {
        setError("Web Bluetooth is not supported in this browser.");
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

      setConnectionState("connecting");
      setError(null);

      try {
        cleanupConnection();

        const characteristicUUID =
          options.characteristicUUID ?? NUS_TX_CHARACTERISTIC_UUID;
        const normalizedCharacteristicUUID = normalizeUUID(characteristicUUID);

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
          setConnectionState("disconnected");
          notificationsEnabledRef.current = false;
        };
        disconnectListenerRef.current = onDisconnect;
        device.addEventListener("gattserverdisconnected", onDisconnect);

        const server = await device.gatt!.connect();

        if (myToken !== attemptTokenRef.current) {
          server.disconnect();
          isConnectingRef.current = false;
          return;
        }

        serverRef.current = server;

        await new Promise((resolve) =>
          setTimeout(resolve, MTU_EXCHANGE_DELAY_MS),
        );

        if (myToken !== attemptTokenRef.current) {
          server.disconnect();
          isConnectingRef.current = false;
          return;
        }

        let service: BluetoothRemoteGATTService;
        try {
          service = await server.getPrimaryService(NUS_SERVICE_UUID);
        } catch (_err) {
          throw new Error(
            `NUS Service (${NUS_SERVICE_UUID}) not found on device. Make sure the device is advertising the correct service.`,
          );
        }

        let characteristic: BluetoothRemoteGATTCharacteristic;
        try {
          characteristic = await service.getCharacteristic(
            normalizedCharacteristicUUID,
          );
        } catch (_err) {
          throw new Error(
            `Characteristic ${formatUUID(characteristicUUID)} not found in NUS service.`,
          );
        }

        characteristicRef.current = characteristic;

        characteristic.addEventListener(
          "characteristicvaluechanged",
          handleCharacteristicValueChanged as EventListener,
        );

        await characteristic.startNotifications();
        notificationsEnabledRef.current = true;

        // Attempt to enable CCCD (0x2902) descriptor for notifications
        try {
          const cccdDescriptor = await (characteristic as any).getDescriptor(
            CCCD_UUID,
          );
          if (cccdDescriptor) {
            const enableNotifications = new Uint8Array([0x01, 0x00]);
            await cccdDescriptor.writeValue(enableNotifications);
          }
        } catch (_cccdErr) {
          // CCCD write is optional; startNotifications() may handle it automatically
        }

        if (myToken !== attemptTokenRef.current) {
          server.disconnect();
          isConnectingRef.current = false;
          return;
        }

        setConnectionState("connected");
        isConnectingRef.current = false;
      } catch (err: any) {
        if (myToken !== attemptTokenRef.current) {
          isConnectingRef.current = false;
          return;
        }

        const errorMessage = err?.message || "Unknown error occurred";

        if (
          errorMessage.includes("User cancelled") ||
          errorMessage.includes("chooser")
        ) {
          setError(null);
        } else {
          setError(errorMessage);
        }

        setConnectionState("disconnected");
        isConnectingRef.current = false;
        cleanupConnection();
      }
    },
    [isSupported, cleanupConnection, handleCharacteristicValueChanged],
  );

  const triggerVibration = useCallback(async () => {
    if (!actorRef.current) return;
    try {
      await actorRef.current.triggerVibrationAndCalculateLatency();
      queryClient.invalidateQueries({ queryKey: ["actuationLatency"] });
    } catch (err) {
      console.warn("Failed to trigger vibration:", err);
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
    actuationLatency,
    triggerVibration,
    setOnLightLevelChange,
    totalBlinkCount,
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
    throw new Error("useBluetooth must be used within a BluetoothProvider");
  }
  return context;
}
