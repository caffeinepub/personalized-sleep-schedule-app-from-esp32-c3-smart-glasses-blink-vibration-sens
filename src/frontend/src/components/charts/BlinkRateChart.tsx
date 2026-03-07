import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BlinkRateDataPoint } from "../../hooks/useSessionBlinkRateHistory";

/** A single light-level data point for the real-time VAL chart */
export interface LightLevelDataPoint {
  timestamp: number;
  value: number;
}

interface BlinkRateChartProps {
  data: BlinkRateDataPoint[];
  title?: string;
  /** Optional real-time light level data (VAL: field from ESP32) */
  lightLevelData?: LightLevelDataPoint[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function drawChart(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[],
  minVal: number,
  maxVal: number,
  yLabelSuffix: string,
  lineColor: string,
  dotColor: string,
  axisColor: string,
  labelColor: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  const range = maxVal - minVal || 1;

  ctx.clearRect(0, 0, width, height);

  // Draw line
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = padding + (index / (points.length - 1 || 1)) * plotWidth;
    const y = padding + plotHeight - ((point.y - minVal) / range) * plotHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw points
  ctx.fillStyle = dotColor;
  points.forEach((point, index) => {
    const x = padding + (index / (points.length - 1 || 1)) * plotWidth;
    const y = padding + plotHeight - ((point.y - minVal) / range) * plotHeight;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw baseline
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding + plotHeight);
  ctx.lineTo(padding + plotWidth, padding + plotHeight);
  ctx.stroke();

  // Draw labels
  ctx.fillStyle = labelColor;
  ctx.font = "12px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${maxVal}${yLabelSuffix}`, 5, padding + 12);
  ctx.fillText(`${minVal}${yLabelSuffix}`, 5, padding + plotHeight);
}

export default function BlinkRateChart({
  data,
  title = "Blink Rate History",
  lightLevelData,
}: BlinkRateChartProps) {
  const blinkCanvasRef = useRef<HTMLCanvasElement>(null);
  const lightCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 3-second loading timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Stop loading immediately if we have data
  useEffect(() => {
    if (data.length > 0 || (lightLevelData && lightLevelData.length > 0)) {
      setIsLoading(false);
    }
  }, [data, lightLevelData]);

  // Draw blink rate chart
  useEffect(() => {
    if (!blinkCanvasRef.current || data.length === 0) return;

    const points = data.map((d) => ({ x: d.timestamp, y: d.blinkRate }));
    const values = data.map((d) => d.blinkRate);
    const maxRate = Math.max(...values, 30);
    const minRate = Math.min(...values, 0);

    drawChart(
      blinkCanvasRef.current,
      points,
      minRate,
      maxRate,
      " blinks/min",
      "oklch(0.65 0.15 200)",
      "oklch(0.65 0.15 200)",
      "oklch(0.7 0.02 200)",
      "oklch(0.45 0.05 200)",
    );
  }, [data]);

  // Draw light level chart
  useEffect(() => {
    if (
      !lightCanvasRef.current ||
      !lightLevelData ||
      lightLevelData.length === 0
    )
      return;

    const points = lightLevelData.map((d) => ({ x: d.timestamp, y: d.value }));
    const values = lightLevelData.map((d) => d.value);
    const maxVal = Math.max(...values, 100);
    const minVal = Math.min(...values, 0);

    drawChart(
      lightCanvasRef.current,
      points,
      minVal,
      maxVal,
      "",
      "oklch(0.65 0.18 140)",
      "oklch(0.65 0.18 140)",
      "oklch(0.7 0.02 140)",
      "oklch(0.45 0.05 140)",
    );
  }, [lightLevelData]);

  const hasLightData = lightLevelData && lightLevelData.length > 0;
  const hasBlinkData = data.length > 0;
  const hasAnyData = hasBlinkData || hasLightData;

  // Loading state (only shows for first 3 seconds)
  if (isLoading && !hasAnyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state (after timeout or immediately if no data)
  if (!hasAnyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No historical data saved yet
            </p>
            <p className="text-sm text-muted-foreground">
              Connect your device to start collecting blink rate data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title} ({hasBlinkData ? data.length : (lightLevelData?.length ?? 0)}{" "}
          readings)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasBlinkData && (
          <>
            <canvas
              ref={blinkCanvasRef}
              width={800}
              height={200}
              className="w-full h-auto border border-border rounded"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>First: {formatTime(data[0].timestamp)}</span>
              <span>Latest: {formatTime(data[data.length - 1].timestamp)}</span>
            </div>
          </>
        )}

        {hasLightData && (
          <>
            <p className="text-xs font-medium text-muted-foreground">
              Real-time Light Level (VAL)
            </p>
            <canvas
              ref={lightCanvasRef}
              width={800}
              height={200}
              className="w-full h-auto border border-border rounded"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>First: {formatTime(lightLevelData![0].timestamp)}</span>
              <span>
                Latest:{" "}
                {formatTime(
                  lightLevelData![lightLevelData!.length - 1].timestamp,
                )}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
