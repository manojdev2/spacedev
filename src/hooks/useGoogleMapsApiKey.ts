import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useGoogleMapsApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApiKey() {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-api-key');
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch API key');
      } finally {
        setIsLoading(false);
      }
    }

    fetchApiKey();
  }, []);

  return { apiKey, isLoading, error };
}
