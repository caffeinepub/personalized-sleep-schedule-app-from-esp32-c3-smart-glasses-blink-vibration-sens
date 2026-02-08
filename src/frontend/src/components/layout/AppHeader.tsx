import { Link, useRouterState } from '@tanstack/react-router';
import { useGetCallerUserProfile } from '../../hooks/useCurrentUserProfile';
import LoginButton from '../auth/LoginButton';
import { Moon, FileText, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppHeader() {
  const { data: userProfile } = useGetCallerUserProfile();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <header className="w-full px-6 py-4 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/assets/generated/app-icon.dim_512x512.png" alt="Sleep Tracker" className="h-9 w-9 rounded-lg" />
            <h1 className="text-xl font-semibold text-foreground">Sleep Tracker</h1>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <Link to="/">
              <Button variant={currentPath === '/' ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                <Moon className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/devices">
              <Button variant={currentPath === '/devices' ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Devices
              </Button>
            </Link>
            <Link to="/device-ingestion">
              <Button variant={currentPath === '/device-ingestion' ? 'secondary' : 'ghost'} size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                API Docs
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-sm">
              <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground font-medium">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-foreground">{userProfile.name}</span>
            </div>
          )}
          <LoginButton />
        </div>
      </div>
    </header>
  );
}
