import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

async function saveThemeToProfile(theme: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('user_id', user.id)
    .maybeSingle();
  const existing = (profile?.preferences as Record<string, unknown>) ?? {};
  await supabase.from('profiles').update({ preferences: { ...existing, theme } }).eq('user_id', user.id);
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const handleSetTheme = (t: string) => {
    setTheme(t);
    saveThemeToProfile(t);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleSetTheme('light')}
          className={`flex items-center gap-2 cursor-pointer ${theme === 'light' ? 'bg-muted' : ''}`}
        >
          <Sun className="h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSetTheme('dark')}
          className={`flex items-center gap-2 cursor-pointer ${theme === 'dark' ? 'bg-muted' : ''}`}
        >
          <Moon className="h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSetTheme('system')}
          className={`flex items-center gap-2 cursor-pointer ${theme === 'system' ? 'bg-muted' : ''}`}
        >
          <Monitor className="h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
