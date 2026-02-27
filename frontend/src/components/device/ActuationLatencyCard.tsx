import { Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActuationLatency } from '../../hooks/useQueries';

export default function ActuationLatencyCard() {
  const { data: latency, isLoading } = useActuationLatency();

  const displayValue = (() => {
    if (isLoading) return null;
    if (latency === null || latency === undefined) return '—';
    const ms = Number(latency);
    if (ms < 0) return '—';
    return `${ms} ms`;
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Actuation Latency</CardTitle>
        <Timer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <div className="text-2xl font-bold">
            {displayValue}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Eye-closed → vibration (ms)
        </p>
      </CardContent>
    </Card>
  );
}
