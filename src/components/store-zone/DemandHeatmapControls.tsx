import { useState } from 'react';
import { Flame, Calendar, Filter, Sparkles, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DemandTimeRange, useGenerateSampleDemand, useDemandStats } from '@/hooks/useStoreZoneDemand';
import { cn } from '@/lib/utils';

interface DemandHeatmapControlsProps {
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  timeRange: DemandTimeRange;
  onTimeRangeChange: (range: DemandTimeRange) => void;
  demandType: string | null;
  onDemandTypeChange: (type: string | null) => void;
  pointCount: number;
}

const TIME_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const DEMAND_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'service_request', label: 'Service Requests' },
  { value: 'inquiry', label: 'Inquiries' },
  { value: 'complaint', label: 'Complaints' },
  { value: 'order', label: 'Orders' },
];

export function DemandHeatmapControls({
  visible,
  onVisibilityChange,
  radius,
  onRadiusChange,
  opacity,
  onOpacityChange,
  timeRange,
  onTimeRangeChange,
  demandType,
  onDemandTypeChange,
  pointCount,
}: DemandHeatmapControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState<number>(30);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const generateSampleDemand = useGenerateSampleDemand();
  
  const stats = useDemandStats({
    timeRange,
    demandType: demandType && demandType !== 'all' ? demandType : undefined,
  });

  const handlePresetChange = (days: number) => {
    setSelectedPreset(days);
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), days));
    onTimeRangeChange({ start, end });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const start = startOfDay(date);
      const end = endOfDay(new Date());
      onTimeRangeChange({ start, end });
      setCustomDateOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-orange-500" />
            Demand Heatmap
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onVisibilityChange(!visible)}
              className={cn(visible && "text-primary")}
            >
              {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {pointCount} points
          </Badge>
          <Badge variant="outline">
            Weight: {stats.totalWeight.toLocaleString()}
          </Badge>
        </div>

        {/* Time Range Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            Time Range
          </Label>
          <div className="flex flex-wrap gap-1">
            {TIME_PRESETS.map((preset) => (
              <Button
                key={preset.days}
                variant={selectedPreset === preset.days ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => handlePresetChange(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
            <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={timeRange.start}
                  onSelect={handleDateSelect}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(timeRange.start, 'MMM d, yyyy')} - {format(timeRange.end, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Demand Type Filter */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs">
            <Filter className="h-3 w-3" />
            Demand Type
          </Label>
          <Select
            value={demandType || 'all'}
            onValueChange={(val) => onDemandTypeChange(val === 'all' ? null : val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {DEMAND_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Visibility Controls */}
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Radius</Label>
              <span className="text-xs text-muted-foreground">{radius}px</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={([val]) => onRadiusChange(val)}
              min={10}
              max={80}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Opacity</Label>
              <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
            </div>
            <Slider
              value={[opacity * 100]}
              onValueChange={([val]) => onOpacityChange(val / 100)}
              min={20}
              max={100}
              step={10}
              className="w-full"
            />
          </div>
        </div>

        {/* Generate Sample Data Button */}
        {pointCount === 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => generateSampleDemand.mutate(100)}
            disabled={generateSampleDemand.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateSampleDemand.isPending ? 'Generating...' : 'Generate Sample Data'}
          </Button>
        )}

        {/* Demand Type Breakdown */}
        {Object.keys(stats.byType).length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">By Type</Label>
            <div className="space-y-1">
              {Object.entries(stats.byType).map(([type, weight]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                  <Badge variant="outline" className="text-xs">
                    {weight}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
