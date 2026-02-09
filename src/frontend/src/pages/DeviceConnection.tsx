import { useState, useEffect } from 'react';
import { useBluetooth } from '../contexts/BluetoothContext';
import { useDeviceId } from '../hooks/useDeviceId';
import { useLocalBlinkHistory } from '../hooks/useLocalBlinkHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bluetooth, CheckCircle2, XCircle, Loader2, Activity, HardDrive } from 'lucide-react';

export default function DeviceConnection() {
  const { deviceId, setDeviceId, isValid } = useDeviceId();
  const { connectionState, error, connect, disconnect, isSupported, latestReading, setOnBlinkRateChange } = useBluetooth();
  const [currentBlinkRate, setCurrentBlinkRate] = useState<number | null>(null);
  const { addDataPoint, lastSaveTime, totalPoints } = useLocalBlinkHistory();

  const [serviceUUID, setServiceUUID] = useState('');
  const [characteristicUUID, setCharacteristicUUID] = useState('');
  const [useCustomProfile, setUseCustomProfile] = useState(false);

  useEffect(() => {
    setOnBlinkRateChange((blinkRate: number) => {
      setCurrentBlinkRate(blinkRate);
      // Save to localStorage immediately
      addDataPoint(blinkRate);
    });
  }, [setOnBlinkRateChange, addDataPoint]);

  const handleConnect = async () => {
    if (!isValid) {
      alert('Please enter a valid device ID first');
      return;
    }

    await connect({
      serviceUUID: serviceUUID || undefined,
      characteristicUUID: characteristicUUID || undefined,
      autoDiscover: true,
      useCustomProfile,
    });
  };

  if (!isSupported) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Device Connection</h1>
        <p className="text-muted-foreground">
          Connect your ESP32-C3 smart glasses via Bluetooth. Data is stored locally on this device.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device Configuration</CardTitle>
          <CardDescription>
            Enter your device ID and connection settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID</Label>
            <Input
              id="deviceId"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g., ESP32-001"
              disabled={connectionState === 'connected'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceUUID">Service UUID (optional)</Label>
            <Input
              id="serviceUUID"
              value={serviceUUID}
              onChange={(e) => setServiceUUID(e.target.value)}
              placeholder="Leave empty for auto-discovery"
              disabled={connectionState === 'connected'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="characteristicUUID">Characteristic UUID (optional)</Label>
            <Input
              id="characteristicUUID"
              value={characteristicUUID}
              onChange={(e) => setCharacteristicUUID(e.target.value)}
              placeholder="Leave empty for auto-discovery"
              disabled={connectionState === 'connected'}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useCustomProfile"
              checked={useCustomProfile}
              onChange={(e) => setUseCustomProfile(e.target.checked)}
              disabled={connectionState === 'connected'}
              className="h-4 w-4"
            />
            <Label htmlFor="useCustomProfile" className="cursor-pointer">
              Use custom profile (accept all devices)
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            {connectionState === 'disconnected' && (
              <Button
                onClick={handleConnect}
                disabled={!isValid}
                className="flex items-center gap-2"
              >
                <Bluetooth className="h-4 w-4" />
                Connect Device
              </Button>
            )}

            {connectionState === 'connecting' && (
              <Button disabled className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </Button>
            )}

            {connectionState === 'connected' && (
              <Button
                onClick={disconnect}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {connectionState === 'connected' && (
        <>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Connected
                </CardTitle>
                <Badge variant="default" className="bg-green-600">
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Blink Rate:</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {currentBlinkRate !== null ? currentBlinkRate : '--'}
                  </span>
                  <span className="text-xl text-muted-foreground">bpm</span>
                </div>
              </div>

              {latestReading && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Latest Reading:</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{latestReading}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Total Stored
                  </span>
                  <span className="text-lg font-semibold">{totalPoints}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Storage Location
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Local Device
                  </Badge>
                </div>
                {lastSaveTime && (
                  <p className="text-xs text-muted-foreground">
                    Last saved: {new Date(lastSaveTime).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              Blink data is being saved automatically to your browser's local storage as readings arrive.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
