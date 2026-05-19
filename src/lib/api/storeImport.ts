import { supabase } from '@/integrations/supabase/client';

export interface ScrapedLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  email: string;
  lat: number | null;
  lng: number | null;
  category: string;
  website?: string | null;
  services?: string[];
}

export interface ScrapeOptions {
  mode?: 'single' | 'crawl';
  maxPages?: number;
  includePaths?: string[];
  excludePaths?: string[];
}

export interface ScrapeResult {
  success: boolean;
  error?: string;
  locations?: ScrapedLocation[];
  sourceUrl?: string;
  totalFound?: number;
  geocodedCount?: number;
  pagesScraped?: number;
  mode?: string;
}

export interface ScrapeProgress {
  stage: 'mapping' | 'scraping' | 'extracting' | 'geocoding' | 'complete';
  message: string;
  current?: number;
  total?: number;
  url?: string;
  locationsFound?: number;
}

export type ScrapeStreamEvent = 
  | { type: 'progress'; } & ScrapeProgress
  | { type: 'result'; } & ScrapeResult;

/**
 * Scrape store locations from a retail chain's website
 */
export async function scrapeStoreLocations(
  url: string, 
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { data, error } = await supabase.functions.invoke('scrape-store-locations', {
    body: { 
      url, 
      mode: options.mode || 'single',
      maxPages: options.maxPages || 5,
      includePaths: options.includePaths,
      excludePaths: options.excludePaths,
      stream: false,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Scrape store locations with streaming progress updates
 */
export async function scrapeStoreLocationsWithProgress(
  url: string,
  options: ScrapeOptions = {},
  onProgress: (event: ScrapeStreamEvent) => void
): Promise<ScrapeResult> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const functionUrl = `https://${projectId}.supabase.co/functions/v1/scrape-store-locations`;
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        url,
        mode: options.mode || 'crawl',
        maxPages: options.maxPages || 5,
        includePaths: options.includePaths,
        excludePaths: options.excludePaths,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to scrape' };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { success: false, error: 'Stream not available' };
    }

    const decoder = new TextDecoder();
    let finalResult: ScrapeResult = { success: false, error: 'No result received' };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: ScrapeStreamEvent = JSON.parse(line.slice(6));
            onProgress(event);
            
            if (event.type === 'result') {
              finalResult = event;
            }
          } catch (e) {
            console.warn('Failed to parse SSE event:', e);
          }
        }
      }
    }

    return finalResult;
  } catch (error) {
    console.error('Streaming error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to scrape' };
  }
}
