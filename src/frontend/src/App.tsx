import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import AppLayout from "./components/layout/AppLayout";
import { BluetoothProvider } from "./contexts/BluetoothContext";
import Dashboard from "./pages/Dashboard";
import DeviceConnection from "./pages/DeviceConnection";
import DeviceDataIngestion from "./pages/DeviceDataIngestion";
import SmokeTest from "./pages/SmokeTest";

function RootComponent() {
  return (
    <BluetoothProvider>
      <AppLayout />
    </BluetoothProvider>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const deviceConnectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices",
  component: DeviceConnection,
});

const ingestionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device-ingestion",
  component: DeviceDataIngestion,
});

const smokeTestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/smoke-test",
  component: SmokeTest,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  deviceConnectionRoute,
  ingestionRoute,
  smokeTestRoute,
]);

const router = createRouter({ routeTree });

export default function App() {
  return <RouterProvider router={router} />;
}
