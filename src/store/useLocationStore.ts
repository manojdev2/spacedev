import { create } from 'zustand';
import { Location, SearchFilters, MapViewport, LocationCategory } from '@/types';
import { fuzzyMatchMultiple } from '@/lib/fuzzyMatch';

interface LocationState {
  // Local state for filtering/selection
  selectedLocation: Location | null;
  filters: SearchFilters;
  viewport: MapViewport;
  
  // Actions
  setSelectedLocation: (location: Location | null) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  setViewport: (viewport: MapViewport) => void;
  resetFilters: () => void;
  getFilteredLocations: (locations: Location[]) => Location[];
}

const defaultFilters: SearchFilters = {
  query: '',
  category: 'all',
  radius: 50,
  city: '',
};

const defaultViewport: MapViewport = {
  center: { lat: 40.7128, lng: -73.9560 },
  zoom: 11,
};

export const useLocationStore = create<LocationState>((set, get) => ({
  selectedLocation: null,
  filters: defaultFilters,
  viewport: defaultViewport,
  
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  
  setViewport: (viewport) => set({ viewport }),
  
  resetFilters: () => set({ filters: defaultFilters }),
  
  getFilteredLocations: (locations: Location[]) => {
    const { filters } = get();
    
    return locations.filter((location) => {
      // Category filter
      if (filters.category !== 'all' && location.category !== filters.category) {
        return false;
      }
      
      // Search query filter with fuzzy matching
      if (filters.query) {
        const { matched } = fuzzyMatchMultiple(filters.query, [
          location.name,
          location.address,
          location.city,
          location.zipCode,
          `${location.city}, ${location.state}`,
        ], 0.3);
        
        if (!matched) {
          return false;
        }
      }
      
      // City filter with fuzzy matching
      if (filters.city) {
        const { matched } = fuzzyMatchMultiple(filters.city, [
          location.city,
          `${location.city}, ${location.state}`,
        ], 0.4);
        
        if (!matched) return false;
      }
      
      return location.isActive;
    });
  },
}));
