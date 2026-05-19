import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Location, OpeningHours, LocationCategory } from '@/types';
import { Json } from '@/integrations/supabase/types';

// Transform database row to app type
function transformLocation(row: {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  lat: number;
  lng: number;
  category: string;
  phone: string;
  email: string;
  website: string | null;
  opening_hours: Json;
  services: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Location {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    country: row.country,
    lat: row.lat,
    lng: row.lng,
    category: row.category as LocationCategory,
    phone: row.phone,
    email: row.email,
    website: row.website || undefined,
    openingHours: row.opening_hours as unknown as OpeningHours,
    services: row.services || [],
    isActive: row.is_active,
    clientId: row.organization_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Fetch a single location by ID (public)
export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: ['locations', 'single', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return transformLocation(data);
    },
    enabled: !!id,
  });
}

// Fetch all active locations (public - for store locator)
export function usePublicLocations() {
  return useQuery({
    queryKey: ['locations', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data.map(transformLocation);
    },
  });
}

// Fetch locations for authenticated org admin
export function useOrgLocations() {
  return useQuery({
    queryKey: ['locations', 'org'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data.map(transformLocation);
    },
  });
}

// Create location mutation
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          organization_id: location.clientId,
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zip_code: location.zipCode,
          country: location.country,
          lat: location.lat,
          lng: location.lng,
          category: location.category,
          phone: location.phone,
          email: location.email,
          website: location.website || null,
          opening_hours: location.openingHours as unknown as Json,
          services: location.services,
          is_active: location.isActive,
        })
        .select()
        .single();

      if (error) throw error;
      return transformLocation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

// Update location mutation
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Location> }) => {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.state !== undefined) dbUpdates.state = updates.state;
      if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
      if (updates.country !== undefined) dbUpdates.country = updates.country;
      if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
      if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.website !== undefined) dbUpdates.website = updates.website || null;
      if (updates.openingHours !== undefined) dbUpdates.opening_hours = updates.openingHours as unknown as Json;
      if (updates.services !== undefined) dbUpdates.services = updates.services;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('locations')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformLocation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

// Delete location mutation
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}
