import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LocationCategory } from '@/types';

export interface AISearchIntent {
  query: string;
  category: LocationCategory | null;
  city: string | null;
  state: string | null;
  radius: number | null;
  services: string[];
  openNow: boolean;
  openLate: boolean;
  hasParking: boolean;
  wheelchair: boolean;
  sortByDistance: boolean;
  interpretation: string;
}

export interface AISearchResult {
  success: boolean;
  intent?: AISearchIntent;
  originalQuery: string;
  error?: string;
}

export function useAISearch() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastIntent, setLastIntent] = useState<AISearchIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseQuery = useCallback(async (
    query: string,
    userLocation?: { lat: number; lng: number } | null
  ): Promise<AISearchResult> => {
    if (!query.trim()) {
      return { success: false, originalQuery: query, error: 'Query is empty' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-smart-search', {
        body: {
          query,
          userLocation,
          currentTime: new Date().toISOString(),
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.error) {
        setError(data.error);
        return { success: false, originalQuery: query, error: data.error };
      }

      if (data?.success && data?.intent) {
        setLastIntent(data.intent);
        return {
          success: true,
          intent: data.intent,
          originalQuery: query,
        };
      }

      throw new Error('Invalid response from AI search');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process search';
      setError(errorMessage);
      return { success: false, originalQuery: query, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearIntent = useCallback(() => {
    setLastIntent(null);
    setError(null);
  }, []);

  return {
    parseQuery,
    isProcessing,
    lastIntent,
    error,
    clearIntent,
  };
}
