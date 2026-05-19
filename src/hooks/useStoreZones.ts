import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StoreZone {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  territory_type: 'polygon' | 'radius' | 'zipcode';
  polygon_coordinates: { lat: number; lng: number }[] | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_miles: number | null;
  zip_codes: string[] | null;
  assigned_team_id: string | null;
  assigned_user_id: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStoreZoneInput {
  name: string;
  description?: string;
  color?: string;
  territory_type: 'polygon' | 'radius' | 'zipcode';
  polygon_coordinates?: { lat: number; lng: number }[];
  center_lat?: number;
  center_lng?: number;
  radius_miles?: number;
  zip_codes?: string[];
  assigned_team_id?: string;
  assigned_user_id?: string;
}

export function useStoreZones() {
  return useQuery({
    queryKey: ['store-zones'],
    queryFn: async (): Promise<StoreZone[]> => {
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return (data || []) as StoreZone[];
    },
  });
}

export function useCreateStoreZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoreZoneInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userRole) throw new Error('User has no organization');

      const { data, error } = await supabase
        .from('territories')
        .insert({
          organization_id: userRole.organization_id,
          name: input.name,
          description: input.description || null,
          color: input.color || '#4338ca',
          territory_type: input.territory_type,
          polygon_coordinates: input.polygon_coordinates || null,
          center_lat: input.center_lat || null,
          center_lng: input.center_lng || null,
          radius_miles: input.radius_miles || null,
          zip_codes: input.zip_codes || null,
          assigned_team_id: input.assigned_team_id || null,
          assigned_user_id: input.assigned_user_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-zones'] });
      toast({ title: 'Store zone created', description: 'Your new store zone has been saved.' });
    },
    onError: (error) => {
      toast({ title: 'Error creating store zone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateStoreZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StoreZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('territories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-zones'] });
      toast({ title: 'Store zone updated', description: 'Your changes have been saved.' });
    },
    onError: (error) => {
      toast({ title: 'Error updating store zone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteStoreZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('territories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-zones'] });
      toast({ title: 'Store zone deleted', description: 'The store zone has been removed.' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting store zone', description: error.message, variant: 'destructive' });
    },
  });
}

export function checkStoreZoneOverlap(zone1: StoreZone, zone2: StoreZone): boolean {
  if (zone1.territory_type === 'radius' && zone2.territory_type === 'radius') {
    if (!zone1.center_lat || !zone1.center_lng || !zone2.center_lat || !zone2.center_lng) return false;
    const distance = calculateDistance(zone1.center_lat, zone1.center_lng, zone2.center_lat, zone2.center_lng);
    return distance < (zone1.radius_miles || 0) + (zone2.radius_miles || 0);
  }
  if (zone1.territory_type === 'zipcode' && zone2.territory_type === 'zipcode') {
    const zips1 = new Set(zone1.zip_codes || []);
    return (zone2.zip_codes || []).some(zip => zips1.has(zip));
  }
  return false;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
