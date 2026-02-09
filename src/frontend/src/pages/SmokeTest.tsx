import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function SmokeTest() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'running' | 'pass' | 'fail';
    message?: string;
    error?: string;
  }>({ status: 'idle' });

  const runSmokeTest = async () => {
    setTestResult({ status: 'running' });
    
    try {
      if (!actor) {
        throw new Error('Actor not initialized');
      }

      // Test 1: Check if we can call a basic query method
      const role = await actor.getCallerUserRole();
      
      // Test 2: Check if we can get user profile (should return null for new users or actual profile)
      const profile = await actor.getCallerUserProfile();
      
      setTestResult({
        status: 'pass',
        message: `Backend connection successful! Role: ${role}, Profile: ${profile ? profile.name : 'Not set'}`
      });
    } catch (error: any) {
      setTestResult({
        status: 'fail',
        message: 'Backend call failed',
        error: error.message || String(error)
      });
    }
  };

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Smoke Test</h1>
        <p className="text-muted-foreground">
          Verify that the frontend can communicate with the backend canister
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current state of the application components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Internet Identity</span>
            <div className="flex items-center gap-2">
              {loginStatus === 'initializing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <Badge variant="outline">Initializing</Badge>
                </>
              ) : isAuthenticated ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <Badge variant="default">Authenticated</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <Badge variant="secondary">Anonymous</Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Backend Actor</span>
            <div className="flex items-center gap-2">
              {actorFetching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <Badge variant="outline">Loading</Badge>
                </>
              ) : actor ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <Badge variant="default">Connected</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <Badge variant="destructive">Not Available</Badge>
                </>
              )}
            </div>
          </div>

          {isAuthenticated && identity && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">Principal ID</span>
              <code className="text-xs bg-background px-2 py-1 rounded border">
                {identity.getPrincipal().toString().slice(0, 20)}...
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend Connectivity Test</CardTitle>
          <CardDescription>
            Run a test query to verify the backend canister is responding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runSmokeTest}
            disabled={!actor || actorFetching || testResult.status === 'running'}
            className="w-full"
          >
            {testResult.status === 'running' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : (
              'Run Smoke Test'
            )}
          </Button>

          {testResult.status !== 'idle' && (
            <div
              className={`p-4 rounded-lg border ${
                testResult.status === 'pass'
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                  : testResult.status === 'fail'
                  ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  : 'bg-muted border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.status === 'pass' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : testResult.status === 'fail' ? (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <p className="font-medium">
                    {testResult.status === 'pass'
                      ? 'Test Passed'
                      : testResult.status === 'fail'
                      ? 'Test Failed'
                      : 'Running...'}
                  </p>
                  {testResult.message && (
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  )}
                  {testResult.error && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Error Details:</p>
                      <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                        {testResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployment Information</CardTitle>
          <CardDescription>Environment and build details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Environment</span>
            <code className="text-xs bg-background px-2 py-1 rounded border">
              {import.meta.env.MODE}
            </code>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Build Time</span>
            <code className="text-xs bg-background px-2 py-1 rounded border">
              {new Date().toISOString()}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
