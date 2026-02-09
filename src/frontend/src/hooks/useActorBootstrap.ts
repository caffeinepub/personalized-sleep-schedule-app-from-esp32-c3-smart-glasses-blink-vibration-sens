import { useState } from 'react';

export function useActorBootstrap() {
  // Deprecated: No longer performs actor initialization
  // App is now fully local-first
  const [isInitializing] = useState(false);
  const [hasError] = useState(false);

  const manualRetry = () => {
    // No-op: no backend to retry
  };

  return {
    isInitializing,
    hasError,
    manualRetry,
  };
}
