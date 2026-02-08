import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { BlinkRateMeasurement, VibrationEvent, SleepRecommendation, UserProfile } from '../backend';

export function useGetBlinkRatesInTimeRange(deviceId: string, startTime: bigint, endTime: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<BlinkRateMeasurement[]>({
    queryKey: ['blinkRates', deviceId, startTime.toString(), endTime.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBlinkRatesInTimeRange(deviceId, startTime, endTime);
    },
    enabled: !!actor && !isFetching && !!deviceId,
  });
}

export function useGetVibrationEventsInTimeRange(deviceId: string, startTime: bigint, endTime: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<VibrationEvent[]>({
    queryKey: ['vibrationEvents', deviceId, startTime.toString(), endTime.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getVibrationEventsInTimeRange(deviceId, startTime, endTime);
    },
    enabled: !!actor && !isFetching && !!deviceId,
  });
}

export function useRecordBlinkRate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { deviceId: string; blinkRate: number }>({
    mutationFn: async ({ deviceId, blinkRate }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordBlinkRate(deviceId, BigInt(blinkRate));
    },
    onSuccess: (_, variables) => {
      // Invalidate all blink rate queries for this device
      queryClient.invalidateQueries({ queryKey: ['blinkRates', variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ['blinkRates'] });
    },
  });
}

export function useGenerateSleepRecommendation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<SleepRecommendation, Error, { deviceId: string; startTime: bigint; endTime: bigint }>({
    mutationFn: async ({ deviceId, startTime, endTime }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.generateSleepRecommendation(deviceId, startTime, endTime);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['sleepRecommendation', variables.deviceId], data);
    },
  });
}

export function useGetSleepRecommendation(deviceId: string) {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<SleepRecommendation>(['sleepRecommendation', deviceId]);
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UserProfile>({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}
