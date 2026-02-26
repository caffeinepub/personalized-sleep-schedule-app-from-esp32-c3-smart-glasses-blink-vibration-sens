import { Battery, BatteryCharging, BatteryFull, BatteryMedium, BatteryLow, BatteryWarning, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BatteryIndicatorProps {
  batteryPercentage: number | undefined;
  isCharging: boolean;
}

function getBatteryIcon(percentage: number | undefined, isCharging: boolean) {
  if (isCharging) {
    return <BatteryCharging className="h-5 w-5 text-success" />;
  }
  if (percentage === undefined) {
    return <Battery className="h-5 w-5 text-muted-foreground" />;
  }
  if (percentage > 80) {
    return <BatteryFull className="h-5 w-5 text-success" />;
  }
  if (percentage > 50) {
    return <BatteryMedium className="h-5 w-5 text-success" />;
  }
  if (percentage > 20) {
    return <BatteryLow className="h-5 w-5 text-warning" />;
  }
  return <BatteryWarning className="h-5 w-5 text-destructive" />;
}

function getBatteryColor(percentage: number | undefined): string {
  if (percentage === undefined) return 'bg-muted';
  if (percentage > 50) return 'bg-success';
  if (percentage > 20) return 'bg-warning';
  return 'bg-destructive';
}

function getBatteryTextColor(percentage: number | undefined): string {
  if (percentage === undefined) return 'text-muted-foreground';
  if (percentage > 50) return 'text-success';
  if (percentage > 20) return 'text-warning';
  return 'text-destructive';
}

export default function BatteryIndicator({ batteryPercentage, isCharging }: BatteryIndicatorProps) {
  const hasData = batteryPercentage !== undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Battery</CardTitle>
        {getBatteryIcon(batteryPercentage, isCharging)}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getBatteryTextColor(batteryPercentage)}`}>
          {hasData ? `${batteryPercentage}%` : '-- %'}
        </div>

        {hasData && (
          <div className="mt-2">
            <Progress
              value={batteryPercentage}
              className="h-2"
            />
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          {isCharging ? (
            <Badge variant="outline" className="text-success border-success gap-1">
              <Zap className="h-3 w-3" />
              Charging
            </Badge>
          ) : (
            <p className="text-xs text-muted-foreground">
              {hasData ? 'Not charging' : 'No data received'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
