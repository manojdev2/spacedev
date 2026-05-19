import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Building2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Location } from '@/types';
import { cn } from '@/lib/utils';
import { fuzzyMatchMultiple } from '@/lib/fuzzyMatch';

interface SearchAutocompleteProps {
  locations: Location[];
  value: string;
  onChange: (value: string) => void;
  onSelect?: (location: Location) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  type: 'location' | 'city';
  text: string;
  location?: Location;
  count?: number;
  score: number;
}

export function SearchAutocomplete({
  locations,
  value,
  onChange,
  onSelect,
  placeholder = "Search by name, address, city, or zip code...",
  className,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Generate suggestions based on input with fuzzy matching
  const suggestions = useMemo((): Suggestion[] => {
    if (!value.trim() || value.length < 2) return [];

    const query = value.trim();
    const results: Suggestion[] = [];
    const seenCities = new Set<string>();

    // Find matching locations using fuzzy search
    const scoredLocations = locations.map((loc) => {
      const { score, bestMatch } = fuzzyMatchMultiple(query, [
        loc.name,
        loc.address,
        loc.city,
        loc.zipCode,
        `${loc.city}, ${loc.state}`,
      ]);
      return { location: loc, score, bestMatch };
    });

    // Filter and sort by score
    const matchingLocations = scoredLocations
      .filter((item) => item.score > 0.3)
      .sort((a, b) => b.score - a.score);

    // Add city suggestions first (grouped by best scoring city match)
    matchingLocations.forEach(({ location: loc, score }) => {
      const cityKey = `${loc.city}, ${loc.state}`.toLowerCase();
      if (!seenCities.has(cityKey)) {
        const cityScore = fuzzyMatchMultiple(query, [loc.city, `${loc.city}, ${loc.state}`]).score;
        if (cityScore > 0.4) {
          const cityCount = locations.filter(
            (l) => l.city.toLowerCase() === loc.city.toLowerCase() && l.state === loc.state
          ).length;
          seenCities.add(cityKey);
          results.push({
            type: 'city',
            text: `${loc.city}, ${loc.state}`,
            count: cityCount,
            score: cityScore,
          });
        }
      }
    });

    // Add individual location suggestions
    matchingLocations.slice(0, 5).forEach(({ location: loc, score }) => {
      results.push({
        type: 'location',
        text: loc.name,
        location: loc,
        score,
      });
    });

    // Sort all results by score and return top 8
    return results.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [value, locations]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
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
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: Suggestion) => {
    if (suggestion.type === 'city') {
      onChange(suggestion.text.split(',')[0]); // Just use city name
    } else if (suggestion.location) {
      onChange(suggestion.text);
      onSelect?.(suggestion.location);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
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

  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          if (value.length >= 2) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-10 h-12"
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setIsOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.text}-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                highlightedIndex === index
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              {suggestion.type === 'city' ? (
                <>
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{suggestion.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.count} location{suggestion.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{suggestion.text}</p>
                    {suggestion.location && (
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.location.address}, {suggestion.location.city}
                      </p>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
