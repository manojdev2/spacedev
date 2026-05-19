import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { HypotheticalLocation } from '@/components/store-zone/WhatIfSimulation';

export interface SimulationResult {
  original_coverage: number;
  new_coverage: number;
  improvement: number;
  demand_captured: number;
  recommendation: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  locations: HypotheticalLocation[];
  result: SimulationResult;
  createdAt: Date;
}

export function useWhatIfSimulation() {
  const [hypotheticalLocations, setHypotheticalLocations] = useState<HypotheticalLocation[]>([]);
  const [isPlacingLocation, setIsPlacingLocation] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(new Set());

  const addLocation = useCallback((location: Omit<HypotheticalLocation, 'id'>) => {
    const newLocation: HypotheticalLocation = {
      ...location,
      id: crypto.randomUUID(),
    };
    setHypotheticalLocations(prev => [...prev, newLocation]);
    setIsPlacingLocation(false);
    setSimulationResult(null);
    toast({
      title: 'Location Added',
      description: `${location.name} has been added to the simulation.`,
    });
  }, []);

  const removeLocation = useCallback((id: string) => {
    setHypotheticalLocations(prev => prev.filter(loc => loc.id !== id));
    setSimulationResult(null);
  }, []);

  const updateLocation = useCallback((id: string, updates: Partial<HypotheticalLocation>) => {
    setHypotheticalLocations(prev => 
      prev.map(loc => loc.id === id ? { ...loc, ...updates } : loc)
    );
    setSimulationResult(null);
  }, []);

  const startPlacing = useCallback(() => {
    setIsPlacingLocation(true);
  }, []);

  const cancelPlacing = useCallback(() => {
    setIsPlacingLocation(false);
  }, []);

  const clearAll = useCallback(() => {
    setHypotheticalLocations([]);
    setSimulationResult(null);
    setIsPlacingLocation(false);
  }, []);

  const saveScenario = useCallback((name: string) => {
    if (!simulationResult || hypotheticalLocations.length === 0) {
      toast({
        title: 'Cannot Save',
        description: 'Run a simulation first before saving the scenario.',
        variant: 'destructive',
      });
      return;
    }

    const newScenario: SavedScenario = {
      id: crypto.randomUUID(),
      name,
      locations: [...hypotheticalLocations],
      result: { ...simulationResult },
      createdAt: new Date(),
    };

    setSavedScenarios(prev => [...prev, newScenario]);
    toast({
      title: 'Scenario Saved',
      description: `"${name}" has been saved for comparison.`,
    });
  }, [simulationResult, hypotheticalLocations]);

  const deleteScenario = useCallback((id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleScenarioSelection = useCallback((id: string) => {
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const loadScenario = useCallback((scenario: SavedScenario) => {
    setHypotheticalLocations([...scenario.locations]);
    setSimulationResult({ ...scenario.result });
    setComparisonMode(false);
    toast({
      title: 'Scenario Loaded',
      description: `"${scenario.name}" has been loaded into the editor.`,
    });
  }, []);

  const toggleComparisonMode = useCallback(() => {
    setComparisonMode(prev => !prev);
  }, []);

  const simulationMutation = useMutation({
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
          body: JSON.stringify({
            hypothetical_locations: hypotheticalLocations.map(loc => ({
              name: loc.name,
              lat: loc.lat,
              lng: loc.lng,
              radius_miles: loc.radius_miles,
            })),
            simulation_mode: true,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Simulation failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.simulation_result) {
        setSimulationResult(data.simulation_result);
        toast({
          title: 'Simulation Complete',
          description: `Coverage would improve by ${data.simulation_result.improvement}%`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Simulation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  return {
    hypotheticalLocations,
    isPlacingLocation,
    simulationResult,
    isSimulating: simulationMutation.isPending,
    addLocation,
    removeLocation,
    updateLocation,
    startPlacing,
    cancelPlacing,
    clearAll,
    runSimulation: simulationMutation.mutate,
    savedScenarios,
    comparisonMode,
    selectedScenarioIds,
    saveScenario,
    deleteScenario,
    toggleScenarioSelection,
    loadScenario,
    toggleComparisonMode,
  };
}
