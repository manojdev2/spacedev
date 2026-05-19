import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationPhotoPreview {
  id: string;
  location_id: string;
  url: string;
  caption: string | null;
}

export function useLocationsPhotos(locationIds: string[]) {
  return useQuery({
    queryKey: ['locations-photos-preview', locationIds.sort().join(',')],
    queryFn: async () => {
      if (locationIds.length === 0) return {};

      // Fetch first photo for each location (ordered by display_order)
      const { data, error } = await supabase
        .from('location_photos')
        .select('id, location_id, url, caption, display_order')
        .in('location_id', locationIds)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Group by location_id, keep only first photo per location
      const photoMap: Record<string, LocationPhotoPreview> = {};
      for (const photo of data || []) {
        if (!photoMap[photo.location_id]) {
          photoMap[photo.location_id] = {
            id: photo.id,
            location_id: photo.location_id,
            url: photo.url,
            caption: photo.caption,
          };
        }
      }

      return photoMap;
    },
    enabled: locationIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

