import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, ArrowRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFavorites } from '@/hooks/useFavorites';
import { usePublicLocations } from '@/hooks/useLocations';
import { LocationCard } from '@/components/locator/LocationCard';
import { LocationCategory } from '@/types';

const categories: { value: LocationCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'service-center', label: 'Service Center' },
  { value: 'headquarters', label: 'Headquarters' },
  { value: 'branch', label: 'Branch Office' },
];

type SortOption = 'recent' | 'oldest' | 'a-z' | 'z-a';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'a-z', label: 'Name (A-Z)' },
  { value: 'z-a', label: 'Name (Z-A)' },
];

export default function FavoritesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LocationCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const { favorites, isAuthenticated, isLoading: isFavoritesLoading, isAuthLoading } = useFavorites();
  const { data: locations = [], isLoading: isLocationsLoading } = usePublicLocations();

  const isLoading = isFavoritesLoading || isLocationsLoading;

  const favoriteLocations = useMemo(() => {
    // Get favorites with their added dates
    let favs = locations
      .filter((location) => favorites.some((fav) => fav.location_id === location.id))
      .map((location) => {
        const fav = favorites.find((f) => f.location_id === location.id);
        return { ...location, favoritedAt: fav?.created_at || '' };
      });

    // Apply category filter
    if (categoryFilter !== 'all') {
      favs = favs.filter((location) => location.category === categoryFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      favs = favs.filter((location) =>
        location.name.toLowerCase().includes(query) ||
        location.address.toLowerCase().includes(query) ||
        location.city.toLowerCase().includes(query) ||
        location.zipCode.includes(query)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        return [...favs].sort((a, b) => 
          new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime()
        );
      case 'oldest':
        return [...favs].sort((a, b) => 
          new Date(a.favoritedAt).getTime() - new Date(b.favoritedAt).getTime()
        );
      case 'a-z':
        return [...favs].sort((a, b) => a.name.localeCompare(b.name));
      case 'z-a':
        return [...favs].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return favs;
    }
  }, [locations, favorites, searchQuery, categoryFilter, sortBy]);

  // Show loading while checking auth status
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Sign in to view favorites</h1>
            <p className="text-muted-foreground mb-6">
              Create an account or sign in to save and view your favorite locations.
            </p>
            <Link to="/login">
              <Button>
                Sign In
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">My Favorites</h1>
          </div>
          <p className="text-muted-foreground">
            Your saved locations for quick access.
          </p>
        </div>

        {/* Search & Filters */}
        {favorites.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as LocationCategory | 'all')}
              className="h-10 px-3 rounded-lg border border-input bg-background text-sm min-w-[160px]"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 px-3 rounded-lg border border-input bg-background text-sm min-w-[150px]"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : favoriteLocations.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Start exploring locations and tap the heart icon to save your favorites.
            </p>
            <Link to="/locator">
              <Button>
                Find Locations
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
