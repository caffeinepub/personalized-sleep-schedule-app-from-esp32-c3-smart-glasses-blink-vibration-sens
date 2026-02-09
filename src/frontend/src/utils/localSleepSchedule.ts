import type { BlinkRateDataPoint } from '../hooks/useSessionBlinkRateHistory';

export interface LocalSleepRecommendation {
  recommendations: string[];
  averageBPM: number;
  dataPointsAnalyzed: number;
}

export function generateLocalSleepSchedule(
  sessionHistory: BlinkRateDataPoint[]
): LocalSleepRecommendation {
  // Use last 100 readings
  const dataToAnalyze = sessionHistory.slice(-100);
  
  if (dataToAnalyze.length === 0) {
    return {
      recommendations: ['No data available for analysis'],
      averageBPM: 0,
      dataPointsAnalyzed: 0,
    };
  }

  // Calculate average BPM
  const totalBPM = dataToAnalyze.reduce((sum, point) => sum + point.blinkRate, 0);
  const averageBPM = totalBPM / dataToAnalyze.length;

  const recommendations: string[] = [];

  // Critical drowsiness detection
  if (averageBPM < 15) {
    recommendations.push('Drowsiness detected: Priority rest');
  }

  // Additional recommendations based on blink rate patterns
  if (averageBPM < 10) {
    recommendations.push('Extremely low blink rate detected - immediate rest recommended');
    recommendations.push('Consider taking a 20-30 minute power nap');
    recommendations.push('Avoid driving or operating heavy machinery');
  } else if (averageBPM < 15) {
    recommendations.push('Low blink rate indicates fatigue');
    recommendations.push('Take regular breaks every 30 minutes');
    recommendations.push('Ensure adequate hydration');
  } else if (averageBPM >= 15 && averageBPM < 20) {
    recommendations.push('Moderate alertness level detected');
    recommendations.push('Maintain current sleep schedule');
    recommendations.push('Consider 7-8 hours of sleep tonight');
  } else if (averageBPM >= 20 && averageBPM < 30) {
    recommendations.push('Good alertness level');
    recommendations.push('Your current sleep pattern appears healthy');
    recommendations.push('Continue with regular sleep-wake cycle');
  } else {
    recommendations.push('High blink rate detected');
    recommendations.push('May indicate stress or eye strain');
    recommendations.push('Take screen breaks and practice the 20-20-20 rule');
  }

  // Variability analysis
  const blinkRates = dataToAnalyze.map(p => p.blinkRate);
  const maxBPM = Math.max(...blinkRates);
  const minBPM = Math.min(...blinkRates);
  const variability = maxBPM - minBPM;

  if (variability > 20) {
    recommendations.push('High variability in blink rate - consider stress management techniques');
  }

  // Time-based recommendations
  const currentHour = new Date().getHours();
  if (currentHour >= 22 || currentHour < 6) {
    recommendations.push('Late night/early morning detected - prioritize sleep soon');
  } else if (currentHour >= 14 && currentHour < 16) {
    recommendations.push('Afternoon dip period - short break or light exercise recommended');
  }

  return {
    recommendations,
    averageBPM: Math.round(averageBPM * 10) / 10,
    dataPointsAnalyzed: dataToAnalyze.length,
  };
}
