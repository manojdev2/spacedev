import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSetupState {
  isSetupComplete: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSystemSetup() {
  const [state, setState] = useState<SystemSetupState>({
    isSetupComplete: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  async function checkSetupStatus() {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if setup_complete config exists
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'setup_complete')
        .maybeSingle();

      if (error) {
        console.error('[useSystemSetup] Error checking setup status:', error);
        setState(prev => ({ ...prev, isLoading: false, error: error.message }));
        return;
      }

      // Safely check if value is an object with completed property
      const value = data?.value as Record<string, unknown> | null;
      const isComplete = typeof value === 'object' && value !== null && value.completed === true;
      setState({
        isSetupComplete: isComplete,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[useSystemSetup] Catch error:', err);
      setState({
        isSetupComplete: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return {
    ...state,
    refetch: checkSetupStatus,
  };
}
