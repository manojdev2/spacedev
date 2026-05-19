

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AI-powered extraction prompt for store locations
const EXTRACTION_PROMPT = `Extract all store/location information from this page. For each location, extract:
- name: Store or location name
- address: Full street address
- city: City name
- state: State/province code (e.g., "NY", "CA")
- zip_code: ZIP/postal code
- country: Country (default to "USA" if not specified)
- phone: Phone number
- email: Email address (if available, otherwise empty string)
- lat: Latitude coordinate (if available, otherwise null)
- lng: Longitude coordinate (if available, otherwise null)
- category: One of "retail", "warehouse", "service-center", "headquarters", or "branch" (default to "retail")
- website: Website URL (if available)
- services: Array of services offered (if available, otherwise empty array)

Return ONLY valid JSON array of location objects. If no locations found, return empty array [].`;

interface ScrapedLocation {
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
  website?: string;
  services?: string[];
}

// Geocode an address using Google Maps Geocoding API
async function geocodeAddress(address: string, googleMapsApiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    console.warn(`Geocoding failed for address: ${address}, status: ${data.status}`);
    return null;
  } catch (error) {
    console.error(`Geocoding error for address: ${address}`, error);
    return null;
  }
}

// Extract locations from content using AI
async function extractLocationsFromContent(
  content: string,
  geminiApiKey: string
): Promise<ScrapedLocation[]> {
  const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${geminiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Extract store locations from this content:\n\n${content.substring(0, 50000)}` },
      ],
      temperature: 0.1,
    }),
  });

  const aiData = await aiResponse.json();

  if (!aiResponse.ok) {
    console.error('AI extraction error:', aiData);
    return [];
  }

  const extractedContent = aiData.choices?.[0]?.message?.content || '';
  
  try {
    const jsonMatch = extractedContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
  }
  
  return [];
}

// Validate and clean locations
function validateLocations(locations: ScrapedLocation[]): ScrapedLocation[] {
  return locations.filter((loc) => 
    loc.name && loc.address && loc.city && loc.state
  ).map((loc) => ({
    name: loc.name,
    address: loc.address,
    city: loc.city,
    state: loc.state,
    zip_code: loc.zip_code || '',
    country: loc.country || 'USA',
    phone: loc.phone || '',
    email: loc.email || '',
    lat: loc.lat || null,
    lng: loc.lng || null,
    category: ['retail', 'warehouse', 'service-center', 'headquarters', 'branch'].includes(loc.category) 
      ? loc.category 
      : 'retail',
    website: loc.website || undefined,
    services: Array.isArray(loc.services) ? loc.services : [],
  }));
}

// Deduplicate locations by address
function deduplicateLocations(locations: ScrapedLocation[]): ScrapedLocation[] {
  const seen = new Set<string>();
  return locations.filter((loc) => {
    const key = `${loc.address.toLowerCase()}-${loc.city.toLowerCase()}-${loc.state.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Progress event types
type ScrapeProgressEvent = {
  type: 'progress';
  stage: 'mapping' | 'scraping' | 'extracting' | 'geocoding' | 'complete';
  message: string;
  current?: number;
  total?: number;
  url?: string;
  locationsFound?: number;
};

type ResultEvent = {
  type: 'result';
  success: boolean;
  locations?: ScrapedLocation[];
  sourceUrl?: string;
  totalFound?: number;
  geocodedCount?: number;
  pagesScraped?: number;
  mode?: string;
  error?: string;
};

type StreamEvent = ScrapeProgressEvent | ResultEvent;

function formatSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, mode = 'single', maxPages = 5, includePaths, excludePaths, stream = false } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not configured - geocoding will be skipped');
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log(`Scraping store locations from: ${formattedUrl} (mode: ${mode}, stream: ${stream})`);

    // If streaming is enabled, use SSE
    if (stream && mode === 'crawl') {
      const encoder = new TextEncoder();
      
      const readable = new ReadableStream({
        async start(controller) {
          const sendProgress = (event: StreamEvent) => {
            controller.enqueue(encoder.encode(formatSSE(event)));
          };

          try {
            const allLocations: ScrapedLocation[] = [];
            let pagesScraped = 0;

            // Step 1: Map the website
            sendProgress({
              type: 'progress',
              stage: 'mapping',
              message: 'Discovering pages on the website...',
            });

            const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${firecrawlApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: formattedUrl,
                limit: maxPages * 2,
                includeSubdomains: false,
              }),
            });

            const mapData = await mapResponse.json();

            if (!mapResponse.ok) {
              sendProgress({
                type: 'result',
                success: false,
                error: mapData.error || 'Failed to map website',
              });
              controller.close();
              return;
            }

            let discoveredUrls: string[] = mapData.links || [];
            
            // Filter URLs
            if (includePaths && includePaths.length > 0) {
              discoveredUrls = discoveredUrls.filter((u: string) => 
                includePaths.some((pattern: string) => u.toLowerCase().includes(pattern.toLowerCase()))
              );
            }
            if (excludePaths && excludePaths.length > 0) {
              discoveredUrls = discoveredUrls.filter((u: string) => 
                !excludePaths.some((pattern: string) => u.toLowerCase().includes(pattern.toLowerCase()))
              );
            }

            const urlsToScrape = discoveredUrls.slice(0, maxPages);
            const totalPages = urlsToScrape.length;

            sendProgress({
              type: 'progress',
              stage: 'mapping',
              message: `Found ${totalPages} pages to scrape`,
              total: totalPages,
            });

            // Step 2: Scrape each page
            for (let i = 0; i < urlsToScrape.length; i++) {
              const pageUrl = urlsToScrape[i];
              
              sendProgress({
                type: 'progress',
                stage: 'scraping',
                message: `Scraping page ${i + 1} of ${totalPages}`,
                current: i + 1,
                total: totalPages,
                url: pageUrl,
                locationsFound: allLocations.length,
              });

              try {
                const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${firecrawlApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    url: pageUrl,
                    formats: ['markdown'],
                    onlyMainContent: true,
                    waitFor: 2000,
                  }),
                });

                const scrapeData = await scrapeResponse.json();
                
                if (scrapeResponse.ok) {
                  const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';
                  if (pageContent) {
                    sendProgress({
                      type: 'progress',
                      stage: 'extracting',
                      message: `Extracting locations from page ${i + 1}...`,
                      current: i + 1,
                      total: totalPages,
                      url: pageUrl,
                    });

                    const locations = await extractLocationsFromContent(pageContent, geminiApiKey);
                    allLocations.push(...locations);
                    pagesScraped++;
                  }
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
              } catch (error) {
                console.error(`Error scraping ${pageUrl}:`, error);
              }
            }

            // Validate and deduplicate
            let validLocations = validateLocations(allLocations);
            validLocations = deduplicateLocations(validLocations);

            // Step 3: Geocode locations
            let geocodedCount = 0;
            if (googleMapsApiKey) {
              const locationsToGeocode = validLocations.filter(loc => !loc.lat || !loc.lng);
              const totalToGeocode = locationsToGeocode.length;

              for (let i = 0; i < locationsToGeocode.length; i++) {
                const loc = locationsToGeocode[i];
                const fullAddress = `${loc.address}, ${loc.city}, ${loc.state} ${loc.zip_code}, ${loc.country}`;
                
                sendProgress({
                  type: 'progress',
                  stage: 'geocoding',
                  message: `Geocoding address ${i + 1} of ${totalToGeocode}`,
                  current: i + 1,
                  total: totalToGeocode,
                });
                
                const coords = await geocodeAddress(fullAddress, googleMapsApiKey);
                if (coords) {
                  loc.lat = coords.lat;
                  loc.lng = coords.lng;
                  geocodedCount++;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            // Send final result
            sendProgress({
              type: 'progress',
              stage: 'complete',
              message: `Found ${validLocations.length} locations from ${pagesScraped} pages`,
              locationsFound: validLocations.length,
            });

            sendProgress({
              type: 'result',
              success: true,
              locations: validLocations,
              sourceUrl: formattedUrl,
              totalFound: validLocations.length,
              geocodedCount,
              pagesScraped,
              mode,
            });

            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            sendProgress({
              type: 'result',
              success: false,
              error: error instanceof Error ? error.message : 'Failed to scrape locations',
            });
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode (original behavior)
    let allLocations: ScrapedLocation[] = [];
    let pagesScraped = 0;

    if (mode === 'crawl') {
      console.log('Mapping website to discover pages...');
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          limit: maxPages * 2,
          includeSubdomains: false,
        }),
      });

      const mapData = await mapResponse.json();

      if (!mapResponse.ok) {
        console.error('Firecrawl map error:', mapData);
        return new Response(
          JSON.stringify({ success: false, error: mapData.error || 'Failed to map website' }),
          { status: mapResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let discoveredUrls: string[] = mapData.links || [];
      console.log(`Discovered ${discoveredUrls.length} URLs`);

      if (includePaths && includePaths.length > 0) {
        discoveredUrls = discoveredUrls.filter((u: string) => 
          includePaths.some((pattern: string) => u.toLowerCase().includes(pattern.toLowerCase()))
        );
      }
      if (excludePaths && excludePaths.length > 0) {
        discoveredUrls = discoveredUrls.filter((u: string) => 
          !excludePaths.some((pattern: string) => u.toLowerCase().includes(pattern.toLowerCase()))
        );
      }

      const urlsToScrape = discoveredUrls.slice(0, maxPages);
      console.log(`Scraping ${urlsToScrape.length} pages...`);

      for (const pageUrl of urlsToScrape) {
        try {
          console.log(`Scraping: ${pageUrl}`);
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: pageUrl,
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 2000,
            }),
          });

          const scrapeData = await scrapeResponse.json();
          
          if (scrapeResponse.ok) {
            const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';
            if (pageContent) {
              const locations = await extractLocationsFromContent(pageContent, geminiApiKey);
              allLocations.push(...locations);
              pagesScraped++;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error scraping ${pageUrl}:`, error);
        }
      }
    } else {
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        console.error('Firecrawl API error:', scrapeData);
        return new Response(
          JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape page' }),
          { status: scrapeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';
      
      if (!pageContent) {
        return new Response(
          JSON.stringify({ success: false, error: 'No content found on page' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      allLocations = await extractLocationsFromContent(pageContent, geminiApiKey);
      pagesScraped = 1;
    }

    let validLocations = validateLocations(allLocations);
    validLocations = deduplicateLocations(validLocations);

    console.log(`Extracted ${validLocations.length} unique locations from ${pagesScraped} page(s)`);

    let geocodedCount = 0;
    if (googleMapsApiKey) {
      for (const loc of validLocations) {
        if (!loc.lat || !loc.lng) {
          const fullAddress = `${loc.address}, ${loc.city}, ${loc.state} ${loc.zip_code}, ${loc.country}`;
          console.log(`Geocoding: ${fullAddress}`);
          
          const coords = await geocodeAddress(fullAddress, googleMapsApiKey);
          if (coords) {
            loc.lat = coords.lat;
            loc.lng = coords.lng;
            geocodedCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      console.log(`Geocoded ${geocodedCount} locations`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        locations: validLocations,
        sourceUrl: formattedUrl,
        totalFound: validLocations.length,
        geocodedCount,
        pagesScraped,
        mode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping store locations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape locations';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
