import { useState, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Search, Edit, Trash2, MoreVertical, Download, Loader2, Image, Navigation, AlertCircle, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Location } from '@/types';
import { categoryLabels } from '@/data/demoData';
import { useToast } from '@/hooks/use-toast';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useOrgLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/useLocations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StoreImportDialog } from '@/components/admin/StoreImportDialog';
import { LocationPhotoManager } from '@/components/dashboard/LocationPhotoManager';
import { LocationServicesManager } from '@/components/dashboard/LocationServicesManager';
import { AddressAutocomplete, AddressDetails } from '@/components/admin/AddressAutocomplete';
import { LocationFormMapPreview } from '@/components/admin/LocationFormMapPreview';

interface LocationFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  category: Location['category'];
  phone: string;
  email: string;
  lat?: number;
  lng?: number;
}

function LocationForm({ 
  location, 
  onSave, 
  onClose,
  isMapLoaded,
}: { 
  location?: Location; 
  onSave: (data: Partial<Location>) => void; 
  onClose: () => void;
  isMapLoaded: boolean;
}) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    address: location?.address || '',
    city: location?.city || '',
    state: location?.state || '',
    zipCode: location?.zipCode || '',
    country: location?.country || 'USA',
    category: location?.category || 'retail',
    phone: location?.phone || '',
    email: location?.email || '',
    lat: location?.lat,
    lng: location?.lng,
  });
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const handleAddressSelect = (details: AddressDetails) => {
    setFormData((prev) => ({
      ...prev,
      address: details.address,
      city: details.city,
      state: details.state,
      zipCode: details.zipCode,
      country: details.country || 'USA',
      lat: details.lat,
      lng: details.lng,
    }));
  };

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!isMapLoaded || !window.google) {
      setLocationError('Maps not loaded yet');
      setIsGettingLocation(false);
      return;
    }

    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results, status) => {
        setIsGettingLocation(false);
        
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const components = result.address_components || [];
          
          const getComponent = (types: string[]): string => {
            const component = components.find((c) =>
              types.some((type) => c.types.includes(type))
            );
            return component?.long_name || '';
          };

          const getShortComponent = (types: string[]): string => {
            const component = components.find((c) =>
              types.some((type) => c.types.includes(type))
            );
            return component?.short_name || '';
          };

          // Build street address from components
          const streetNumber = getComponent(['street_number']);
          const route = getComponent(['route']);
          const address = [streetNumber, route].filter(Boolean).join(' ') || 
                         getComponent(['sublocality_level_1']) ||
                         result.formatted_address?.split(',')[0] || '';

          setFormData((prev) => ({
            ...prev,
            address,
            city: getComponent(['locality', 'sublocality', 'administrative_area_level_2']),
            state: getShortComponent(['administrative_area_level_1']),
            zipCode: getComponent(['postal_code']),
            country: getShortComponent(['country']) || 'USA',
            lat,
            lng,
          }));
          setLocationError(null);
        } else {
          // Still set coordinates even if geocoding fails
          setFormData((prev) => ({ ...prev, lat, lng }));
          setLocationError('Could not determine address. Coordinates set.');
        }
      }
    );
  }, [isMapLoaded]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable in browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Try again.');
            break;
          default:
            setLocationError('Unable to retrieve your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [reverseGeocode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-sm font-medium mb-2 block">Location Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Downtown Store"
            required
          />
        </div>
        
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Address *</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation || !isMapLoaded}
              className="h-7 text-xs gap-1.5"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <Navigation className="h-3 w-3" />
                  Use current location
                </>
              )}
            </Button>
          </div>
          <AddressAutocomplete
            value={formData.address}
            onChange={(value) => setFormData({ ...formData, address: value })}
            onPlaceSelect={handleAddressSelect}
            placeholder="Start typing an address..."
            required
            isMapLoaded={isMapLoaded}
          />
          {locationError ? (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {locationError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Start typing to search, or use your current location
            </p>
          )}
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">City *</label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="New York"
            required
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">State *</label>
          <Input
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="NY"
            required
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Zip Code *</label>
          <Input
            value={formData.zipCode}
            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            placeholder="10001"
            required
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Category *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as Location['category'] })}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background"
          >
            <option value="retail">Retail Store</option>
            <option value="warehouse">Warehouse</option>
            <option value="service-center">Service Center</option>
            <option value="headquarters">Headquarters</option>
            <option value="branch">Branch Office</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Phone</label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="store@company.com"
          />
        </div>
      </div>
      
      {/* Map Preview */}
      <div className="md:col-span-2">
        <label className="text-sm font-medium mb-2 block">Location Preview</label>
        <div className="h-[200px] rounded-lg overflow-hidden border border-border">
          <LocationFormMapPreview
            lat={formData.lat}
            lng={formData.lng}
            isLoaded={isMapLoaded}
            locationName={formData.name || 'Selected Location'}
            onPositionChange={(lat, lng) => {
              setIsGettingLocation(true);
              reverseGeocode(lat, lng);
            }}
          />
        </div>
        {isGettingLocation && formData.lat && formData.lng ? (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating address...
          </p>
        ) : formData.lat && formData.lng ? (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Coordinates: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
          </p>
        ) : null}
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="default">
          {location ? 'Update Location' : 'Add Location'}
        </Button>
      </div>
    </form>
  );
}

export default function LocationsPage() {
  const { organizationId, isLoading: isOrgLoading } = useUserOrganization();
  const { data: locations = [], isLoading: isLocationsLoading } = useOrgLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  
  // Use the centralized Google Maps context
  const { isLoaded: isMapLoaded, isApiKeyLoading } = useGoogleMaps();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>();
  const [photoManagerLocation, setPhotoManagerLocation] = useState<Location | null>(null);
  const [servicesManagerLocation, setServicesManagerLocation] = useState<Location | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  
  const isLoading = isOrgLoading || isLocationsLoading;

  const filteredLocations = useMemo(() => 
    locations.filter((loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [locations, searchQuery]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSave = async (data: Partial<Location>) => {
    try {
      if (editingLocation) {
        await updateLocation.mutateAsync({ id: editingLocation.id, updates: data });
        toast({
          title: 'Location updated',
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        // Use coordinates from Google Places if available, otherwise generate random NYC-area coords
        const lat = data.lat || 40.7128 + (Math.random() - 0.5) * 0.1;
        const lng = data.lng || -74.006 + (Math.random() - 0.5) * 0.1;
        
        const newLocation = {
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          country: data.country || 'USA',
          lat,
          lng,
          category: data.category || 'retail',
          phone: data.phone || '',
          email: data.email || '',
          openingHours: {
            monday: { isOpen: true, open: '09:00', close: '18:00' },
            tuesday: { isOpen: true, open: '09:00', close: '18:00' },
            wednesday: { isOpen: true, open: '09:00', close: '18:00' },
            thursday: { isOpen: true, open: '09:00', close: '18:00' },
            friday: { isOpen: true, open: '09:00', close: '18:00' },
            saturday: { isOpen: true, open: '10:00', close: '16:00' },
            sunday: { isOpen: false, open: '', close: '' },
          },
          services: [],
          isActive: true,
          clientId: organizationId || '', // Use user's organization
        };
        
        if (!organizationId) {
          toast({
            title: 'Error',
            description: 'No organization found. Please contact support.',
            variant: 'destructive',
          });
          return;
        }
        
        await createLocation.mutateAsync(newLocation as Omit<Location, 'id' | 'createdAt' | 'updatedAt'>);
        toast({
          title: 'Location added',
          description: `${data.name} has been added successfully.`,
        });
      }
      setEditingLocation(undefined);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save location. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (location: Location) => {
    try {
      await deleteLocation.mutateAsync(location.id);
      toast({
        title: 'Location deleted',
        description: `${location.name} has been removed.`,
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete location. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Address', 'City', 'State', 'Zip', 'Category', 'Phone', 'Email'].join(','),
      ...locations.map((loc) => 
        [loc.name, loc.address, loc.city, loc.state, loc.zipCode, loc.category, loc.phone, loc.email].join(',')
      ),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'locations.csv';
    a.click();
    
    toast({
      title: 'Export successful',
      description: 'Locations have been exported to CSV.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted-foreground">Manage your store locations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <StoreImportDialog 
            organizationId={organizationId || ''}
            onImportComplete={() => {
              toast({
                title: 'Import complete',
                description: 'Locations have been refreshed.',
              });
            }}
          />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingLocation(undefined);
          }}>
            <DialogTrigger asChild>
              <Button variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
              </DialogHeader>
              {isMapLoaded && !isApiKeyLoading ? (
                <LocationForm
                  location={editingLocation}
                  onSave={handleSave}
                  onClose={() => setIsDialogOpen(false)}
                  isMapLoaded={isMapLoaded}
                />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading maps...</span>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Locations Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-4 font-medium text-sm">Location</th>
                <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Category</th>
                <th className="text-left p-4 font-medium text-sm hidden lg:table-cell">Contact</th>
                <th className="text-left p-4 font-medium text-sm hidden lg:table-cell">Status</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLocations.map((location) => (
                <tr key={location.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {location.address}, {location.city}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-sm px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {categoryLabels[location.category]}
                    </span>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="text-sm">
                      <p>{location.phone}</p>
                      <p className="text-muted-foreground">{location.email}</p>
                    </div>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className={`inline-flex items-center gap-1 text-sm ${
                      location.isActive ? 'text-success' : 'text-muted-foreground'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        location.isActive ? 'bg-success' : 'bg-muted-foreground'
                      }`} />
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border border-border">
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingLocation(location);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setPhotoManagerLocation(location)}
                          >
                            <Image className="h-4 w-4 mr-2" />
                            Manage Photos
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setServicesManagerLocation(location)}
                          >
                            <CalendarCheck className="h-4 w-4 mr-2" />
                            Booking Services
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(location)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLocations.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-1">No locations found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or add a new location.</p>
          </div>
        )}

        {/* Pagination */}
        {filteredLocations.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing</span>
              <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>of {filteredLocations.length} locations</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Photo Manager Dialog */}
      <Dialog 
        open={!!photoManagerLocation} 
        onOpenChange={(open) => !open && setPhotoManagerLocation(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Photos - {photoManagerLocation?.name}</DialogTitle>
          </DialogHeader>
          {photoManagerLocation && (
            <LocationPhotoManager 
              locationId={photoManagerLocation.id}
              locationName={photoManagerLocation.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Services Manager Dialog */}
      <Dialog 
        open={!!servicesManagerLocation} 
        onOpenChange={(open) => !open && setServicesManagerLocation(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Services - {servicesManagerLocation?.name}</DialogTitle>
          </DialogHeader>
          {servicesManagerLocation && (
            <LocationServicesManager 
              locationId={servicesManagerLocation.id}
              locationName={servicesManagerLocation.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
