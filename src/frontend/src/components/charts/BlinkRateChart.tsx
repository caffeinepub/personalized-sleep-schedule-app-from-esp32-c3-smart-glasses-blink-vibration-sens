import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, TrendingUp } from 'lucide-react';
import type { BlinkRateMeasurement } from '../../backend';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BlinkRateChartProps {
  data: BlinkRateMeasurement[];
  isLoading: boolean;
}

export default function BlinkRateChart({ data, isLoading }: BlinkRateChartProps) {
  const chartData = data.map((m) => ({
    timestamp: new Date(Number(m.timestamp / BigInt(1_000_000))).toLocaleString(),
    blinkRate: Number(m.blinkRate),
  }));

  const avgBlinkRate = data.length > 0
    ? Math.round(data.reduce((sum, m) => sum + Number(m.blinkRate), 0) / data.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Blink Rate History
        </CardTitle>
        <CardDescription>
          Blinks per minute tracked over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading data...
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <Eye className="h-12 w-12 opacity-20" />
            <p>No blink rate data available for this time range</p>
            <p className="text-sm">Start recording data from your smart glasses</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-chart-1" />
              <span className="text-muted-foreground">Average:</span>
              <span className="font-semibold text-foreground">{avgBlinkRate} blinks/min</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                <XAxis
                  dataKey="timestamp"
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  label={{ value: 'Blinks/min', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(var(--card))',
                    border: '1px solid oklch(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="blinkRate"
                  stroke="oklch(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ fill: 'oklch(var(--chart-1))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
