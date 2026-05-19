import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, X, Loader2, Zap, MapPin, Clock, Car, Accessibility, Tag, Wifi, Coffee, Truck, Zap as EvIcon, Bath, Fuel, Gift, Package, Dog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAISearch, AISearchIntent } from '@/hooks/useAISearch';

// Quick filter chips configuration
const quickFilters = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'restrooms', label: 'Restrooms', icon: Bath },
  { id: 'drive-through', label: 'Drive-through', icon: Truck },
  { id: 'ev-charging', label: 'EV Charging', icon: Fuel },
  { id: 'cafe', label: 'Café', icon: Coffee },
  { id: 'pet-friendly', label: 'Pet Friendly', icon: Dog },
  { id: 'curbside-pickup', label: 'Curbside', icon: Package },
];

// Map service names to icons
const serviceIcons: Record<string, React.ReactNode> = {
  'wifi': <Wifi className="h-3 w-3" />,
  'free-wifi': <Wifi className="h-3 w-3" />,
  'parking': <Car className="h-3 w-3" />,
  'ev-charging': <EvIcon className="h-3 w-3" />,
  'cafe': <Coffee className="h-3 w-3" />,
  'coffee': <Coffee className="h-3 w-3" />,
  'delivery': <Truck className="h-3 w-3" />,
  'curbside-pickup': <Truck className="h-3 w-3" />,
  'restrooms': <Bath className="h-3 w-3" />,
  'drive-through': <Truck className="h-3 w-3" />,
  'pet-friendly': <Dog className="h-3 w-3" />,
};

// Format service names for display
const formatServiceName = (service: string): string => {
  return service
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface SmartSearchBarProps {
  onSearchResult: (intent: AISearchIntent) => void;
  onClear: () => void;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

const exampleQueries = [
  "Find stores near me open late with parking",
  "Retail locations in Brooklyn with WiFi",
  "Service centers within 10 miles with drive-through",
  "Wheelchair accessible stores with restrooms nearby",
  "Stores with EV charging and curbside pickup",
];

export function SmartSearchBar({ 
  onSearchResult, 
  onClear, 
  userLocation,
  className 
}: SmartSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { parseQuery, isProcessing, lastIntent, error, clearIntent } = useAISearch();

  // Load saved amenity preferences on mount
  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const { getSavedAmenityPreferences } = await import('@/hooks/useAmenityPreferences');
        const savedAmenities = await getSavedAmenityPreferences();
        if (savedAmenities.length > 0) {
          setActiveFilters(savedAmenities);
        }
      } catch (err) {
        console.error('Failed to load amenity preferences:', err);
      } finally {
        setPreferencesLoaded(true);
      }
    };
    loadSavedPreferences();
  }, []);

  // Toggle a quick filter chip
  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId];
      return newFilters;
    });
  };

  // Build query with active filters and search
  const searchWithFilters = async (baseQuery: string = '') => {
    if (isProcessing) return;
    
    const filterTerms = activeFilters.map(f => {
      const filter = quickFilters.find(qf => qf.id === f);
      return filter?.label || f;
    }).join(', ');
    
    const fullQuery = baseQuery.trim()
      ? (filterTerms ? `${baseQuery} with ${filterTerms}` : baseQuery)
      : (filterTerms ? `Find stores with ${filterTerms} nearby` : '');
    
    if (!fullQuery) return;
    
    const result = await parseQuery(fullQuery, userLocation);
    if (result.success && result.intent) {
      onSearchResult(result.intent);
      setShowExamples(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isProcessing) return;

    const result = await parseQuery(query, userLocation);
    if (result.success && result.intent) {
      onSearchResult(result.intent);
      setShowExamples(false);
    }
  };

  const handleExampleClick = async (example: string) => {
    setQuery(example);
    setShowExamples(false);
    
    const result = await parseQuery(example, userLocation);
    if (result.success && result.intent) {
      onSearchResult(result.intent);
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveFilters([]);
    clearIntent();
    onClear();
    inputRef.current?.focus();
  };

  // Trigger search when filters change (if there are active filters and preferences are loaded)
  useEffect(() => {
    if (activeFilters.length > 0 && !isProcessing && preferencesLoaded) {
      const timer = setTimeout(() => {
        searchWithFilters(query);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeFilters, preferencesLoaded]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowExamples(false);
    }
  };

  // Close examples when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowExamples(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
          </div>
          
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => !lastIntent && setShowExamples(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ask in natural language... e.g., 'stores near me open late'"
            className="pl-11 pr-24 h-12 text-base bg-card border-border focus:border-primary"
            disabled={isProcessing}
          />
          
          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!query.trim() || isProcessing}
              className="h-8 px-3"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {quickFilters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              disabled={isProcessing}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                "border hover:scale-105 active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Example Queries Dropdown */}
      <AnimatePresence>
        {showExamples && !isProcessing && activeFilters.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 p-3 bg-card border border-border rounded-lg shadow-lg"
            style={{ top: '100%' }}
          >
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Try these AI-powered searches:
            </p>
            <div className="space-y-1">
              {exampleQueries.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Interpretation Display */}
      <AnimatePresence>
        {lastIntent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-lg"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-medium text-primary">
                  {lastIntent.interpretation}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {lastIntent.category && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {lastIntent.category}
                </Badge>
              )}
              {lastIntent.city && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {lastIntent.city}{lastIntent.state ? `, ${lastIntent.state}` : ''}
                </Badge>
              )}
              {lastIntent.radius && (
                <Badge variant="secondary" className="gap-1">
                  Within {lastIntent.radius} miles
                </Badge>
              )}
              {lastIntent.openNow && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Open now
                </Badge>
              )}
              {lastIntent.openLate && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Open late
                </Badge>
              )}
              {lastIntent.hasParking && (
                <Badge variant="secondary" className="gap-1">
                  <Car className="h-3 w-3" />
                  Parking
                </Badge>
              )}
              {lastIntent.wheelchair && (
                <Badge variant="secondary" className="gap-1">
                  <Accessibility className="h-3 w-3" />
                  Accessible
                </Badge>
              )}
              {lastIntent.services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-primary/10 mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Amenities:</span>
                  {lastIntent.services.map((service, i) => (
                    <Badge key={i} variant="outline" className="gap-1 text-xs">
                      {serviceIcons[service.toLowerCase()] || null}
                      {formatServiceName(service)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
