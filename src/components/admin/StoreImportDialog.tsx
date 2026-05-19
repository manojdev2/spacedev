import { useState } from 'react';
import { Loader2, Upload, Globe, MapPin, Check, X, AlertCircle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  scrapeStoreLocations, 
  scrapeStoreLocationsWithProgress,
  ScrapedLocation, 
  ScrapeOptions,
  ScrapeProgress,
  ScrapeStreamEvent,
} from '@/lib/api/storeImport';
import { useCreateLocation } from '@/hooks/useLocations';
import { ScrapeProgressIndicator } from './ScrapeProgressIndicator';

interface StoreImportDialogProps {
  organizationId: string;
  onImportComplete?: () => void;
}

export function StoreImportDialog({ organizationId, onImportComplete }: StoreImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedLocations, setScrapedLocations] = useState<ScrapedLocation[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<'input' | 'review'>('input');
  
  // Crawl options
  const [enableCrawl, setEnableCrawl] = useState(false);
  const [maxPages, setMaxPages] = useState('5');
  const [includeFilter, setIncludeFilter] = useState('');
  const [scrapeStats, setScrapeStats] = useState<{ pagesScraped?: number; geocodedCount?: number }>({});
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress | null>(null);
  
  const createLocation = useCreateLocation();

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a store locator URL to scrape.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setScrapeProgress(null);

    try {
      const options: ScrapeOptions = {
        mode: enableCrawl ? 'crawl' : 'single',
        maxPages: parseInt(maxPages, 10),
        includePaths: includeFilter ? includeFilter.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      };

      // Use streaming for crawl mode, regular for single
      if (enableCrawl) {
        const handleProgress = (event: ScrapeStreamEvent) => {
          if (event.type === 'progress') {
            setScrapeProgress({
              stage: event.stage,
              message: event.message,
              current: event.current,
              total: event.total,
              url: event.url,
              locationsFound: event.locationsFound,
            });
          }
        };

        const result = await scrapeStoreLocationsWithProgress(url, options, handleProgress);
        
        setScrapeProgress(null);

        if (!result.success) {
          toast({
            title: 'Scraping failed',
            description: result.error || 'Failed to scrape store locations.',
            variant: 'destructive',
          });
          return;
        }

        if (!result.locations || result.locations.length === 0) {
          toast({
            title: 'No locations found',
            description: 'Could not find any store locations on this page.',
            variant: 'destructive',
          });
          return;
        }

        setScrapedLocations(result.locations);
        setSelectedLocations(new Set(result.locations.map((_, i) => i)));
        setScrapeStats({
          pagesScraped: result.pagesScraped,
          geocodedCount: result.geocodedCount,
        });
        setStep('review');
        
        toast({
          title: 'Locations found',
          description: `Found ${result.locations.length} store location(s) from ${result.pagesScraped} pages.`,
        });
      } else {
        // Single page scrape (non-streaming)
        const result = await scrapeStoreLocations(url, options);

        if (!result.success) {
          toast({
            title: 'Scraping failed',
            description: result.error || 'Failed to scrape store locations.',
            variant: 'destructive',
          });
          return;
        }

        if (!result.locations || result.locations.length === 0) {
          toast({
            title: 'No locations found',
            description: 'Could not find any store locations on this page.',
            variant: 'destructive',
          });
          return;
        }

        setScrapedLocations(result.locations);
        setSelectedLocations(new Set(result.locations.map((_, i) => i)));
        setScrapeStats({
          pagesScraped: result.pagesScraped,
          geocodedCount: result.geocodedCount,
        });
        setStep('review');
        
        toast({
          title: 'Locations found',
          description: `Found ${result.locations.length} store location(s).`,
        });
      }
    } catch (error) {
      console.error('Scrape error:', error);
      setScrapeProgress(null);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while scraping.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLocation = (index: number) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLocations(newSelected);
  };

  const selectAll = () => {
    setSelectedLocations(new Set(scrapedLocations.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedLocations(new Set());
  };

  const handleImport = async () => {
    if (selectedLocations.size === 0) {
      toast({
        title: 'No locations selected',
        description: 'Please select at least one location to import.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const index of selectedLocations) {
      const location = scrapedLocations[index];
      
      try {
        await createLocation.mutateAsync({
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zip_code,
          country: location.country,
          phone: location.phone,
          email: location.email || 'contact@example.com',
          lat: location.lat || 0,
          lng: location.lng || 0,
          category: location.category as 'retail' | 'warehouse' | 'service-center' | 'headquarters' | 'branch',
          website: location.website || undefined,
          services: location.services || [],
          isActive: true,
          clientId: organizationId,
          openingHours: {
            monday: { isOpen: true, open: '09:00', close: '17:00' },
            tuesday: { isOpen: true, open: '09:00', close: '17:00' },
            wednesday: { isOpen: true, open: '09:00', close: '17:00' },
            thursday: { isOpen: true, open: '09:00', close: '17:00' },
            friday: { isOpen: true, open: '09:00', close: '17:00' },
            saturday: { isOpen: false, open: '10:00', close: '14:00' },
            sunday: { isOpen: false, open: '10:00', close: '14:00' },
          },
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to import location ${location.name}:`, error);
        errorCount++;
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      toast({
        title: 'Import complete',
        description: `Successfully imported ${successCount} location(s).${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
      });
      onImportComplete?.();
      handleClose();
    } else {
      toast({
        title: 'Import failed',
        description: 'Failed to import any locations. Please check the data and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setUrl('');
    setScrapedLocations([]);
    setSelectedLocations(new Set());
    setStep('input');
    setEnableCrawl(false);
    setMaxPages('5');
    setIncludeFilter('');
    setScrapeStats({});
    setScrapeProgress(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Globe className="h-4 w-4 mr-2" />
          Import from Website
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' ? 'Import Store Locations' : 'Review Scraped Locations'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' 
              ? 'Enter a store locator URL to automatically scrape location data.'
              : `Found ${scrapedLocations.length} locations${scrapeStats.pagesScraped && scrapeStats.pagesScraped > 1 ? ` from ${scrapeStats.pagesScraped} pages` : ''}. Select which ones to import.`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <form onSubmit={handleScrape} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Store Locator URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/store-locator"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the URL of a store locator or locations page.
              </p>
            </div>

            {/* Bulk Crawl Options */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="enable-crawl" className="font-medium">
                    Bulk Crawl Mode
                  </Label>
                </div>
                <Switch
                  id="enable-crawl"
                  checked={enableCrawl}
                  onCheckedChange={setEnableCrawl}
                  disabled={isLoading}
                />
              </div>
              
              {enableCrawl && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Crawl multiple pages to find all store locations across paginated results.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="max-pages" className="text-xs">Max Pages</Label>
                      <Select value={maxPages} onValueChange={setMaxPages} disabled={isLoading}>
                        <SelectTrigger id="max-pages">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 pages</SelectItem>
                          <SelectItem value="5">5 pages</SelectItem>
                          <SelectItem value="10">10 pages</SelectItem>
                          <SelectItem value="20">20 pages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="include-filter" className="text-xs">URL Filter (optional)</Label>
                      <Input
                        id="include-filter"
                        placeholder="store, location"
                        value={includeFilter}
                        onChange={(e) => setIncludeFilter(e.target.value)}
                        disabled={isLoading}
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Filter: comma-separated keywords to include in URLs (e.g., "store, location, page").
                  </p>
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {isLoading && scrapeProgress && (
              <ScrapeProgressIndicator progress={scrapeProgress} />
            )}

            {/* Tips */}
            {!isLoading && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Tips for best results:</p>
                    <ul className="text-muted-foreground text-xs mt-1 space-y-0.5">
                      <li>• Use the main store locator or "All Locations" page</li>
                      <li>• Pages with lists of addresses work best</li>
                      <li>• Enable bulk crawl for paginated store locators</li>
                      <li>• Locations are automatically geocoded if coordinates are missing</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !url.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {enableCrawl ? 'Crawling...' : 'Scraping...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {enableCrawl ? 'Crawl & Extract' : 'Scrape Locations'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm text-muted-foreground">
                  {selectedLocations.size} of {scrapedLocations.length} selected
                </span>
                {scrapeStats.geocodedCount !== undefined && scrapeStats.geocodedCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {scrapeStats.geocodedCount} location(s) geocoded automatically
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-2">
                {scrapedLocations.map((location, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLocations.has(index) 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleLocation(index)}
                  >
                    <Checkbox
                      checked={selectedLocations.has(index)}
                      onCheckedChange={() => toggleLocation(index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{location.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {location.address}, {location.city}, {location.state} {location.zip_code}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {location.phone && <span>{location.phone}</span>}
                        <span className="capitalize">{location.category}</span>
                        {location.lat && location.lng ? (
                          <span className="text-success flex items-center gap-1">
                            <Check className="h-3 w-3" /> Coordinates
                          </span>
                        ) : (
                          <span className="text-warning flex items-center gap-1">
                            <X className="h-3 w-3" /> No coordinates
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('input')} disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading || selectedLocations.size === 0}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {selectedLocations.size} Location(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
