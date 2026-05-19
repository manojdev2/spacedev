import { Loader2, MapPin, Globe, Search, Navigation } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ScrapeProgress } from '@/lib/api/storeImport';

interface ScrapeProgressIndicatorProps {
  progress: ScrapeProgress | null;
}

const stageIcons = {
  mapping: Globe,
  scraping: Search,
  extracting: MapPin,
  geocoding: Navigation,
  complete: MapPin,
};

const stageLabels = {
  mapping: 'Discovering Pages',
  scraping: 'Scraping Content',
  extracting: 'Extracting Locations',
  geocoding: 'Geocoding Addresses',
  complete: 'Complete',
};

export function ScrapeProgressIndicator({ progress }: ScrapeProgressIndicatorProps) {
  if (!progress) return null;

  const StageIcon = stageIcons[progress.stage];
  const stageLabel = stageLabels[progress.stage];
  
  const progressPercent = progress.total && progress.current 
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const isComplete = progress.stage === 'complete';

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Stage Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <StageIcon className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{stageLabel}</p>
            <p className="text-xs text-muted-foreground">{progress.message}</p>
          </div>
        </div>
        {progress.locationsFound !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {progress.locationsFound} locations found
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      {progress.total && progress.current && !isComplete && (
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {progress.current} of {progress.total}
            </span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      )}

      {/* Current URL */}
      {progress.url && (
        <div className="text-xs text-muted-foreground truncate">
          <span className="text-muted-foreground/70">URL: </span>
          <span className="font-mono">{progress.url}</span>
        </div>
      )}

      {/* Stage Indicators */}
      <div className="flex items-center gap-1.5">
        {(['mapping', 'scraping', 'extracting', 'geocoding'] as const).map((stage, index) => {
          const stages = ['mapping', 'scraping', 'extracting', 'geocoding'];
          const currentIndex = stages.indexOf(progress.stage);
          const stageIndex = stages.indexOf(stage);
          const isActive = stage === progress.stage;
          const isDone = stageIndex < currentIndex || progress.stage === 'complete';
          
          return (
            <div key={stage} className="flex items-center">
              <div
                className={`h-2 w-2 rounded-full transition-colors ${
                  isDone
                    ? 'bg-primary'
                    : isActive
                    ? 'bg-primary animate-pulse'
                    : 'bg-muted-foreground/30'
                }`}
              />
              {index < 3 && (
                <div
                  className={`h-0.5 w-4 transition-colors ${
                    isDone ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
