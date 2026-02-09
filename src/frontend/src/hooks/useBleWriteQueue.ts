export function useBleWriteQueue() {
  // Deprecated: No longer queues writes to backend
  // App is now fully local-first
  return {
    queueSize: 0,
    isProcessing: false,
    flushQueue: async () => {
      // No-op: no backend to flush to
    },
  };
}
