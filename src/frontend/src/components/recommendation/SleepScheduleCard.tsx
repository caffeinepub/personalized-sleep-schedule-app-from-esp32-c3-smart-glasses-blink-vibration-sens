import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Sparkles, AlertCircle } from 'lucide-react';
import type { SleepRecommendation } from '../../backend';

interface SleepScheduleCardProps {
  recommendation: SleepRecommendation | null;
  onGenerate: () => void;
  isGenerating: boolean;
  hasData: boolean;
}

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp / BigInt(1_000_000)));
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp / BigInt(1_000_000)));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function SleepScheduleCard({
  recommendation,
  onGenerate,
  isGenerating,
  hasData,
}: SleepScheduleCardProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-chart-1" />
          Personalized Sleep Schedule
        </CardTitle>
        <CardDescription>
          AI-generated recommendations based on your blink rate and movement patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No data available for the selected time range
            </p>
            <p className="text-sm text-muted-foreground">
              Record some data from your smart glasses first
            </p>
          </div>
        ) : !recommendation ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <Moon className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Generate your personalized sleep schedule based on collected data
            </p>
            <Button onClick={onGenerate} disabled={isGenerating} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {isGenerating ? 'Analyzing...' : 'Generate Schedule'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-5 w-5 text-chart-1" />
                  <span className="text-sm font-medium text-muted-foreground">Bedtime</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {formatTime(recommendation.suggestedBedtime)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDate(recommendation.suggestedBedtime)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-5 w-5 text-chart-4" />
                  <span className="text-sm font-medium text-muted-foreground">Wake Time</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {formatTime(recommendation.suggestedWakeup)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDate(recommendation.suggestedWakeup)}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-medium text-foreground">About Your Schedule</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This schedule is personalized based on your blink rate patterns and movement data collected between{' '}
                {formatDate(recommendation.analysisWindowStart)} and {formatDate(recommendation.analysisWindowEnd)}.
                Your blink rate indicates optimal alertness periods, while movement data helps identify your natural rest cycles.
              </p>
            </div>

            <Button onClick={onGenerate} disabled={isGenerating} variant="outline" className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              {isGenerating ? 'Regenerating...' : 'Regenerate Schedule'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
