import { motion } from 'framer-motion';
import { Trash2, Target, Layers, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoreZone } from '@/hooks/useStoreZones';

interface StoreZoneListProps {
  storeZones: StoreZone[];
  selectedStoreZone: StoreZone | null;
  onSelect: (zone: StoreZone | null) => void;
  onDelete: (id: string) => void;
}

export function StoreZoneList({ storeZones, selectedStoreZone, onSelect, onDelete }: StoreZoneListProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'radius': return <Target className="h-3 w-3" />;
      case 'polygon': return <Layers className="h-3 w-3" />;
      case 'zipcode': return <MapPin className="h-3 w-3" />;
      default: return null;
    }
  };

  if (storeZones.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {storeZones.map((zone) => (
        <motion.div key={zone.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`cursor-pointer transition-all hover:shadow-md ${selectedStoreZone?.id === zone.id ? 'ring-2 ring-primary' : ''}`} onClick={() => onSelect(selectedStoreZone?.id === zone.id ? null : zone)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
                  <CardTitle className="text-base">{zone.name}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(zone.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                {getTypeIcon(zone.territory_type)}
                <span className="capitalize">{zone.territory_type}</span>
                {zone.territory_type === 'radius' && zone.radius_miles && <span> • {zone.radius_miles} mi radius</span>}
                {zone.territory_type === 'zipcode' && zone.zip_codes && <span> • {zone.zip_codes.length} zip codes</span>}
                {zone.territory_type === 'polygon' && zone.polygon_coordinates && <span> • {(zone.polygon_coordinates as any[]).length} points</span>}
              </div>
              {zone.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{zone.description}</p>}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
