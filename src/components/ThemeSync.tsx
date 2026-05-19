import { useProfileTheme } from '@/hooks/useProfileTheme';

/**
 * Component that syncs the user's profile theme preference with the app.
 * Must be rendered inside ThemeProvider.
 */
export function ThemeSync() {
  useProfileTheme();
  return null;
}
