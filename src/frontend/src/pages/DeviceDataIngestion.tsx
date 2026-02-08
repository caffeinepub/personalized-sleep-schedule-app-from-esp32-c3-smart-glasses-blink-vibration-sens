import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ApiExamples from '../components/docs/ApiExamples';
import { FileText, AlertCircle, Zap, Database } from 'lucide-react';

export default function DeviceDataIngestion() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText className="h-8 w-8" />
          Device Data Ingestion API
        </h1>
        <p className="text-muted-foreground">
          Documentation for submitting telemetry data from your ESP32-C3 smart glasses
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          All timestamps must be in nanoseconds (multiply milliseconds by 1,000,000). Blink rates are also bigint values.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-chart-1 mb-2" />
            <CardTitle className="text-lg">Real-time Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Submit data as it's collected from your sensors for immediate analysis
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Database className="h-8 w-8 text-chart-2 mb-2" />
            <CardTitle className="text-lg">Persistent Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              All data is stored on-chain and persists across canister upgrades
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 text-chart-3 mb-2" />
            <CardTitle className="text-lg">Simple API</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Easy-to-use methods for recording blink rates and vibration events
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Fields</CardTitle>
          <CardDescription>Required fields for telemetry submission</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">deviceId</h4>
                <p className="text-sm text-muted-foreground mb-1">Type: <code className="text-xs bg-muted px-1 py-0.5 rounded">string</code></p>
                <p className="text-sm text-muted-foreground">
                  Unique identifier for your ESP32-C3 device (e.g., "glasses-001")
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">blinkRate</h4>
                <p className="text-sm text-muted-foreground mb-1">Type: <code className="text-xs bg-muted px-1 py-0.5 rounded">bigint</code></p>
                <p className="text-sm text-muted-foreground">
                  Number of blinks per minute detected by the IR sensor
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">timestamp</h4>
                <p className="text-sm text-muted-foreground mb-1">Type: <code className="text-xs bg-muted px-1 py-0.5 rounded">bigint (nanoseconds)</code></p>
                <p className="text-sm text-muted-foreground">
                  Automatically set by the backend when data is received
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">vibration event</h4>
                <p className="text-sm text-muted-foreground mb-1">Type: <code className="text-xs bg-muted px-1 py-0.5 rounded">trigger</code></p>
                <p className="text-sm text-muted-foreground">
                  Records when the vibration sensor detects movement
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">API Examples</h2>
        <ApiExamples />
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Integration Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-chart-1/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-chart-1">1</span>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Batch Your Requests</h4>
              <p className="text-sm text-muted-foreground">
                If your device collects data frequently, consider batching multiple measurements into fewer API calls to reduce overhead.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-chart-2/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-chart-2">2</span>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Handle Errors Gracefully</h4>
              <p className="text-sm text-muted-foreground">
                Implement retry logic for network failures. The backend will return clear error messages for invalid payloads.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-chart-3/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-chart-3">3</span>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Use Consistent Device IDs</h4>
              <p className="text-sm text-muted-foreground">
                Keep your device ID consistent across all requests to ensure data is properly grouped for analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
