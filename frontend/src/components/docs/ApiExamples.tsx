import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Copy, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function ApiExamples() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const examples = [
    {
      title: 'Record Blink Rate',
      description: 'Submit a blink rate measurement from your ESP32-C3 device',
      code: `// JavaScript/TypeScript example
const deviceId = "glasses-001";
const blinkRate = 15n; // 15 blinks per minute (bigint)

await actor.recordBlinkRate(deviceId, blinkRate);`,
      curl: `curl -X POST https://your-canister.ic0.app/recordBlinkRate \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "glasses-001",
    "blinkRate": "15"
  }'`,
    },
    {
      title: 'Record Vibration Event',
      description: 'Submit a vibration sensor trigger event',
      code: `// JavaScript/TypeScript example
const deviceId = "glasses-001";

await actor.recordVibrationEvent(deviceId);`,
      curl: `curl -X POST https://your-canister.ic0.app/recordVibrationEvent \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "glasses-001"
  }'`,
    },
    {
      title: 'Query Blink Rates',
      description: 'Retrieve blink rate data for a time range',
      code: `// JavaScript/TypeScript example
const deviceId = "glasses-001";
const startTime = BigInt(Date.now() - 24*60*60*1000) * 1_000_000n;
const endTime = BigInt(Date.now()) * 1_000_000n;

const data = await actor.getBlinkRatesInTimeRange(
  deviceId,
  startTime,
  endTime
);`,
      curl: `curl -X GET "https://your-canister.ic0.app/getBlinkRatesInTimeRange?deviceId=glasses-001&startTime=...&endTime=..."`,
    },
  ];

  return (
    <div className="space-y-6">
      {examples.map((example, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {example.title}
            </CardTitle>
            <CardDescription>{example.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="js">
              <TabsList>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>
              <TabsContent value="js" className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => copyToClipboard(example.code, index * 2)}
                >
                  {copiedIndex === index * 2 ? (
                    <CheckCheck className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
                  <code>{example.code}</code>
                </pre>
              </TabsContent>
              <TabsContent value="curl" className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => copyToClipboard(example.curl, index * 2 + 1)}
                >
                  {copiedIndex === index * 2 + 1 ? (
                    <CheckCheck className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
                  <code>{example.curl}</code>
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
