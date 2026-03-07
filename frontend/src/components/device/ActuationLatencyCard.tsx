import { Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBluetooth } from '../../contexts/BluetoothContext';

export default function ActuationLatencyCard() {
  const { actuationLatency } = useBluetooth();

  const displayValue = (() => {
    if (actuationLatency === undefined) return '—';
    if (actuationLatency < 0) return '—';
    return `${actuationLatency} ms`;
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Actuation Latency</CardTitle>
        <Timer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {displayValue}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Eye-closed → vibration (ms)
        </p>
      </CardContent>
    </Card>
  );
}
