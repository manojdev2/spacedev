import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
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

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
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
}: AddressAutocompleteProps) {
  const { apiKey } = useGoogleMaps();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sessionToken = useRef<string>(crypto.randomUUID());

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!apiKey || input.length < 3) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({ input, sessionToken: sessionToken.current }),
      });
      const data = await res.json();
      const list: Suggestion[] = (data.suggestions ?? []).map((s: { placePrediction: { placeId: string; structuredFormat: { mainText: { text: string }; secondaryText: { text: string } } } }) => ({
        placeId: s.placePrediction.placeId,
        mainText: s.placePrediction.structuredFormat?.mainText?.text ?? '',
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
      }));
      setSuggestions(list);
      setIsOpen(list.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [apiKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (value.length >= 3) fetchSuggestions(value);
      else { setSuggestions([]); setIsOpen(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [value, fetchSuggestions]);

  const handleSelect = useCallback(async (s: Suggestion) => {
    if (!apiKey) return;
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onChange(s.mainText);

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${s.placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents',
          },
        }
      );
      const place = await res.json();

      const getComponent = (types: string[], short = false): string => {
        const comp = (place.addressComponents ?? []).find((c: { types: string[]; longText: string; shortText: string }) =>
          types.some((t) => c.types.includes(t))
        );
        return short ? (comp?.shortText ?? '') : (comp?.longText ?? '');
      };

      const streetNumber = getComponent(['street_number']);
      const route = getComponent(['route']);
      const address = [streetNumber, route].filter(Boolean).join(' ')
        || getComponent(['sublocality_level_1'])
        || (place.formattedAddress ?? '').split(',')[0];

      const details: AddressDetails = {
        address,
        city: getComponent(['locality', 'sublocality', 'administrative_area_level_2']),
        state: getComponent(['administrative_area_level_1'], true),
        zipCode: getComponent(['postal_code']),
        country: getComponent(['country'], true),
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
        formattedAddress: place.formattedAddress ?? s.mainText,
      };

      onChange(details.formattedAddress || s.mainText);
      onPlaceSelect?.(details);

      // new session token for next search
      sessionToken.current = crypto.randomUUID();
    } catch (err) {
      console.error('Place details error:', err);
    }
  }, [apiKey, onChange, onPlaceSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex((p) => (p < suggestions.length - 1 ? p + 1 : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex((p) => (p > 0 ? p - 1 : suggestions.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (highlightedIndex >= 0) handleSelect(suggestions[highlightedIndex]); }
    else if (e.key === 'Escape') { setIsOpen(false); setHighlightedIndex(-1); }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      (listRef.current.children[highlightedIndex] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) && !listRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (value.length >= 3 && suggestions.length > 0) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={!apiKey ? "Loading..." : placeholder}
        disabled={!apiKey}
        className="pl-9 pr-10"
        autoComplete="off"
        required={required}
      />
      {(isSearching || value) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {value && !isSearching && (
            <button type="button" onClick={() => { onChange(''); setSuggestions([]); setIsOpen(false); inputRef.current?.focus(); }}
              className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          role="listbox">
          {suggestions.map((s, idx) => (
            <li key={s.placeId} role="option" aria-selected={highlightedIndex === idx}
              onClick={() => handleSelect(s)} onMouseEnter={() => setHighlightedIndex(idx)}
              className={cn("flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                highlightedIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.mainText}</p>
                <p className="text-xs text-muted-foreground truncate">{s.secondaryText}</p>
              </div>
            </li>
          ))}
          <li className="px-4 py-2 border-t border-border">
            <img src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png"
              alt="Powered by Google" className="h-4 opacity-60 dark:invert" />
          </li>
        </ul>
      )}
    </div>
  );
}
