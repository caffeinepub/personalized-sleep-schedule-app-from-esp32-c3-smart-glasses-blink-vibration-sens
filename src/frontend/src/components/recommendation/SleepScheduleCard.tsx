import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Sparkles, Moon, AlertCircle } from 'lucide-react';
import { type AlertnessStateInfo, type SchedulePlan, type AlertnessState } from '../../utils/personalizedSleepSchedule';

interface CapturedScheduleState {
  stateInfo: AlertnessStateInfo;
  plan: SchedulePlan;
  rollingAverage: number;
  capturedAt: number;
}

interface SleepScheduleCardProps {
  currentStateInfo: AlertnessStateInfo | null;
  currentRollingAverage: number;
  hasRecentData: boolean;
  dataPointCount: number;
  capturedSchedule: CapturedScheduleState | null;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function SleepScheduleCard({
  currentStateInfo,
  currentRollingAverage,
  hasRecentData,
  dataPointCount,
  capturedSchedule,
  onGenerate,
  isGenerating,
}: SleepScheduleCardProps) {
  const canGenerate = hasRecentData && dataPointCount >= 3;

  const getStateIcon = (state: AlertnessState) => {
    switch (state) {
      case 'high-alertness':
        return <Sparkles className="h-5 w-5 text-green-600" />;
      case 'normal':
        return <Brain className="h-5 w-5 text-blue-600" />;
      case 'drowsy':
        return <Moon className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStateBadgeVariant = (state: AlertnessState) => {
    switch (state) {
      case 'high-alertness':
        return 'default';
      case 'normal':
        return 'secondary';
      case 'drowsy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStateDisplayName = (state: AlertnessState): string => {
    switch (state) {
      case 'high-alertness':
        return 'High Alertness';
      case 'normal':
        return 'Normal';
      case 'drowsy':
        return 'Drowsy';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Personalized Sleep Schedule
        </CardTitle>
        <CardDescription>
          Generate recommendations based on your current alertness state (5-minute rolling average)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Live State */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Current State (Live)
          </h3>
          {currentStateInfo ? (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStateIcon(currentStateInfo.state)}
                <div>
                  <p className="font-semibold text-foreground">{getStateDisplayName(currentStateInfo.state)}</p>
                  <p className="text-sm text-muted-foreground">
                    Rolling Avg: {currentRollingAverage.toFixed(1)} BPM
                  </p>
                </div>
              </div>
              <Badge variant={getStateBadgeVariant(currentStateInfo.state)}>
                {dataPointCount} readings
              </Badge>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                No recent data available. Connect your device to start monitoring.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Generate Button */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            size="lg"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Brain className="h-5 w-5 mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Schedule
              </>
            )}
          </Button>
          {!canGenerate && hasRecentData && (
            <p className="text-xs text-muted-foreground text-center">
              Need at least 3 readings in the last 5 minutes
            </p>
          )}
          {!hasRecentData && (
            <p className="text-xs text-muted-foreground text-center">
              No recent data available
            </p>
          )}
        </div>

        {/* Captured Schedule */}
        {capturedSchedule && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Generated Schedule
                </h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(capturedSchedule.capturedAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  {getStateIcon(capturedSchedule.stateInfo.state)}
                  <div>
                    <p className="font-semibold text-foreground">
                      {getStateDisplayName(capturedSchedule.stateInfo.state)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Captured at {capturedSchedule.rollingAverage.toFixed(1)} BPM
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-foreground">
                    {capturedSchedule.plan.title}
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {capturedSchedule.plan.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
