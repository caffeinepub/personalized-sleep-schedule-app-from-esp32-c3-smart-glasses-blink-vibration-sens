import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Settings } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface DeviceSelectorProps {
  deviceId: string;
  onDeviceIdChange: (id: string) => void;
  isValid: boolean;
}

export default function DeviceSelector({ deviceId, onDeviceIdChange, isValid }: DeviceSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Device Selection
        </CardTitle>
        <CardDescription>
          Enter your ESP32-C3 smart glasses device identifier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deviceId">Device ID</Label>
          <Input
            id="deviceId"
            value={deviceId}
            onChange={(e) => onDeviceIdChange(e.target.value)}
            placeholder="e.g., glasses-001"
            className={!isValid && deviceId ? 'border-destructive' : ''}
          />
          {!isValid && deviceId && (
            <p className="text-sm text-destructive">Device ID cannot be empty</p>
          )}
        </div>
        
        <Link to="/devices">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Settings className="h-4 w-4" />
            Manage Devices
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
