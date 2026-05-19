import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types';
import { useState, useEffect } from 'react';

interface RecentlyViewedLocation {
  location: Location;
  viewedAt: string;
  source: string;
}

export function useRecentlyViewed(limit: number = 10) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ['recently-viewed', userId, limit],
    queryFn: async (): Promise<RecentlyViewedLocation[]> => {
      if (!userId) return [];

      // Get unique recent views (most recent per location)
      const { data: views, error: viewsError } = await supabase
        .from('user_location_views')
        .select('location_id, viewed_at, source')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(50); // Get more to filter duplicates

      if (viewsError) {
        console.error('Error fetching views:', viewsError);
        return [];
      }

      if (!views || views.length === 0) return [];

      // Deduplicate by location_id, keeping most recent
      const uniqueViews = new Map<string, { viewed_at: string; source: string | null }>();
      for (const view of views) {
        if (!uniqueViews.has(view.location_id)) {
          uniqueViews.set(view.location_id, {
            viewed_at: view.viewed_at,
            source: view.source,
          });
        }
      }

      const locationIds = Array.from(uniqueViews.keys()).slice(0, limit);

      // Fetch location details
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .in('id', locationIds)
        .eq('is_active', true);

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
        return [];
      }

      if (!locations) return [];

      // Map to result format, preserving view order
      return locationIds
        .map(id => {
          const location = locations.find(l => l.id === id);
          const viewInfo = uniqueViews.get(id);
          if (!location || !viewInfo) return null;

          return {
            location: {
              id: location.id,
              name: location.name,
              address: location.address,
              city: location.city,
              state: location.state,
              zipCode: location.zip_code,
              country: location.country,
              lat: location.lat,
              lng: location.lng,
              phone: location.phone,
              email: location.email,
              website: location.website,
              category: location.category,
              openingHours: location.opening_hours as unknown as Location['openingHours'],
              services: location.services || [],
              isActive: location.is_active,
            } as Location,
            viewedAt: viewInfo.viewed_at,
            source: viewInfo.source || 'direct',
          };
        })
        .filter(Boolean) as RecentlyViewedLocation[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    recentlyViewed: query.data || [],
    isLoading: query.isLoading,
    isAuthenticated: !!userId,
    refetch: query.refetch,
  };
}
