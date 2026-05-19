import { Target, Layers, MapPin, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CreateStoreZoneInput } from '@/hooks/useStoreZones';

export const STORE_ZONE_COLORS = [
  '#4338ca', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#ec4899', '#84cc16',
];

export interface StoreZoneFormData {
  name: string;
  description: string;
  color: string;
  territory_type: 'polygon' | 'radius' | 'zipcode';
  polygon_coordinates: { lat: number; lng: number }[];
  center_lat: number | null;
  center_lng: number | null;
  radius_miles: number;
  zip_codes: string;
}

interface StoreZoneFormProps {
  formData: StoreZoneFormData;
  onChange: (data: StoreZoneFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onStartDrawing: () => void;
  isSubmitting: boolean;
  storeZonesCount: number;
}

export function StoreZoneForm({
  formData, onChange, onSubmit, onCancel, onStartDrawing, isSubmitting, storeZonesCount,
}: StoreZoneFormProps) {
  const updateField = <K extends keyof StoreZoneFormData>(field: K, value: StoreZoneFormData[K]) => {
    onChange({ ...formData, [field]: value });
  };

  const isValid = formData.name.trim().length > 0 && (
    formData.territory_type === 'zipcode' ? formData.zip_codes.trim().length > 0 :
    formData.territory_type === 'radius' ? formData.center_lat !== null :
    formData.polygon_coordinates.length >= 3
  );

  return (
    <div className="space-y-4 p-1">
      <div>
        <Label htmlFor="name">Store Zone Name *</Label>
        <Input id="name" value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g., Downtown Zone" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Optional description..." rows={2} />
      </div>
      <div>
        <Label>Zone Type</Label>
        <Select value={formData.territory_type} onValueChange={(value: 'polygon' | 'radius' | 'zipcode') => updateField('territory_type', value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="radius"><div className="flex items-center gap-2"><Target className="h-4 w-4" />Radius (Circle)</div></SelectItem>
            <SelectItem value="polygon"><div className="flex items-center gap-2"><Layers className="h-4 w-4" />Polygon (Draw)</div></SelectItem>
            <SelectItem value="zipcode"><div className="flex items-center gap-2"><MapPin className="h-4 w-4" />Zip Codes</div></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.territory_type === 'radius' && (
        <div className="space-y-3">
          <div><Label htmlFor="radius">Radius (miles)</Label><Input id="radius" type="number" min="1" max="100" value={formData.radius_miles} onChange={(e) => updateField('radius_miles', Number(e.target.value))} /></div>
          <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
            {formData.center_lat ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary flex items-center gap-2"><Target className="h-4 w-4" />Center point set</p>
                <div className="text-xs text-muted-foreground font-mono">{formData.center_lat.toFixed(6)}, {formData.center_lng?.toFixed(6)}</div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { updateField('center_lat', null); updateField('center_lng', null); }} className="text-xs h-7"><X className="h-3 w-3 mr-1" />Clear & click map again</Button>
              </div>
            ) : (<p className="text-sm text-muted-foreground">👆 <strong>Click on the map</strong> to set the center point</p>)}
          </div>
        </div>
      )}

      {formData.territory_type === 'polygon' && (
        <div className="space-y-3">
          {formData.polygon_coordinates.length > 0 ? (
            <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
              <p className="text-sm font-medium text-primary flex items-center gap-2"><Layers className="h-4 w-4" />{formData.polygon_coordinates.length} points drawn</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => updateField('polygon_coordinates', [])} className="text-xs h-7 mt-2"><X className="h-3 w-3 mr-1" />Clear & redraw</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={onStartDrawing} className="w-full"><Layers className="h-4 w-4 mr-2" />Start Drawing on Map</Button>
          )}
        </div>
      )}

      {formData.territory_type === 'zipcode' && (
        <div><Label htmlFor="zipcodes">Zip Codes (comma-separated) *</Label><Input id="zipcodes" value={formData.zip_codes} onChange={(e) => updateField('zip_codes', e.target.value)} placeholder="10001, 10002, 10003" /></div>
      )}

      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-2">
          {STORE_ZONE_COLORS.map((color) => (
            <button key={color} type="button" className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === color ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => updateField('color', color)} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={onSubmit} disabled={!isValid || isSubmitting} className="flex-1 bg-gradient-primary"><Save className="h-4 w-4 mr-2" />{isSubmitting ? 'Saving...' : 'Save Store Zone'}</Button>
      </div>
    </div>
  );
}
