import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export type TimeRange = '6h' | '24h' | '7d' | '30d';

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function getTimeRangeTimestamps(range: TimeRange): { start: bigint; end: bigint } {
  const now = Date.now();
  const end = BigInt(now * 1_000_000); // Convert to nanoseconds
  
  let hoursAgo: number;
  switch (range) {
    case '6h':
      hoursAgo = 6;
      break;
    case '24h':
      hoursAgo = 24;
      break;
    case '7d':
      hoursAgo = 24 * 7;
      break;
    case '30d':
      hoursAgo = 24 * 30;
      break;
  }
  
  const start = BigInt((now - hoursAgo * 60 * 60 * 1000) * 1_000_000);
  
  return { start, end };
}

export default function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Range
        </CardTitle>
        <CardDescription>
          Select the time period for data analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6h">Last 6 Hours</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
