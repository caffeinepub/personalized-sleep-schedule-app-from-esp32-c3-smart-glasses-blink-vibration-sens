import { useState, useEffect, useRef } from 'react';
import { useDeviceId } from '../hooks/useDeviceId';
import { useBluetooth } from '../contexts/BluetoothContext';
import { useLocalBlinkHistory } from '../hooks/useLocalBlinkHistory';
import { useRollingBlinkRateAverage5Min } from '../hooks/useRollingBlinkRateAverage5Min';
import DeviceSelector from '../components/device/DeviceSelector';
import TimeRangePicker, { TimeRange } from '../components/time/TimeRangePicker';
import BlinkRateChart from '../components/charts/BlinkRateChart';
import SleepScheduleCard from '../components/recommendation/SleepScheduleCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Activity, HardDrive } from 'lucide-react';
import { deriveAlertnessState, getSchedulePlanForState, type AlertnessStateInfo, type SchedulePlan } from '../utils/personalizedSleepSchedule';

interface CapturedScheduleState {
  stateInfo: AlertnessStateInfo;
  plan: SchedulePlan;
  rollingAverage: number;
  capturedAt: number;
}

export default function Dashboard() {
  const { deviceId, setDeviceId, isValid } = useDeviceId();
  const { connectionState, latestReading, setOnBlinkRateChange } = useBluetooth();
  
  const [currentBlinkRate, setCurrentBlinkRate] = useState<number | null>(null);
  const [blinkHistory, setBlinkHistory] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { history: persistedHistory, addDataPoint: addPersistedDataPoint, lastSaveTime, totalPoints } = useLocalBlinkHistory();
  
  // 5-minute rolling average hook
  const { 
    rollingAverage, 
    hasRecentData, 
    dataPointCount, 
    addDataPoint: addRollingDataPoint 
  } = useRollingBlinkRateAverage5Min();

  // Time range for historical analysis
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  // Captured schedule state (set only on button click)
  const [capturedSchedule, setCapturedSchedule] = useState<CapturedScheduleState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Current live state (updates continuously)
  const currentStateInfo = hasRecentData 
    ? deriveAlertnessState(rollingAverage)
    : null;

  const handleGenerateSchedule = () => {
    if (!hasRecentData || !currentStateInfo) return;

    setIsGenerating(true);

    // Capture the current state at this moment
    const stateInfo = currentStateInfo;
    const plan = getSchedulePlanForState(stateInfo.state);

    // Instant generation from local data
    setCapturedSchedule({
      stateInfo,
      plan,
      rollingAverage,
      capturedAt: Date.now(),
    });
    setIsGenerating(false);
  };

  useEffect(() => {
    setOnBlinkRateChange((blinkRate: number) => {
      setCurrentBlinkRate(blinkRate);
      
      // Add to persisted localStorage history
      addPersistedDataPoint(blinkRate);
      
      // Add to 5-minute rolling average
      addRollingDataPoint(blinkRate);
      
      // Update live trend
      setBlinkHistory(prev => {
        const updated = [...prev, blinkRate];
        return updated.slice(-60);
      });
    });
  }, [setOnBlinkRateChange, addPersistedDataPoint, addRollingDataPoint]);

  useEffect(() => {
    if (!canvasRef.current || blinkHistory.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    ctx.clearRect(0, 0, width, height);

    const maxRate = Math.max(...blinkHistory, 30);
    const minRate = 0;
    const range = maxRate - minRate;

    ctx.strokeStyle = 'oklch(0.65 0.15 200)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    blinkHistory.forEach((rate, index) => {
      const x = padding + (index / (blinkHistory.length - 1 || 1)) * plotWidth;
      const y = padding + plotHeight - ((rate - minRate) / range) * plotHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    ctx.fillStyle = 'oklch(0.65 0.15 200)';
    blinkHistory.forEach((rate, index) => {
      const x = padding + (index / (blinkHistory.length - 1 || 1)) * plotWidth;
      const y = padding + plotHeight - ((rate - minRate) / range) * plotHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [blinkHistory]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Sleep Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your blink rate in real-time. All data is saved locally on this device.
        </p>
      </div>

      <DeviceSelector deviceId={deviceId} onDeviceIdChange={setDeviceId} isValid={isValid} />

      {connectionState === 'connected' && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Current Blink Rate</CardTitle>
                  <Badge variant="default" className="bg-green-600">
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-foreground">
                    {currentBlinkRate !== null ? currentBlinkRate : '--'}
                  </span>
                  <span className="text-2xl text-muted-foreground">bpm</span>
                </div>
                {latestReading && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Raw: {latestReading}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Session Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Stored</span>
                  <span className="text-2xl font-semibold">{totalPoints}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <HardDrive className="h-4 w-4" />
                    Storage
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Local Device
                  </Badge>
                </div>
                {lastSaveTime && (
                  <p className="text-xs text-muted-foreground">
                    Last saved: {new Date(lastSaveTime).toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {blinkHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Live Blink Rate Trend (Last 60 readings)</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={200}
                  className="w-full h-auto border border-border rounded"
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {connectionState === 'disconnected' && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Connect your device to see live blink rate data
            </p>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Session History & Sleep Schedule</h2>
        <p className="text-muted-foreground">
          Review your blink rate history and generate personalized sleep recommendations
        </p>
      </div>

      <TimeRangePicker value={timeRange} onChange={setTimeRange} />

      <BlinkRateChart 
        data={persistedHistory}
        title="Blink Rate History (Stored Locally)"
      />

      <SleepScheduleCard
        currentStateInfo={currentStateInfo}
        currentRollingAverage={rollingAverage}
        hasRecentData={hasRecentData}
        dataPointCount={dataPointCount}
        capturedSchedule={capturedSchedule}
        onGenerate={handleGenerateSchedule}
        isGenerating={isGenerating}
      />
    </div>
  );
}
