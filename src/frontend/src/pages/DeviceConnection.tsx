import { useState, useEffect } from 'react';
import { useBluetooth } from '../contexts/BluetoothContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Bluetooth, Activity, AlertCircle, CheckCircle2, HardDrive } from 'lucide-react';
import { useLocalBlinkHistory } from '../hooks/useLocalBlinkHistory';

export default function DeviceConnection() {
  const { 
    connectionState, 
    error, 
    connect, 
    disconnect, 
    isSupported,
    setOnBlinkRateChange,
    latestReading
  } = useBluetooth();

  const [currentBlinkRate, setCurrentBlinkRate] = useState<number | null>(null);
  const { totalPoints, lastSaveTime } = useLocalBlinkHistory();

  const [serviceUUID, setServiceUUID] = useState('');
  const [characteristicUUID, setCharacteristicUUID] = useState('');
  const [autoDiscover, setAutoDiscover] = useState(true);
  const [useCustomProfile, setUseCustomProfile] = useState(false);

  // Set up the blink rate change handler
  useEffect(() => {
    setOnBlinkRateChange((blinkRate: number) => {
      setCurrentBlinkRate(blinkRate);
    });
  }, [setOnBlinkRateChange]);

  const handleConnect = async () => {
    await connect({
      serviceUUID: serviceUUID || undefined,
      characteristicUUID: characteristicUUID || undefined,
      autoDiscover,
      useCustomProfile,
    });
  };

  const handleDisconnect = () => {
    disconnect();
    setCurrentBlinkRate(null);
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Device Connection</h1>
          <p className="text-muted-foreground">
            Connect your ESP32-C3 smart glasses via Bluetooth to monitor blink rate in real-time
          </p>
        </div>

        {/* Browser Support Check */}
        {!isSupported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bluetooth className="h-6 w-6" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isConnected ? 'Receiving live data' : 'No active connection'}
                  </p>
                </div>
              </div>
              <Badge variant={isConnected ? 'default' : 'outline'}>
                {connectionState}
              </Badge>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={!isSupported || isConnecting}
                  className="flex-1"
                >
                  <Bluetooth className="h-4 w-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Device'}
                </Button>
              ) : (
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="flex-1"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Metrics */}
        {isConnected && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Blink Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {currentBlinkRate !== null ? currentBlinkRate : '--'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Blinks counted in the last 60 seconds
                </p>
                <Badge variant="outline" className="mt-3">
                  Live
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Local Storage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalPoints}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {lastSaveTime 
                    ? `Last saved: ${new Date(lastSaveTime).toLocaleTimeString()}` 
                    : 'No data saved yet'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Raw Sensor Reading (Debug) */}
        {latestReading && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Raw Sensor Reading (Debug)</CardTitle>
              <CardDescription>
                Light sensor value from ESP32 (values below 30 count as blinks)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-sm text-muted-foreground font-mono">{latestReading}</code>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Advanced Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
            <CardDescription>
              Configure Bluetooth connection parameters (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoDiscover"
                  checked={autoDiscover}
                  onChange={(e) => setAutoDiscover(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="autoDiscover">Auto-discover characteristics</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Automatically find the first notify-capable characteristic
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomProfile"
                  checked={useCustomProfile}
                  onChange={(e) => setUseCustomProfile(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useCustomProfile">Use custom profile</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Show all available devices instead of filtering by service
              </p>
            </div>

            {!autoDiscover && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="serviceUUID">Service UUID</Label>
                  <Input
                    id="serviceUUID"
                    placeholder="e.g., 6e400001-b5a3-f393-e0a9-e50e24dcca9e"
                    value={serviceUUID}
                    onChange={(e) => setServiceUUID(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="characteristicUUID">Characteristic UUID</Label>
                  <Input
                    id="characteristicUUID"
                    placeholder="e.g., 6e400003-b5a3-f393-e0a9-e50e24dcca9e"
                    value={characteristicUUID}
                    onChange={(e) => setCharacteristicUUID(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Step 1:</strong> Make sure your ESP32-C3 device is powered on and advertising.
            </p>
            <p>
              <strong>Step 2:</strong> Click "Connect Device" and select your device from the browser dialog.
            </p>
            <p>
              <strong>Step 3:</strong> Once connected, blink rate data will appear automatically.
            </p>
            <p className="pt-2 text-xs">
              <strong>Note:</strong> The system counts blinks when the light sensor value drops below 30. 
              Each eye closure is counted once, even if it lasts for a second. The displayed blink rate 
              shows the total number of blinks detected in the last 60 seconds.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
