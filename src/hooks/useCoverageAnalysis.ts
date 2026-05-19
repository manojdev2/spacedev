import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GapLocation {
  lat: number;
  lng: number;
  area_name: string;
}

interface CoverageGap {
  description: string;
  severity: 'low' | 'medium' | 'high';
  approximate_location?: GapLocation;
  uncovered_demand_percentage?: number;
}

interface SuggestedLocation {
  name: string;
  lat: number;
  lng: number;
  reason: string;
  estimated_coverage_improvement?: number;
  priority: 'low' | 'medium' | 'high';
}

interface StoreZoneOverlap {
  territories: string[];
  description: string;
  recommendation: string;
}

interface PriorityAction {
  action: string;
  impact: 'low' | 'medium' | 'high';
  effort?: 'low' | 'medium' | 'high';
}

export interface CoverageAnalysis {
  coverage_percentage: number;
  gaps: CoverageGap[];
  suggested_locations: SuggestedLocation[];
  overlaps: StoreZoneOverlap[];
  priority_actions: PriorityAction[];
  summary: string;
}

interface AnalysisMetadata {
  territories_count: number;
  locations_count: number;
  demand_points_count: number;
  analyzed_at: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis: CoverageAnalysis;
  metadata: AnalysisMetadata;
}

export function useCoverageAnalysis() {
  const [analysis, setAnalysis] = useState<CoverageAnalysis | null>(null);
  const [metadata, setMetadata] = useState<AnalysisMetadata | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-coverage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add funds to continue.');
        }
        throw new Error(error.error || 'Analysis failed');
      }

      const data: AnalysisResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      setMetadata(data.metadata);
      toast({
        title: 'Coverage Analysis Complete',
        description: `Analyzed ${data.metadata.territories_count} territories and ${data.metadata.locations_count} locations.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    analyze: mutation.mutate,
    isAnalyzing: mutation.isPending,
    analysis,
    metadata,
    reset: () => {
      setAnalysis(null);
      setMetadata(null);
    },
  };
}
