import { Brain, MapPin, AlertTriangle, Zap, TrendingUp, Target, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCoverageAnalysis, CoverageAnalysis } from '@/hooks/useCoverageAnalysis';

interface CoverageAnalysisPanelProps {
  onLocationSuggestionClick?: (lat: number, lng: number, name: string) => void;
}

export function CoverageAnalysisPanel({ onLocationSuggestionClick }: CoverageAnalysisPanelProps) {
  const { analyze, isAnalyzing, analysis, metadata, reset } = useCoverageAnalysis();

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  const getPriorityIcon = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return <Zap className="h-4 w-4 text-amber-500" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'low': return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!analysis && !isAnalyzing) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">AI Coverage Analysis</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-md">
            Let AI analyze your store zones and locations to identify coverage gaps and suggest optimal new branch locations.
          </p>
          <Button onClick={() => analyze()} className="bg-gradient-primary">
            <Brain className="h-4 w-4 mr-2" />
            Run Coverage Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse text-primary" />
            Analyzing Coverage...
          </CardTitle>
          <CardDescription>
            AI is analyzing your store zones, locations, and demand patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Coverage Score */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Coverage Analysis
                </CardTitle>
                {metadata && (
                  <CardDescription>
                    Analyzed {metadata.territories_count} store zones • {metadata.locations_count} locations
                  </CardDescription>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                New Analysis
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Coverage</span>
                  <span className="text-2xl font-bold text-primary">
                    {analysis?.coverage_percentage || 0}%
                  </span>
                </div>
                <Progress value={analysis?.coverage_percentage || 0} className="h-3" />
              </div>
              
              {analysis?.summary && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {analysis.summary}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coverage Gaps */}
        {analysis?.gaps && analysis.gaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Coverage Gaps ({analysis.gaps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-3">
                  {analysis.gaps.map((gap, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <Badge variant={getSeverityColor(gap.severity)} className="shrink-0">
                        {gap.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{gap.description}</p>
                        {gap.approximate_location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {gap.approximate_location.area_name || 
                              `${gap.approximate_location.lat.toFixed(4)}, ${gap.approximate_location.lng.toFixed(4)}`}
                          </p>
                        )}
                        {gap.uncovered_demand_percentage && (
                          <p className="text-xs text-amber-600 mt-1">
                            {gap.uncovered_demand_percentage}% uncovered demand
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Suggested Locations */}
        {analysis?.suggested_locations && analysis.suggested_locations.length > 0 && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Suggested New Locations ({analysis.suggested_locations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.suggested_locations.map((location, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => onLocationSuggestionClick?.(location.lat, location.lng, location.name)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getPriorityIcon(location.priority)}
                          <span className="font-medium">{location.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{location.reason}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                          {location.estimated_coverage_improvement && (
                            <span className="text-green-600 font-medium">
                              +{location.estimated_coverage_improvement}% coverage
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {location.priority}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Store Zone Overlaps */}
        {analysis?.overlaps && analysis.overlaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-amber-500" />
                Store Zone Overlaps ({analysis.overlaps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.overlaps.map((overlap, index) => (
                  <div key={index} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {overlap.territories.map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm">{overlap.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 {overlap.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Priority Actions */}
        {analysis?.priority_actions && analysis.priority_actions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Priority Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.priority_actions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{action.action}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(action.impact)}>
                        {action.impact} impact
                      </Badge>
                      {action.effort && (
                        <Badge variant="outline">
                          {action.effort} effort
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
