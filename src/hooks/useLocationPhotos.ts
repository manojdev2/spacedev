import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationPhoto {
  id: string;
  location_id: string;
  url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export function useLocationPhotos(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-photos', locationId],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('location_photos')
        .select('*')
        .eq('location_id', locationId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as LocationPhoto[];
    },
    enabled: !!locationId,
  });
}
