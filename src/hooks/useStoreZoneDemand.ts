import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DemandPoint {
  id: string;
  lat: number;
  lng: number;
  demand_weight: number;
  demand_type: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface DemandTimeRange {
  start: Date;
  end: Date;
}

export interface DemandFilters {
  timeRange?: DemandTimeRange;
  demandType?: string;
}

export function useStoreZoneDemand(filters?: DemandFilters) {
  return useQuery({
    queryKey: ['store-zone-demand', filters],
    queryFn: async (): Promise<DemandPoint[]> => {
      let query = supabase.from('territory_demand').select('*').order('timestamp', { ascending: false });
      if (filters?.timeRange) {
        query = query.gte('timestamp', filters.timeRange.start.toISOString()).lte('timestamp', filters.timeRange.end.toISOString());
      }
      if (filters?.demandType) {
        query = query.eq('demand_type', filters.demandType);
      }
      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return (data || []) as DemandPoint[];
    },
  });
}

export function useCreateDemandPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<DemandPoint, 'id' | 'timestamp'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: userRole } = await supabase.from('user_roles').select('organization_id').eq('user_id', user.id).single();
      if (!userRole) throw new Error('User has no organization');
      const { data, error } = await supabase.from('territory_demand').insert({
        organization_id: userRole.organization_id, lat: input.lat, lng: input.lng, demand_weight: input.demand_weight, demand_type: input.demand_type,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store-zone-demand'] }); },
    onError: (error) => { toast({ title: 'Error recording demand', description: error.message, variant: 'destructive' }); },
  });
}

export function useGenerateSampleDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (count: number = 50) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: userRole } = await supabase.from('user_roles').select('organization_id').eq('user_id', user.id).single();
      if (!userRole) throw new Error('User has no organization');
      const centerLat = 40.7128, centerLng = -74.0060, spread = 0.15;
      const demandTypes = ['service_request', 'inquiry', 'complaint', 'order'];
      let insertedCount = 0;
      for (let i = 0; i < count; i++) {
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30));
        timestamp.setHours(Math.floor(Math.random() * 24));
        const { error } = await supabase.from('territory_demand').insert({
          organization_id: userRole.organization_id,
          lat: centerLat + (Math.random() - 0.5) * spread * 2,
          lng: centerLng + (Math.random() - 0.5) * spread * 2,
          demand_weight: Math.floor(Math.random() * 5) + 1,
          demand_type: demandTypes[Math.floor(Math.random() * demandTypes.length)],
          timestamp: timestamp.toISOString(),
        });
        if (!error) insertedCount++;
      }
      return insertedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['store-zone-demand'] });
      toast({ title: 'Sample data generated', description: `Created ${count} demand points for visualization.` });
    },
    onError: (error) => { toast({ title: 'Error generating data', description: error.message, variant: 'destructive' }); },
  });
}

export function useDemandStats(filters?: DemandFilters) {
  const { data: demandPoints } = useStoreZoneDemand(filters);
  if (!demandPoints || demandPoints.length === 0) {
    return { totalPoints: 0, totalWeight: 0, avgWeight: 0, byType: {} as Record<string, number>, byDay: [] as { date: string; weight: number }[] };
  }
  const totalWeight = demandPoints.reduce((sum, p) => sum + p.demand_weight, 0);
  const byType: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  for (const point of demandPoints) {
    const type = point.demand_type || 'unknown';
    byType[type] = (byType[type] || 0) + point.demand_weight;
    const day = new Date(point.timestamp).toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + point.demand_weight;
  }
  return {
    totalPoints: demandPoints.length, totalWeight, avgWeight: totalWeight / demandPoints.length, byType,
    byDay: Object.entries(byDay).map(([date, weight]) => ({ date, weight })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
