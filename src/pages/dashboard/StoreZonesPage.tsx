import { StoreZoneManager } from '@/components/store-zone/StoreZoneManager';
import { GoogleMapsProvider } from '@/contexts/GoogleMapsContext';

export default function StoreZonesPage() {
  return (
    <GoogleMapsProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Store Zones</h1>
          <p className="text-muted-foreground">
            Manage your store coverage zones, detect overlaps, and optimize store assignments.
          </p>
        </div>
        <StoreZoneManager />
      </div>
    </GoogleMapsProvider>
  );
}
