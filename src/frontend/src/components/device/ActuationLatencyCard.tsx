import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Timer } from "lucide-react";
import { useBluetooth } from "../../contexts/BluetoothContext";

export default function ActuationLatencyCard() {
  const { actuationLatency } = useBluetooth();

  // LAT is a float in seconds. Format to 2 decimal places.
  const latencyFormatted =
    actuationLatency !== undefined ? actuationLatency.toFixed(2) : null;

  // Display label: "Monitoring..." when LAT is 0.00, "Drowsiness Detected: Xs" when > 0
  const statusMessage = (() => {
    if (latencyFormatted === null) return null;
    const val = Number.parseFloat(latencyFormatted);
    if (val <= 0) return "Monitoring...";
    return `Drowsiness Detected: ${latencyFormatted}s`;
  })();

  const isDrowsy =
    latencyFormatted !== null && Number.parseFloat(latencyFormatted) > 0;

  return (
    <Card data-ocid="actuation_latency.card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Actuation Latency</CardTitle>
        {isDrowsy ? (
          <Activity className="h-4 w-4 text-destructive" />
        ) : (
          <Timer className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${isDrowsy ? "text-destructive" : ""}`}
        >
          {latencyFormatted !== null ? `${latencyFormatted}s` : "—"}
        </div>
        {statusMessage && (
          <p
            className={`text-xs mt-1 font-medium ${
              isDrowsy ? "text-destructive" : "text-muted-foreground"
            }`}
            data-ocid="actuation_latency.success_state"
          >
            {statusMessage}
          </p>
        )}
        {!statusMessage && (
          <p
            className="text-xs text-muted-foreground mt-1"
            data-ocid="actuation_latency.loading_state"
          >
            Awaiting data...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
