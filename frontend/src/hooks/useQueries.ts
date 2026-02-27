import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { BlinkRateMeasurement, VibrationEvent, UserProfile, BlinkSummary } from '../backend';

export function useGetBlinkRatesInTimeRange(deviceId: string, startTime: bigint, endTime: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<BlinkRateMeasurement[]>({
    queryKey: ['blinkRates', deviceId, startTime.toString(), endTime.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBlinkRatesInTimeRange(deviceId, startTime, endTime);
    },
    enabled: !!actor && !isFetching && !!deviceId,
    retry: false,
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
    retry: false,
  });
}

export function useGetBlinkSummariesInTimeRange(deviceId: string, startTime: bigint, endTime: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<BlinkSummary[]>({
    queryKey: ['blinkSummaries', deviceId, startTime.toString(), endTime.toString()],
    queryFn: async () => {
      if (!actor) {
        return [];
      }
      return actor.getBlinkSummariesInTimeRange(deviceId, startTime, endTime);
    },
    enabled: !!actor && !isFetching && !!deviceId,
    retry: false,
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

/**
 * Polls the backend for the most recent actuation latency value every 2 seconds.
 * Returns null when no latency has been computed yet.
 */
export function useActuationLatency() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint | null>({
    queryKey: ['actuationLatency'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMostRecentActuationLatency();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000,
    retry: false,
  });
}
