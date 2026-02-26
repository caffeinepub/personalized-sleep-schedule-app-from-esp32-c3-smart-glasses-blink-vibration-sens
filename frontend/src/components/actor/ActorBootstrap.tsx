import { ReactNode } from 'react';

interface ActorBootstrapProps {
  children: ReactNode;
}

export default function ActorBootstrap({ children }: ActorBootstrapProps) {
  // Deprecated: No longer initializes actor or shows connection UI
  // App is now fully local-first
  return <>{children}</>;
}
