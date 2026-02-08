import { useState } from 'react';
import { useDeviceId } from '../hooks/useDeviceId';
import { useGetBlinkRatesInTimeRange, useGetVibrationEventsInTimeRange, useGenerateSleepRecommendation, useGetSleepRecommendation } from '../hooks/useQueries';
import DeviceSelector from '../components/device/DeviceSelector';
import TimeRangePicker, { type TimeRange, getTimeRangeTimestamps } from '../components/time/TimeRangePicker';
import BlinkRateChart from '../components/charts/BlinkRateChart';
import VibrationEventsChart from '../components/charts/VibrationEventsChart';
import SleepScheduleCard from '../components/recommendation/SleepScheduleCard';

export default function Dashboard() {
  const { deviceId, setDeviceId, isValid } = useDeviceId();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { start, end } = getTimeRangeTimestamps(timeRange);

  const { data: blinkRates = [], isLoading: blinkRatesLoading } = useGetBlinkRatesInTimeRange(
    deviceId,
    start,
    end
  );

  const { data: vibrationEvents = [], isLoading: vibrationEventsLoading } = useGetVibrationEventsInTimeRange(
    deviceId,
    start,
    end
  );

  const generateRecommendation = useGenerateSleepRecommendation();
  const currentRecommendation = useGetSleepRecommendation(deviceId);

  const hasData = blinkRates.length > 0 || vibrationEvents.length > 0;

  const handleGenerateSchedule = async () => {
    if (!isValid || !hasData) return;
    await generateRecommendation.mutateAsync({
      deviceId,
      startTime: start,
      endTime: end,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Sleep Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your blink rate and movement patterns to optimize your sleep schedule
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <DeviceSelector deviceId={deviceId} onDeviceIdChange={setDeviceId} isValid={isValid} />
        <TimeRangePicker value={timeRange} onChange={setTimeRange} />
      </div>

      {isValid && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <BlinkRateChart data={blinkRates} isLoading={blinkRatesLoading} />
            <VibrationEventsChart data={vibrationEvents} isLoading={vibrationEventsLoading} />
          </div>

          <SleepScheduleCard
            recommendation={currentRecommendation || null}
            onGenerate={handleGenerateSchedule}
            isGenerating={generateRecommendation.isPending}
            hasData={hasData}
          />
        </>
      )}
    </div>
  );
}
