import { useState, useCallback } from 'react';
import { Plus, Layers, Brain, Flame, FlaskConical, BarChart3 } from 'lucide-react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useStoreZones, useCreateStoreZone, useDeleteStoreZone, StoreZone, CreateStoreZoneInput } from '@/hooks/useStoreZones';
import { useStoreZoneDemand, DemandTimeRange } from '@/hooks/useStoreZoneDemand';
import { useWhatIfSimulation } from '@/hooks/useWhatIfSimulation';
import { CoverageAnalysisPanel } from './CoverageAnalysisPanel';
import { DemandHeatmapControls } from './DemandHeatmapControls';
import { WhatIfSimulation, HypotheticalLocation } from './WhatIfSimulation';
import { ScenarioComparisonPanel } from './ScenarioComparisonPanel';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreZoneForm, StoreZoneFormData, STORE_ZONE_COLORS } from './StoreZoneForm';
import { StoreZoneList } from './StoreZoneList';
import { StoreZoneMapView } from './StoreZoneMapView';
import { toast } from '@/hooks/use-toast';

export function StoreZoneManager() {
  const { apiKey, isLoading: isLoadingApiKey } = useGoogleMapsApiKey();
  const { data: storeZones = [], isLoading: isLoadingStoreZones } = useStoreZones();
  const createStoreZone = useCreateStoreZone();
  const deleteStoreZone = useDeleteStoreZone();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedStoreZone, setSelectedStoreZone] = useState<StoreZone | null>(null);
  const [formData, setFormData] = useState<StoreZoneFormData>(getInitialFormData(0));
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [heatmapRadius, setHeatmapRadius] = useState(30);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const [demandTimeRange, setDemandTimeRange] = useState<DemandTimeRange>({ start: startOfDay(subDays(new Date(), 30)), end: endOfDay(new Date()) });
  const [demandType, setDemandType] = useState<string | null>(null);

  const { data: demandPoints = [] } = useStoreZoneDemand({ timeRange: demandTimeRange, demandType: demandType || undefined });

  const whatIf = useWhatIfSimulation();
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [isConverting, setIsConverting] = useState(false);

  function getInitialFormData(count: number): StoreZoneFormData {
    return { name: '', description: '', color: STORE_ZONE_COLORS[count % STORE_ZONE_COLORS.length], territory_type: 'radius', polygon_coordinates: [], center_lat: null, center_lng: null, radius_miles: 5, zip_codes: '' };
  }

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => { setMap(mapInstance); }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (whatIf.isPlacingLocation) { whatIf.addLocation({ name: `New Location ${whatIf.hypotheticalLocations.length + 1}`, lat, lng, radius_miles: 5 }); return; }
    if (isSheetOpen && formData.territory_type === 'radius' && !formData.center_lat) { setFormData(prev => ({ ...prev, center_lat: lat, center_lng: lng })); }
  }, [isSheetOpen, formData.territory_type, formData.center_lat, whatIf]);

  const handlePolygonComplete = useCallback((coordinates: { lat: number; lng: number }[]) => { setFormData(prev => ({ ...prev, polygon_coordinates: coordinates })); setIsDrawing(false); }, []);

  const handleSubmit = async () => {
    const input: CreateStoreZoneInput = { name: formData.name, description: formData.description || undefined, color: formData.color, territory_type: formData.territory_type };
    if (formData.territory_type === 'polygon') input.polygon_coordinates = formData.polygon_coordinates;
    else if (formData.territory_type === 'radius') { input.center_lat = formData.center_lat || undefined; input.center_lng = formData.center_lng || undefined; input.radius_miles = formData.radius_miles; }
    else if (formData.territory_type === 'zipcode') input.zip_codes = formData.zip_codes.split(',').map(z => z.trim()).filter(Boolean);
    await createStoreZone.mutateAsync(input);
    setIsSheetOpen(false);
    resetForm();
  };

  const resetForm = () => { setFormData(getInitialFormData(storeZones.length)); setIsDrawing(false); };
  const openForm = () => { resetForm(); setIsSheetOpen(true); };

  const handleSuggestionClick = useCallback((lat: number, lng: number, _name: string) => { if (map) { map.panTo({ lat, lng }); map.setZoom(13); } }, [map]);

  const handleConvertToStoreZone = useCallback(async (location: HypotheticalLocation) => {
    setIsConverting(true);
    try {
      await createStoreZone.mutateAsync({ name: location.name, description: 'Created from What-If simulation', color: STORE_ZONE_COLORS[storeZones.length % STORE_ZONE_COLORS.length], territory_type: 'radius', center_lat: location.lat, center_lng: location.lng, radius_miles: location.radius_miles });
      setConvertedIds(prev => new Set([...prev, location.id]));
      toast({ title: 'Store Zone Created', description: `"${location.name}" has been converted to a real store zone.` });
    } catch (error) {
      toast({ title: 'Conversion Failed', description: error instanceof Error ? error.message : 'Failed to create store zone', variant: 'destructive' });
    } finally { setIsConverting(false); }
  }, [storeZones.length, createStoreZone]);

  if (isLoadingApiKey || !apiKey) return (<div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-[600px] w-full" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Store Zone Manager</h2>
          <p className="text-muted-foreground">Define and manage your store coverage zones</p>
        </div>
        <Button onClick={openForm}><Plus className="h-4 w-4 mr-2" />Add Store Zone</Button>
      </div>

      <Tabs defaultValue="store-zones" className="space-y-6">
        <TabsList>
          <TabsTrigger value="store-zones" className="gap-2"><Layers className="h-4 w-4" />Store Zones</TabsTrigger>
          <TabsTrigger value="heatmap" className="gap-2"><Flame className="h-4 w-4" />Demand Heatmap</TabsTrigger>
          <TabsTrigger value="whatif" className="gap-2"><FlaskConical className="h-4 w-4" />What-If</TabsTrigger>
          <TabsTrigger value="compare" className="gap-2"><BarChart3 className="h-4 w-4" />Compare</TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2"><Brain className="h-4 w-4" />AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="store-zones" className="space-y-6 mt-0">
          <StoreZoneList storeZones={storeZones} selectedStoreZone={selectedStoreZone} onSelect={setSelectedStoreZone} onDelete={(id) => deleteStoreZone.mutate(id)} />
          <div className="relative">
            <Card><CardContent className="p-0 overflow-hidden rounded-lg h-[600px]">
              <StoreZoneMapView storeZones={storeZones} selectedStoreZone={selectedStoreZone} onSelectStoreZone={setSelectedStoreZone} formData={isSheetOpen ? formData : null} isDrawing={isDrawing} isFormOpen={isSheetOpen} onMapClick={handleMapClick} onPolygonComplete={handlePolygonComplete} onMapLoad={onMapLoad} />
            </CardContent></Card>
            {isSheetOpen && formData.territory_type === 'radius' && !formData.center_lat && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur px-4 py-2 rounded-lg shadow-lg border z-10"><p className="text-sm font-medium">👆 Click anywhere on the map to set the center point</p></div>
            )}
          </div>
          {!isLoadingStoreZones && storeZones.length === 0 && (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">No store zones yet</h3>
              <p className="text-muted-foreground text-center mb-4">Create your first store coverage zone to get started</p>
              <Button onClick={openForm}><Plus className="h-4 w-4 mr-2" />Create Store Zone</Button>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1"><DemandHeatmapControls visible={heatmapVisible} onVisibilityChange={setHeatmapVisible} radius={heatmapRadius} onRadiusChange={setHeatmapRadius} opacity={heatmapOpacity} onOpacityChange={setHeatmapOpacity} timeRange={demandTimeRange} onTimeRangeChange={setDemandTimeRange} demandType={demandType} onDemandTypeChange={setDemandType} pointCount={demandPoints.length} /></div>
            <div className="lg:col-span-2"><Card><CardContent className="p-0 overflow-hidden rounded-lg h-[600px]">
              <StoreZoneMapView storeZones={storeZones} selectedStoreZone={selectedStoreZone} onSelectStoreZone={setSelectedStoreZone} formData={null} isDrawing={false} isFormOpen={false} onMapClick={() => {}} onPolygonComplete={() => {}} onMapLoad={onMapLoad} demandPoints={demandPoints} showHeatmap={heatmapVisible} heatmapRadius={heatmapRadius} heatmapOpacity={heatmapOpacity} />
            </CardContent></Card></div>
          </div>
        </TabsContent>

        <TabsContent value="whatif" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <WhatIfSimulation hypotheticalLocations={whatIf.hypotheticalLocations} onAddLocation={whatIf.addLocation} onRemoveLocation={whatIf.removeLocation} onUpdateLocation={whatIf.updateLocation} isPlacingLocation={whatIf.isPlacingLocation} onStartPlacing={whatIf.startPlacing} onCancelPlacing={whatIf.cancelPlacing} simulationResult={whatIf.simulationResult} isSimulating={whatIf.isSimulating} onRunSimulation={whatIf.runSimulation} onConvertToStoreZone={handleConvertToStoreZone} isConverting={isConverting} convertedIds={convertedIds} />
            </div>
            <div className="lg:col-span-2 relative">
              <Card><CardContent className="p-0 overflow-hidden rounded-lg h-[600px]">
                <StoreZoneMapView storeZones={storeZones} selectedStoreZone={selectedStoreZone} onSelectStoreZone={setSelectedStoreZone} formData={null} isDrawing={false} isFormOpen={false} onMapClick={handleMapClick} onPolygonComplete={() => {}} onMapLoad={onMapLoad} demandPoints={demandPoints} showHeatmap={true} heatmapRadius={heatmapRadius} heatmapOpacity={0.5} hypotheticalLocations={whatIf.hypotheticalLocations} />
              </CardContent></Card>
              {whatIf.isPlacingLocation && (<div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur px-4 py-2 rounded-lg shadow-lg border z-10"><p className="text-sm font-medium">👆 Click anywhere on the map to place your hypothetical location</p></div>)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1"><ScenarioComparisonPanel savedScenarios={whatIf.savedScenarios} selectedScenarioIds={whatIf.selectedScenarioIds} currentResult={whatIf.simulationResult} currentLocations={whatIf.hypotheticalLocations} onDeleteScenario={whatIf.deleteScenario} onToggleSelection={whatIf.toggleScenarioSelection} onLoadScenario={whatIf.loadScenario} onSaveScenario={whatIf.saveScenario} /></div>
            <div className="lg:col-span-2"><Card><CardContent className="p-0 overflow-hidden rounded-lg h-[600px]">
              <StoreZoneMapView storeZones={storeZones} selectedStoreZone={selectedStoreZone} onSelectStoreZone={setSelectedStoreZone} formData={null} isDrawing={false} isFormOpen={false} onMapClick={() => {}} onPolygonComplete={() => {}} onMapLoad={onMapLoad} demandPoints={demandPoints} showHeatmap={true} heatmapRadius={heatmapRadius} heatmapOpacity={0.5} hypotheticalLocations={whatIf.savedScenarios.filter(s => whatIf.selectedScenarioIds.has(s.id)).flatMap(s => s.locations)} />
            </CardContent></Card></div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4"><CoverageAnalysisPanel onLocationSuggestionClick={handleSuggestionClick} /></div>
            <Card><CardContent className="p-0 overflow-hidden rounded-lg h-[600px]">
              <StoreZoneMapView storeZones={storeZones} selectedStoreZone={selectedStoreZone} onSelectStoreZone={setSelectedStoreZone} formData={null} isDrawing={false} isFormOpen={false} onMapClick={() => {}} onPolygonComplete={() => {}} onMapLoad={onMapLoad} demandPoints={demandPoints} showHeatmap={heatmapVisible} heatmapRadius={heatmapRadius} heatmapOpacity={heatmapOpacity} />
            </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Store Zone</SheetTitle>
            <SheetDescription>Define a new service coverage zone. {formData.territory_type === 'radius' && 'Click on the map to set the center point.'}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <StoreZoneForm formData={formData} onChange={setFormData} onSubmit={handleSubmit} onCancel={() => { setIsSheetOpen(false); resetForm(); }} onStartDrawing={() => setIsDrawing(true)} isSubmitting={createStoreZone.isPending} storeZonesCount={storeZones.length} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
