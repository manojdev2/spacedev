import { useState } from 'react';
import { format } from 'date-fns';
import { 
  BarChart3, 
  Trash2, 
  Download, 
  Eye, 
  MapPin, 
  TrendingUp,
  CheckCircle2,
  X,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SavedScenario, SimulationResult } from '@/hooks/useWhatIfSimulation';
import { HypotheticalLocation } from './WhatIfSimulation';

interface ScenarioComparisonPanelProps {
  savedScenarios: SavedScenario[];
  selectedScenarioIds: Set<string>;
  currentResult: SimulationResult | null;
  currentLocations: HypotheticalLocation[];
  onDeleteScenario: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onLoadScenario: (scenario: SavedScenario) => void;
  onSaveScenario: (name: string) => void;
}

export function ScenarioComparisonPanel({
  savedScenarios,
  selectedScenarioIds,
  currentResult,
  currentLocations,
  onDeleteScenario,
  onToggleSelection,
  onLoadScenario,
  onSaveScenario,
}: ScenarioComparisonPanelProps) {
  const [scenarioName, setScenarioName] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  const selectedScenarios = savedScenarios.filter(s => selectedScenarioIds.has(s.id));
  
  const handleSave = () => {
    if (scenarioName.trim()) {
      onSaveScenario(scenarioName.trim());
      setScenarioName('');
      setIsSaveDialogOpen(false);
    }
  };

  const getBestScenario = () => {
    if (selectedScenarios.length === 0) return null;
    return selectedScenarios.reduce((best, current) => 
      current.result.improvement > best.result.improvement ? current : best
    );
  };

  const bestScenario = getBestScenario();

  return (
    <div className="space-y-4">
      {/* Header with Save Button */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Scenario Comparison
              </CardTitle>
              <CardDescription>
                Save and compare different location strategies
              </CardDescription>
            </div>
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  disabled={!currentResult || currentLocations.length === 0}
                  className="bg-gradient-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Current
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Scenario</DialogTitle>
                  <DialogDescription>
                    Give this scenario a name to save it for comparison.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="e.g., Expansion Plan A"
                    className="mt-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSave} disabled={!scenarioName.trim()}>
                    Save Scenario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Saved Scenarios List */}
      {savedScenarios.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-muted mb-3">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No scenarios saved yet.
              <br />
              Run a simulation and save it to start comparing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {savedScenarios.length} scenario{savedScenarios.length !== 1 ? 's' : ''} saved
            </p>
            {selectedScenarios.length > 0 && (
              <Badge variant="secondary">
                {selectedScenarios.length} selected for comparison
              </Badge>
            )}
          </div>

          <AnimatePresence>
            {savedScenarios.map((scenario, index) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  "transition-all",
                  selectedScenarioIds.has(scenario.id) && "border-primary/50 bg-primary/5"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedScenarioIds.has(scenario.id)}
                        onCheckedChange={() => onToggleSelection(scenario.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{scenario.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(scenario.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onLoadScenario(scenario)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteScenario(scenario.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {scenario.locations.length} location{scenario.locations.length !== 1 ? 's' : ''}
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 font-medium",
                            scenario.result.improvement >= 15 ? "text-green-600" :
                            scenario.result.improvement >= 5 ? "text-blue-600" : "text-muted-foreground"
                          )}>
                            <TrendingUp className="h-3 w-3" />
                            +{scenario.result.improvement}%
                          </div>
                          <div className="text-muted-foreground">
                            → {scenario.result.new_coverage}% coverage
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Comparison View */}
      {selectedScenarios.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Side-by-Side Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comparison Grid */}
              <div className="grid gap-4" style={{ 
                gridTemplateColumns: `repeat(${Math.min(selectedScenarios.length, 3)}, 1fr)` 
              }}>
                {selectedScenarios.slice(0, 3).map((scenario) => (
                  <div 
                    key={scenario.id} 
                    className={cn(
                      "p-3 rounded-lg border bg-background",
                      bestScenario?.id === scenario.id && "border-green-500/50 bg-green-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm truncate">{scenario.name}</span>
                      {bestScenario?.id === scenario.id && (
                        <Badge className="bg-green-500/10 text-green-600 text-xs">
                          Best
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Coverage</span>
                          <span className="font-medium">{scenario.result.new_coverage}%</span>
                        </div>
                        <Progress value={scenario.result.new_coverage} className="h-2" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-lg font-bold text-green-600">
                            +{scenario.result.improvement}%
                          </p>
                          <p className="text-xs text-muted-foreground">Improvement</p>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-lg font-bold">
                            {scenario.result.demand_captured}%
                          </p>
                          <p className="text-xs text-muted-foreground">Demand</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {scenario.locations.length} location{scenario.locations.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Best Scenario Summary */}
              {bestScenario && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Recommended: {bestScenario.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bestScenario.result.recommendation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
