export type AlertnessState = 'high-alertness' | 'normal' | 'drowsy';

export interface AlertnessStateInfo {
  label: string;
  state: AlertnessState;
}

export interface SchedulePlan {
  title: string;
  items: string[];
}

/**
 * Derives the alertness state from the 5-minute rolling average BPM
 * Rules:
 * - BPM > 18: High Alertness
 * - BPM 10-18 (inclusive): Normal
 * - BPM < 10: Drowsy
 */
export function deriveAlertnessState(rollingAverageBPM: number): AlertnessStateInfo {
  if (rollingAverageBPM > 18) {
    return {
      label: 'State: High Alertness',
      state: 'high-alertness',
    };
  } else if (rollingAverageBPM >= 10) {
    return {
      label: 'State: Normal',
      state: 'normal',
    };
  } else {
    return {
      label: 'State: Drowsy',
      state: 'drowsy',
    };
  }
}

/**
 * Returns the schedule plan for a given alertness state
 */
export function getSchedulePlanForState(state: AlertnessState): SchedulePlan {
  switch (state) {
    case 'high-alertness':
      return {
        title: 'Deep Work Schedule',
        items: [
          'Focus on complex, cognitively demanding tasks',
          'Schedule important meetings and decision-making activities',
          'Tackle challenging projects that require sustained attention',
          'Optimize this high-alertness window for peak productivity',
          'Maintain hydration and take brief movement breaks every 90 minutes',
        ],
      };
    
    case 'normal':
      return {
        title: 'Standard Work/Rest Schedule',
        items: [
          'Balance focused work with regular breaks',
          'Follow the 50-10 rule: 50 minutes work, 10 minutes rest',
          'Engage in moderate-intensity tasks and routine activities',
          'Stay hydrated and maintain good posture',
          'Plan for 7-8 hours of sleep tonight',
        ],
      };
    
    case 'drowsy':
      return {
        title: 'Immediate Rest Schedule',
        items: [
          'Take a 20-minute Nap immediately to restore alertness',
          'Find a quiet, comfortable space to rest',
          'Set an alarm to avoid oversleeping',
          'After nap: light stretching and hydration',
          'Avoid driving or operating machinery until fully alert',
          'Consider earlier bedtime tonight for recovery',
        ],
      };
  }
}
