import { Outlet } from '@tanstack/react-router';
import AppHeader from './AppHeader';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
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
