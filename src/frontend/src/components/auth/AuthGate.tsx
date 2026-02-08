import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Moon, Sparkles } from 'lucide-react';

export default function AuthGate() {
  const { login, loginStatus } = useInternetIdentity();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex flex-col">
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/generated/app-icon.dim_512x512.png" alt="Sleep Tracker" className="h-10 w-10 rounded-lg" />
          <h1 className="text-xl font-semibold text-foreground">Sleep Tracker</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Personalized Sleep Insights</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Optimize Your Sleep with Smart Glasses
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Track your blink rate and movement patterns throughout the day. Get personalized sleep schedule recommendations based on your unique physiological data from ESP32-C3 powered smart glasses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleLogin}
                disabled={loginStatus === 'logging-in'}
                size="lg"
                className="gap-2"
              >
                <Moon className="h-5 w-5" />
                {loginStatus === 'logging-in' ? 'Connecting...' : 'Get Started'}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border/50">
              <div>
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Monitoring</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">AI</div>
                <div className="text-sm text-muted-foreground">Analysis</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Custom</div>
                <div className="text-sm text-muted-foreground">Schedule</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent rounded-3xl blur-3xl" />
            <img
              src="/assets/generated/sleep-hero.dim_1600x900.png"
              alt="Sleep tracking visualization"
              className="relative rounded-2xl shadow-2xl w-full"
            />
          </div>
        </div>
      </main>

      <footer className="w-full px-6 py-4 text-center text-sm text-muted-foreground border-t border-border/50">
        © 2026. Built with <span className="text-red-500">♥</span> using{' '}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
