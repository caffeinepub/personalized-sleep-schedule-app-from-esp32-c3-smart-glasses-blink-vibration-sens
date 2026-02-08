import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useCurrentUserProfile';
import AuthGate from './components/auth/AuthGate';
import ProfileSetupDialog from './components/profile/ProfileSetupDialog';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import DeviceDataIngestion from './pages/DeviceDataIngestion';
import DeviceConnection from './pages/DeviceConnection';
import { createRouter, createRoute, createRootRoute, RouterProvider } from '@tanstack/react-router';

function RootComponent() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  
  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  if (showProfileSetup) {
    return <ProfileSetupDialog />;
  }

  return <AppLayout />;
}

const rootRoute = createRootRoute({
  component: RootComponent
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard
});

const deviceConnectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/devices',
  component: DeviceConnection
});

const ingestionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/device-ingestion',
  component: DeviceDataIngestion
});

const routeTree = rootRoute.addChildren([dashboardRoute, deviceConnectionRoute, ingestionRoute]);

const router = createRouter({ routeTree });

export default function App() {
  return <RouterProvider router={router} />;
}
