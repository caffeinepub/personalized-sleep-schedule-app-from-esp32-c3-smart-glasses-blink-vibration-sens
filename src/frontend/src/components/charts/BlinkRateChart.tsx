import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle } from 'lucide-react';
import type { BlinkRateDataPoint } from '../../hooks/useSessionBlinkRateHistory';

interface BlinkRateChartProps {
  data: BlinkRateDataPoint[];
  title?: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function BlinkRateChart({ data, title = 'Blink Rate History' }: BlinkRateChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    if (data.length > 0) {
      setIsLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    ctx.clearRect(0, 0, width, height);

    const values = data.map(d => d.blinkRate);
    const maxRate = Math.max(...values, 30);
    const minRate = Math.min(...values, 0);
    const range = maxRate - minRate || 1;

    // Draw line
    ctx.strokeStyle = 'oklch(0.65 0.15 200)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * plotWidth;
      const y = padding + plotHeight - ((point.blinkRate - minRate) / range) * plotHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = 'oklch(0.65 0.15 200)';
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * plotWidth;
      const y = padding + plotHeight - ((point.blinkRate - minRate) / range) * plotHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw baseline
    ctx.strokeStyle = 'oklch(0.7 0.02 200)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding + plotHeight);
    ctx.lineTo(padding + plotWidth, padding + plotHeight);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = 'oklch(0.45 0.05 200)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxRate} bpm`, 5, padding + 12);
    ctx.fillText(`${minRate} bpm`, 5, padding + plotHeight);

  }, [data]);

  // Loading state (only shows for first 3 seconds)
  if (isLoading && data.length === 0) {
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
  if (data.length === 0) {
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
          {title} ({data.length} readings)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-auto border border-border rounded"
        />
        
        {data.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>First: {formatTime(data[0].timestamp)}</span>
            <span>Latest: {formatTime(data[data.length - 1].timestamp)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
