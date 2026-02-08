import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wifi, CheckCircle2, AlertCircle, Plus, Trash2, Bluetooth, Activity } from 'lucide-react';
import { useDeviceId } from '../hooks/useDeviceId';
import { useNavigate } from '@tanstack/react-router';
import { useEyeRBluetooth } from '../hooks/useEyeRBluetooth';
import { useRecordBlinkRate } from '../hooks/useQueries';

interface SavedDevice {
  id: string;
  name: string;
  addedAt: number;
}

export default function DeviceConnection() {
  const { deviceId, setDeviceId } = useDeviceId();
  const navigate = useNavigate();
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>(() => {
    const stored = localStorage.getItem('savedDevices');
    return stored ? JSON.parse(stored) : [];
  });
  const [error, setError] = useState('');
  const [latestBlinkRate, setLatestBlinkRate] = useState<number | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  const recordBlinkRateMutation = useRecordBlinkRate();

  const handleBlinkRateChange = async (blinkRate: number) => {
    setLatestBlinkRate(blinkRate);
    setStoreError(null);

    if (!deviceId) {
      setStoreError('No device selected. Please select or add a device ID first to store readings.');
      return;
    }

    try {
      await recordBlinkRateMutation.mutateAsync({ deviceId, blinkRate });
    } catch (err: any) {
      console.error('Failed to store blink rate:', err);
      setStoreError(err.message || 'Failed to store blink rate reading');
    }
  };

  const {
    connectionState,
    error: bluetoothError,
    connect,
    disconnect,
    isSupported,
  } = useEyeRBluetooth({
    onBlinkRateChange: handleBlinkRateChange,
  });

  const handleAddDevice = () => {
    setError('');
    
    if (!newDeviceId.trim()) {
      setError('Device ID is required');
      return;
    }

    if (!newDeviceName.trim()) {
      setError('Device name is required');
      return;
    }

    if (savedDevices.some(d => d.id === newDeviceId.trim())) {
      setError('This device ID is already saved');
      return;
    }

    const newDevice: SavedDevice = {
      id: newDeviceId.trim(),
      name: newDeviceName.trim(),
      addedAt: Date.now(),
    };

    const updated = [...savedDevices, newDevice];
    setSavedDevices(updated);
    localStorage.setItem('savedDevices', JSON.stringify(updated));
    
    setNewDeviceId('');
    setNewDeviceName('');
  };

  const handleRemoveDevice = (id: string) => {
    const updated = savedDevices.filter(d => d.id !== id);
    setSavedDevices(updated);
    localStorage.setItem('savedDevices', JSON.stringify(updated));
    
    if (deviceId === id) {
      setDeviceId('');
    }
  };

  const handleSelectDevice = (id: string) => {
    setDeviceId(id);
    navigate({ to: '/' });
  };

  const handleConnectBluetooth = async () => {
    if (connectionState === 'connected') {
      disconnect();
      setLatestBlinkRate(null);
      setStoreError(null);
    } else {
      await connect();
    }
  };

  const getConnectionBadgeVariant = () => {
    switch (connectionState) {
      case 'connected':
        return 'default';
      case 'connecting':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getConnectionBadgeText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected to Eye-R';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Smartphone className="h-8 w-8" />
          Device Connection
        </h1>
        <p className="text-muted-foreground">
          Connect and manage your ESP32-C3 smart glasses devices
        </p>
      </div>

      {/* Bluetooth Connection Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Bluetooth Connection
          </CardTitle>
          <CardDescription>
            Connect directly to your Eye-R smart glasses via Web Bluetooth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Connection Status:</span>
                <Badge variant={getConnectionBadgeVariant()}>
                  {getConnectionBadgeText()}
                </Badge>
              </div>
              {latestBlinkRate !== null && connectionState === 'connected' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Latest Blink Rate: <span className="font-semibold text-foreground">{latestBlinkRate}</span> blinks/min</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleConnectBluetooth}
              disabled={!isSupported || connectionState === 'connecting'}
              variant={connectionState === 'connected' ? 'outline' : 'default'}
              className="gap-2"
            >
              <Bluetooth className="h-4 w-4" />
              {connectionState === 'connected' ? 'Disconnect' : connectionState === 'connecting' ? 'Connecting...' : 'Connect Device'}
            </Button>
          </div>

          {!isSupported && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Web Bluetooth Not Supported</AlertTitle>
              <AlertDescription>
                Your browser does not support Web Bluetooth. Please use a Chromium-based browser like Chrome, Edge, or Opera.
              </AlertDescription>
            </Alert>
          )}

          {bluetoothError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{bluetoothError}</AlertDescription>
            </Alert>
          )}

          {storeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Storage Error</AlertTitle>
              <AlertDescription>{storeError}</AlertDescription>
            </Alert>
          )}

          {connectionState === 'connected' && !deviceId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Device ID Required</AlertTitle>
              <AlertDescription>
                Please select or add a device ID below to store blink rate readings. Live data is being received but not saved.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>• Ensure your Eye-R device is powered on and in range</p>
            <p>• The device must be advertising the Heart Rate service (0x180d)</p>
            <p>• Blink rate data will be received via GATT notifications on service 0x180d (Heart Rate)</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Device
            </CardTitle>
            <CardDescription>
              Register a new ESP32-C3 device to start tracking sleep data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="e.g., glasses-001"
                className={error && !newDeviceId.trim() ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier programmed into your ESP32-C3
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="e.g., My Smart Glasses"
                className={error && !newDeviceName.trim() ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Friendly name to identify this device
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleAddDevice} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Connection Guide
            </CardTitle>
            <CardDescription>
              How to connect your ESP32-C3 smart glasses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-chart-1/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-chart-1">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Power On Device</h4>
                  <p className="text-sm text-muted-foreground">
                    Ensure your ESP32-C3 smart glasses are powered on and the IR sensor is active.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-chart-2/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-chart-2">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Configure WiFi</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect your device to WiFi using the ESP32 configuration interface.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-chart-3/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-chart-3">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Register Device ID</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your device ID to this app to start receiving telemetry data.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-chart-4/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-chart-4">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Monitor Data</h4>
                  <p className="text-sm text-muted-foreground">
                    View real-time blink rate data and sleep recommendations on the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {savedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Saved Devices
            </CardTitle>
            <CardDescription>
              Manage your registered ESP32-C3 devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{device.name}</h4>
                      {deviceId === device.id && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">ID: {device.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {deviceId !== device.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectDevice(device.id)}
                      >
                        Select
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDevice(device.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
