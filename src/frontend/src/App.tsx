import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import DeviceDataIngestion from './pages/DeviceDataIngestion';
import DeviceConnection from './pages/DeviceConnection';
import { BluetoothProvider } from './contexts/BluetoothContext';
import { createRouter, createRoute, createRootRoute, RouterProvider } from '@tanstack/react-router';

function RootComponent() {
  return (
    <BluetoothProvider>
      <AppLayout />
    </BluetoothProvider>
  );
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
