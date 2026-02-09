import { Link } from '@tanstack/react-router';
import { Activity } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Sleep Tracker</h1>
              <p className="text-xs text-muted-foreground">Local-First Blink Monitoring</p>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              Dashboard
            </Link>
            <Link
              to="/devices"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              Devices
            </Link>
            <Link
              to="/device-ingestion"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground' }}
            >
              API Docs
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
