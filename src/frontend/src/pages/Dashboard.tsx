import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Activity, HardDrive } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BlinkRateChart from "../components/charts/BlinkRateChart";
import type { LightLevelDataPoint } from "../components/charts/BlinkRateChart";
import ActuationLatencyCard from "../components/device/ActuationLatencyCard";
import DeviceSelector from "../components/device/DeviceSelector";
import SleepScheduleCard from "../components/recommendation/SleepScheduleCard";
import TimeRangePicker, {
  type TimeRange,
} from "../components/time/TimeRangePicker";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useDeviceId } from "../hooks/useDeviceId";
import { useLocalBlinkHistory } from "../hooks/useLocalBlinkHistory";
import {
  type AlertnessStateInfo,
  type SchedulePlan,
  deriveAlertnessState,
  getSchedulePlanForState,
} from "../utils/personalizedSleepSchedule";

interface CapturedScheduleState {
  stateInfo: AlertnessStateInfo;
  plan: SchedulePlan;
  rollingAverage: number;
  capturedAt: number;
}

const MAX_LIGHT_LEVEL_POINTS = 100;

export default function Dashboard() {
  const { deviceId, setDeviceId, isValid } = useDeviceId();
  const {
    connectionState,
    latestReading,
    setOnBlinkRateChange,
    setOnLightLevelChange,
    totalBlinkCount,
  } = useBluetooth();

  const [currentBlinkRate, setCurrentBlinkRate] = useState<number | null>(null);
  const [blinkHistory, setBlinkHistory] = useState<number[]>([]);
  const [lightLevelHistory, setLightLevelHistory] = useState<
    LightLevelDataPoint[]
  >([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    history: persistedHistory,
    addDataPoint: addPersistedDataPoint,
    lastSaveTime,
    totalPoints,
  } = useLocalBlinkHistory();

  // Derived metric: total blinks ÷ 5
  const blinkScore = totalBlinkCount / 5;
  const hasRecentData = totalBlinkCount > 0;

  // Time range for historical analysis
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  // Captured schedule state (set only on button click)
  const [capturedSchedule, setCapturedSchedule] =
    useState<CapturedScheduleState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Current live state (updates continuously)
  const currentStateInfo = hasRecentData
    ? deriveAlertnessState(blinkScore)
    : null;

  const handleGenerateSchedule = () => {
    if (!hasRecentData || !currentStateInfo) return;

    setIsGenerating(true);

    const stateInfo = currentStateInfo;
    const plan = getSchedulePlanForState(stateInfo.state);

    setTimeout(() => {
      setCapturedSchedule({
        stateInfo,
        plan,
        rollingAverage: blinkScore,
        capturedAt: Date.now(),
      });
      setIsGenerating(false);
    }, 800);
  };

  // Set up the blink rate change handler
  useEffect(() => {
    setOnBlinkRateChange((blinkRate: number) => {
      setCurrentBlinkRate(blinkRate);

      // Add to persisted history (localStorage)
      addPersistedDataPoint(blinkRate);

      // Add to in-memory history for visualization
      setBlinkHistory((prev) => {
        const updated = [...prev, blinkRate];
        return updated.slice(-100);
      });
    });
  }, [setOnBlinkRateChange, addPersistedDataPoint]);

  // Set up the light level change handler (VAL: field from ESP32)
  useEffect(() => {
    setOnLightLevelChange((value: number) => {
      setLightLevelHistory((prev) => {
        const updated: LightLevelDataPoint[] = [
          ...prev,
          { timestamp: Date.now(), value },
        ];
        return updated.slice(-MAX_LIGHT_LEVEL_POINTS);
      });
    });
  }, [setOnLightLevelChange]);

  // Draw simple blink rate chart
  useEffect(() => {
    if (!canvasRef.current || blinkHistory.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;

    ctx.clearRect(0, 0, width, height);

    const max = Math.max(...blinkHistory, 30);
    const min = Math.min(...blinkHistory, 0);
    const range = max - min || 1;

    ctx.strokeStyle = "oklch(0.65 0.15 200)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    blinkHistory.forEach((rate, index) => {
      const x =
        padding +
        (index / (blinkHistory.length - 1 || 1)) * (width - 2 * padding);
      const y =
        padding +
        (height - 2 * padding) -
        ((rate - min) / range) * (height - 2 * padding);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [blinkHistory]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your real-time blink rate and get personalized sleep
            recommendations
          </p>
        </div>

        {/* Device Selector */}
        {!isValid && (
          <DeviceSelector
            deviceId={deviceId}
            onDeviceIdChange={setDeviceId}
            isValid={isValid}
          />
        )}

        {/* Live Metrics — 5-column grid on large screens */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Blink Rate
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentBlinkRate !== null ? currentBlinkRate : "--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Blinks counted (last 60s)
              </p>
              {connectionState === "connected" && (
                <Badge variant="outline" className="mt-2">
                  Live
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blink Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {hasRecentData ? blinkScore.toFixed(1) : "--"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total blinks ÷ 5 ({totalBlinkCount} blinks)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Local Storage
              </CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPoints}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastSaveTime
                  ? `Last saved: ${new Date(lastSaveTime).toLocaleTimeString()}`
                  : "No data saved yet"}
              </p>
            </CardContent>
          </Card>

          {/* Actuation Latency — reads LAT: field directly from BluetoothContext */}
          <ActuationLatencyCard />
        </div>

        {/* Debug Info */}
        {latestReading && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Raw Sensor Reading (Debug)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs text-muted-foreground">
                {latestReading}
              </code>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Sleep Schedule Card */}
        <SleepScheduleCard
          currentStateInfo={currentStateInfo}
          currentRollingAverage={blinkScore}
          hasRecentData={hasRecentData}
          dataPointCount={totalBlinkCount}
          capturedSchedule={capturedSchedule}
          onGenerate={handleGenerateSchedule}
          isGenerating={isGenerating}
        />

        <Separator />

        {/* Real-time Light Level Chart (VAL: from ESP32) */}
        {lightLevelHistory.length > 0 && (
          <BlinkRateChart
            data={[]}
            title="Real-time Light Level (VAL)"
            lightLevelData={lightLevelHistory}
          />
        )}

        {/* Session Blink Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Session Blink Rate (Blinks/min)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blinkHistory.length > 0 ? (
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-auto border border-border rounded"
              />
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No data yet. Connect your device to start monitoring.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historical Data */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Historical Data</h2>
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          </div>

          <BlinkRateChart
            data={persistedHistory}
            title="Stored Blink Rate History (Blinks/min)"
          />
        </div>
      </main>
    </div>
  );
}
