import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { VibrationEvent } from '../../backend';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VibrationEventsChartProps {
  data: VibrationEvent[];
  isLoading: boolean;
}

export default function VibrationEventsChart({ data, isLoading }: VibrationEventsChartProps) {
  // Group events by hour
  const eventsByHour = data.reduce((acc, event) => {
    const date = new Date(Number(event.timestamp / BigInt(1_000_000)));
    const hourKey = `${date.toLocaleDateString()} ${date.getHours()}:00`;
    acc[hourKey] = (acc[hourKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(eventsByHour).map(([hour, count]) => ({
    hour,
    count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Movement Events
        </CardTitle>
        <CardDescription>
          Vibration sensor triggers indicating movement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading data...
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <Activity className="h-12 w-12 opacity-20" />
            <p>No movement data available for this time range</p>
            <p className="text-sm">Start recording data from your smart glasses</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-chart-2" />
              <span className="text-muted-foreground">Total events:</span>
              <span className="font-semibold text-foreground">{data.length}</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                <XAxis
                  dataKey="hour"
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  label={{ value: 'Events', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(var(--card))',
                    border: '1px solid oklch(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="oklch(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
