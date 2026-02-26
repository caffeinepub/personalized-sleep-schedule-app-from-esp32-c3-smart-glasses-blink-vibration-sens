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

  const [serviceUUID, setServiceUUID] = useState('');
  const [characteristicUUID, setCharacteristicUUID] = useState('');
  const [autoDiscover, setAutoDiscover] = useState(true);
  const [useCustomProfile, setUseCustomProfile] = useState(false);
  const [currentBlinkRate, setCurrentBlinkRate] = useState<number>(0);
  
  const { addDataPoint } = useLocalBlinkHistory();

  useEffect(() => {
    setOnBlinkRateChange((blinkRate: number) => {
      setCurrentBlinkRate(blinkRate);
      addDataPoint(blinkRate);
    });
  }, [setOnBlinkRateChange, addDataPoint]);

  const handleConnect = async () => {
    await connect({
      serviceUUID: serviceUUID || undefined,
      characteristicUUID: characteristicUUID || undefined,
      autoDiscover,
      useCustomProfile
    });
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Device Connection</h1>
        <p className="text-muted-foreground">
          Connect your Eye-R smart glasses via Bluetooth to monitor blink rate in real-time
        </p>
      </div>

      {!isSupported && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera on desktop.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bluetooth className="h-6 w-6" />
                <div>
                  <CardTitle>Connection Status</CardTitle>
                  <CardDescription>Current device connection state</CardDescription>
                </div>
              </div>
              <Badge 
                variant={isConnected ? 'default' : 'secondary'}
                className="text-sm"
              >
                {isConnected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
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
                  onClick={disconnect} 
                  variant="outline"
                  className="flex-1"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Blink Rate Card */}
        {isConnected && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6" />
                <div>
                  <CardTitle>Live Blink Rate</CardTitle>
                  <CardDescription>
                    Blinks counted in the last 60 seconds
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl font-bold text-primary mb-2">
                  {currentBlinkRate}
                </div>
                <div className="text-sm text-muted-foreground">
                  blinks in last 60 seconds
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Sensor Reading (Debug) */}
        {isConnected && latestReading && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <HardDrive className="h-6 w-6" />
                <div>
                  <CardTitle>Raw Sensor Reading (Debug)</CardTitle>
                  <CardDescription>
                    Light level from photoresistor. Eye open: 1800–2000, Eye closed: 1500–1700. A blink is counted when the sensor transitions from open to closed state.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                {latestReading}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Connection Settings</CardTitle>
            <CardDescription>
              Optional: Customize Bluetooth service and characteristic UUIDs
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
                  className="h-4 w-4"
                />
                <Label htmlFor="autoDiscover">
                  Auto-discover notifying characteristic
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Automatically find the first characteristic that supports notifications
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomProfile"
                  checked={useCustomProfile}
                  onChange={(e) => setUseCustomProfile(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="useCustomProfile">
                  Use custom profile (accept all devices)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Show all Bluetooth devices instead of filtering by service UUID
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="serviceUUID">Service UUID (optional)</Label>
              <Input
                id="serviceUUID"
                placeholder="e.g., 6e400001-b5a3-f393-e0a9-e50e24dcca9e"
                value={serviceUUID}
                onChange={(e) => setServiceUUID(e.target.value)}
                disabled={isConnected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="characteristicUUID">Characteristic UUID (optional)</Label>
              <Input
                id="characteristicUUID"
                placeholder="e.g., 6e400003-b5a3-f393-e0a9-e50e24dcca9e"
                value={characteristicUUID}
                onChange={(e) => setCharacteristicUUID(e.target.value)}
                disabled={isConnected}
              />
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The Eye-R smart glasses use a photoresistor to measure light levels near your eye. Based on calibrated thresholds:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Eye open:</strong> Light level 1800–2000 (higher ambient light)</li>
              <li><strong>Eye closed:</strong> Light level 1500–1700 (lower light when eyelid blocks sensor)</li>
            </ul>
            <p>
              A blink is counted when the sensor reading transitions from the open state to the closed state. The system tracks blinks over a rolling 60-second window to calculate your current blink rate.
            </p>
            <p>
              <strong>Note:</strong> The blink counter shows the total number of blinks detected in the last 60 seconds, not blinks per minute averaged over time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
