import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface AddressDetails {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (details: AddressDetails) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  isMapLoaded?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing an address...",
  className,
  required = false,
  isMapLoaded = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Initialize services when API is loaded
  useEffect(() => {
    if (isMapLoaded && window.google) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      // Create a dummy div for PlacesService (required but not displayed)
      const dummyDiv = document.createElement('div');
      placesService.current = new google.maps.places.PlacesService(dummyDiv);
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isMapLoaded]);

  // Fetch predictions from Google Places API
  const fetchPredictions = useCallback(async (input: string) => {
    if (!autocompleteService.current || !input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        sessionToken: sessionToken.current!,
        types: ['address'],
      };

      autocompleteService.current.getPlacePredictions(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setIsOpen(true);
        } else {
          setPredictions([]);
        }
        setIsSearching(false);
      });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
      setIsSearching(false);
    }
  }, []);

  // Debounced input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.length >= 3) {
        fetchPredictions(value);
      } else {
        setPredictions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, fetchPredictions]);

  // Parse place details to extract address components
  const parseAddressComponents = (
    place: google.maps.places.PlaceResult
  ): AddressDetails => {
    const components = place.address_components || [];
    
    const getComponent = (types: string[]): string => {
      const component = components.find((c) =>
        types.some((type) => c.types.includes(type))
      );
      return component?.long_name || '';
    };

    const getShortComponent = (types: string[]): string => {
      const component = components.find((c) =>
        types.some((type) => c.types.includes(type))
      );
      return component?.short_name || '';
    };

    // Build street address from components
    const streetNumber = getComponent(['street_number']);
    const route = getComponent(['route']);
    const address = [streetNumber, route].filter(Boolean).join(' ') || 
                   getComponent(['sublocality_level_1']) ||
                   place.formatted_address?.split(',')[0] || '';

    return {
      address,
      city: getComponent(['locality', 'sublocality', 'administrative_area_level_2']),
      state: getShortComponent(['administrative_area_level_1']),
      zipCode: getComponent(['postal_code']),
      country: getShortComponent(['country']),
      lat: place.geometry?.location?.lat() || 0,
      lng: place.geometry?.location?.lng() || 0,
      formattedAddress: place.formatted_address || '',
    };
  };

  // Handle place selection
  const handleSelect = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: ['address_components', 'formatted_address', 'geometry'],
      sessionToken: sessionToken.current!,
    };

    placesService.current.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        const details = parseAddressComponents(place);
        onChange(details.address);
        onPlaceSelect?.(details);
        
        // Generate new session token for next search
        sessionToken.current = new google.maps.places.AutocompleteSessionToken();
      }
    });

    setPredictions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onChange, onPlaceSelect]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'ArrowDown' && predictions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && predictions[highlightedIndex]) {
          handleSelect(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isMapLoaded) {
    return (
      <div className="relative">
        <Input
          placeholder="Loading..."
          disabled
          className={className}
        />
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value.length >= 3 && predictions.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9 pr-10"
        autoComplete="off"
        required={required}
      />
      {(isSearching || value) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {value && !isSearching && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setPredictions([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          role="listbox"
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.place_id}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => handleSelect(prediction)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                highlightedIndex === index
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </li>
          ))}
          <li className="px-4 py-2 border-t border-border">
            <img
              src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png"
              alt="Powered by Google"
              className="h-4 opacity-60 dark:invert"
            />
          </li>
        </ul>
      )}
    </div>
  );
}
