import { useState } from 'react';
import { MapPin, Plus, Trash2, Sparkles, TrendingUp, Target, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface HypotheticalLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_miles: number;
}

interface SimulationResult {
  original_coverage: number;
  new_coverage: number;
  improvement: number;
  demand_captured: number;
  recommendation: string;
}

interface WhatIfSimulationProps {
  hypotheticalLocations: HypotheticalLocation[];
  onAddLocation: (location: Omit<HypotheticalLocation, 'id'>) => void;
  onRemoveLocation: (id: string) => void;
  onUpdateLocation: (id: string, updates: Partial<HypotheticalLocation>) => void;
  isPlacingLocation: boolean;
  onStartPlacing: () => void;
  onCancelPlacing: () => void;
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  onRunSimulation: () => void;
  onConvertToStoreZone: (location: HypotheticalLocation) => void;
  isConverting: boolean;
  convertedIds: Set<string>;
}

export function WhatIfSimulation({
  hypotheticalLocations,
  onAddLocation,
  onRemoveLocation,
  onUpdateLocation,
  isPlacingLocation,
  onStartPlacing,
  onCancelPlacing,
  simulationResult,
  isSimulating,
  onRunSimulation,
  onConvertToStoreZone,
  isConverting,
  convertedIds,
}: WhatIfSimulationProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const getImprovementColor = (improvement: number) => {
    if (improvement >= 15) return 'text-green-600';
    if (improvement >= 5) return 'text-blue-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            What-If Simulation
          </CardTitle>
          <CardDescription>
            Place hypothetical locations on the map to see how they would impact your coverage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPlacingLocation ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  👆 Click on the map to place your hypothetical location
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onCancelPlacing}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={onStartPlacing} className="w-full bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Hypothetical Location
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Hypothetical Locations List */}
      <AnimatePresence>
        {hypotheticalLocations.map((location, index) => (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-dashed border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      {editingId === location.id ? (
                        <Input
                          value={location.name}
                          onChange={(e) => onUpdateLocation(location.id, { name: e.target.value })}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-medium cursor-pointer hover:text-primary"
                            onClick={() => setEditingId(location.id)}
                          >
                            {location.name}
                          </span>
                          {convertedIds.has(location.id) && (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Created
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {simulationResult && !convertedIds.has(location.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => onConvertToStoreZone(location)}
                            disabled={isConverting}
                          >
                            {isConverting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Create
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveLocation(location.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Coverage Radius</Label>
                        <span className="text-xs text-muted-foreground">
                          {location.radius_miles} miles
                        </span>
                      </div>
                      <Slider
                        value={[location.radius_miles]}
                        onValueChange={([val]) => onUpdateLocation(location.id, { radius_miles: val })}
                        min={1}
                        max={25}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Run Simulation Button */}
      {hypotheticalLocations.length > 0 && (
        <Button 
          onClick={onRunSimulation} 
          disabled={isSimulating}
          className="w-full"
          size="lg"
        >
          {isSimulating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing Coverage Impact...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Run Simulation
            </>
          )}
        </Button>
      )}

      {/* Simulation Results */}
      <AnimatePresence>
        {simulationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Simulation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Coverage Comparison */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-2xl font-bold">{simulationResult.original_coverage}%</p>
                  </div>
                  <div className="space-y-1 flex flex-col items-center justify-center">
                    <div className={cn(
                      "text-lg font-bold",
                      getImprovementColor(simulationResult.improvement)
                    )}>
                      +{simulationResult.improvement}%
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      improvement
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Projected</p>
                    <p className="text-2xl font-bold text-green-600">
                      {simulationResult.new_coverage}%
                    </p>
                  </div>
                </div>

                {/* Progress Visualization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Coverage Progress</span>
                    <span>{simulationResult.original_coverage}% → {simulationResult.new_coverage}%</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-muted-foreground/30 rounded-full"
                      style={{ width: `${simulationResult.original_coverage}%` }}
                    />
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-green-500 rounded-full"
                      initial={{ width: `${simulationResult.original_coverage}%` }}
                      animate={{ width: `${simulationResult.new_coverage}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Demand Captured */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Additional Demand Captured</span>
                    <Badge variant="outline">{simulationResult.demand_captured}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of previously uncovered demand would be served
                  </p>
                </div>

                {/* Recommendation */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm">
                    <span className="font-medium">💡 Recommendation: </span>
                    {simulationResult.recommendation}
                  </p>
                </div>

                {/* Convert All Button */}
                {hypotheticalLocations.length > 0 && (
                  <div className="pt-2 border-t">
                    <Button
                      onClick={() => {
                        hypotheticalLocations
                          .filter(loc => !convertedIds.has(loc.id))
                          .forEach(loc => onConvertToStoreZone(loc));
                      }}
                      disabled={isConverting || hypotheticalLocations.every(loc => convertedIds.has(loc.id))}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {isConverting ? (
                         <>
                           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           Creating Store Zones...
                         </>
                       ) : hypotheticalLocations.every(loc => convertedIds.has(loc.id)) ? (
                         <>
                           <CheckCircle2 className="h-4 w-4 mr-2" />
                           All Store Zones Created
                         </>
                       ) : (
                         <>
                           <CheckCircle2 className="h-4 w-4 mr-2" />
                           Create {hypotheticalLocations.filter(loc => !convertedIds.has(loc.id)).length} Store Zone{hypotheticalLocations.filter(loc => !convertedIds.has(loc.id)).length === 1 ? '' : 's'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {hypotheticalLocations.length === 0 && !isPlacingLocation && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-muted mb-3">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No hypothetical locations added yet.
              <br />
              Click the button above to start planning.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
