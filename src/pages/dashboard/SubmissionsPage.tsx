import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Store, Check, X, Clock, Eye, Trash2, ExternalLink,
  Mail, Phone, MapPin, Building2, Tag, FileText, Loader2,
  Filter, ChevronDown, Navigation, Save, LocateFixed, Zap
} from 'lucide-react';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { LocationFormMapPreview } from '@/components/admin/LocationFormMapPreview';
import { BatchGeocodeDialog } from '@/components/admin/BatchGeocodeDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useStoreSubmissions,
  useSubmissionCounts,
  useUpdateSubmissionStatus,
  useDeleteSubmission,
  useApproveAndCreateLocation,
  useUpdateSubmissionCoordinates,
  StoreSubmission,
} from '@/hooks/useStoreSubmissions';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { categoryLabels } from '@/data/demoData';
import { LocationCategory } from '@/types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: X },
};

function SubmissionDetailsDialog({
  submission,
  open,
  onClose,
  onApprove,
  onReject,
  isUpdating,
  isMapLoaded,
  onCoordinatesUpdate,
}: {
  submission: StoreSubmission | null;
  open: boolean;
  onClose: () => void;
  onApprove: (updatedSubmission: StoreSubmission) => void;
  onReject: () => void;
  isUpdating: boolean;
  isMapLoaded: boolean;
  onCoordinatesUpdate: (id: string, lat: number, lng: number) => Promise<void>;
}) {
  const [editedCoords, setEditedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { toast } = useToast();

  // Reset edited coords and manual inputs when submission changes
  useEffect(() => {
    setEditedCoords(null);
    setManualLat(submission?.lat?.toFixed(6) ?? '');
    setManualLng(submission?.lng?.toFixed(6) ?? '');
  }, [submission?.id, submission?.lat, submission?.lng]);

  if (!submission) return null;

  const currentLat = editedCoords?.lat ?? submission.lat;
  const currentLng = editedCoords?.lng ?? submission.lng;
  const hasUnsavedChanges = editedCoords !== null;

  const handlePositionChange = (lat: number, lng: number) => {
    setEditedCoords({ lat, lng });
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
  };

  const handleManualLatChange = (value: string) => {
    setManualLat(value);
    const parsedLat = parseFloat(value);
    const parsedLng = parseFloat(manualLng);
    if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
      if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        setEditedCoords({ lat: parsedLat, lng: parsedLng });
      } else {
        setEditedCoords({ lat: parsedLat, lng: submission?.lng ?? 0 });
      }
    }
  };

  const handleManualLngChange = (value: string) => {
    setManualLng(value);
    const parsedLat = parseFloat(manualLat);
    const parsedLng = parseFloat(value);
    if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        setEditedCoords({ lat: parsedLat, lng: parsedLng });
      } else {
        setEditedCoords({ lat: submission?.lat ?? 0, lng: parsedLng });
      }
    }
  };

  const handleGeocode = async () => {
    if (!isMapLoaded || !submission) return;
    
    setIsGeocoding(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const fullAddress = `${submission.address}, ${submission.city}, ${submission.state} ${submission.zip_code}, ${submission.country}`;
      
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address: fullAddress }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
      
      const location = result[0].geometry.location;
      const lat = location.lat();
      const lng = location.lng();
      
      setEditedCoords({ lat, lng });
      setManualLat(lat.toFixed(6));
      setManualLng(lng.toFixed(6));
      
      toast({
        title: 'Address geocoded',
        description: `Found coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });
    } catch (error) {
      toast({
        title: 'Geocoding failed',
        description: error instanceof Error ? error.message : 'Could not find coordinates for this address.',
        variant: 'destructive',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSaveCoordinates = async () => {
    if (!editedCoords) return;
    setIsSaving(true);
    try {
      await onCoordinatesUpdate(submission.id, editedCoords.lat, editedCoords.lng);
      toast({
        title: 'Coordinates updated',
        description: 'The location coordinates have been saved.',
      });
      setEditedCoords(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save coordinates.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = () => {
    // Pass the submission with updated coordinates if they were changed
    const updatedSubmission = editedCoords
      ? { ...submission, lat: editedCoords.lat, lng: editedCoords.lng }
      : submission;
    onApprove(updatedSubmission);
  };

  const StatusIcon = statusConfig[submission.status].icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{submission.business_name}</DialogTitle>
              <DialogDescription>
                Submitted {format(new Date(submission.created_at), 'MMM d, yyyy \'at\' h:mm a')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusConfig[submission.status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[submission.status].label}
            </Badge>
            {submission.reviewed_at && (
              <span className="text-sm text-muted-foreground">
                Reviewed on {format(new Date(submission.reviewed_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Name:</span>
                <span>{submission.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${submission.contact_email}`} className="text-primary hover:underline">
                  {submission.contact_email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${submission.contact_phone}`} className="text-primary hover:underline">
                  {submission.contact_phone}
                </a>
              </div>
              {submission.website && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <a href={submission.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                    {submission.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location Details */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Details
            </h3>
            <div className="text-sm space-y-2">
              <p>{submission.address}</p>
              <p>{submission.city}, {submission.state} {submission.zip_code}</p>
              <p>{submission.country}</p>
            </div>
            
            {/* Interactive Map Preview */}
            <div className="mt-4 space-y-2">
              {currentLat !== null && currentLng !== null ? (
                <>
                  <div className="h-56 rounded-lg overflow-hidden border border-border">
                    <LocationFormMapPreview
                      lat={currentLat}
                      lng={currentLng}
                      isLoaded={isMapLoaded}
                      locationName={submission.business_name}
                      onPositionChange={submission.status === 'pending' ? handlePositionChange : undefined}
                    />
                  </div>
                  {submission.status === 'pending' && (
                    <div className="space-y-3">
                      {/* Manual coordinate inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="lat" className="text-xs">Latitude</Label>
                          <Input
                            id="lat"
                            type="text"
                            value={manualLat}
                            onChange={(e) => handleManualLatChange(e.target.value)}
                            placeholder="-90 to 90"
                            className="h-8 text-sm font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lng" className="text-xs">Longitude</Label>
                          <Input
                            id="lng"
                            type="text"
                            value={manualLng}
                            onChange={(e) => handleManualLngChange(e.target.value)}
                            placeholder="-180 to 180"
                            className="h-8 text-sm font-mono"
                          />
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex justify-between items-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleGeocode}
                          disabled={isGeocoding || !isMapLoaded}
                          className="h-7 text-xs"
                        >
                          {isGeocoding ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <LocateFixed className="h-3 w-3 mr-1" />
                          )}
                          Re-geocode
                        </Button>
                        {hasUnsavedChanges && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSaveCoordinates}
                            disabled={isSaving}
                            className="h-7"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Save coordinates
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-56 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
                  <div className="text-center text-muted-foreground">
                    <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No coordinates provided</p>
                    {submission.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGeocode}
                        disabled={isGeocoding || !isMapLoaded}
                        className="mt-3"
                      >
                        {isGeocoding ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <LocateFixed className="h-4 w-4 mr-2" />
                        )}
                        Geocode from address
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Category & Services */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Category & Services
            </h3>
            <div className="space-y-3">
              <Badge variant="secondary">
                {categoryLabels[submission.category as LocationCategory] || submission.category}
              </Badge>
              {submission.services && submission.services.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {submission.services.map((service, idx) => (
                    <Badge key={idx} variant="outline">{service}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {submission.additional_notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Additional Notes
                </h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {submission.additional_notes}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          {submission.status === 'pending' && (
            <>
              <Separator />
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={onReject}
                  disabled={isUpdating}
                  className="text-destructive hover:text-destructive"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={isUpdating || hasUnsavedChanges}>
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </div>
              {hasUnsavedChanges && (
                <p className="text-xs text-amber-600 text-right">
                  Save coordinate changes before approving
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<StoreSubmission | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [batchGeocodeOpen, setBatchGeocodeOpen] = useState(false);
  const { toast } = useToast();
  const { isLoaded: isMapLoaded } = useGoogleMaps();
  const { organizationId } = useUserOrganization();

  const { data: submissions = [], isLoading } = useStoreSubmissions(
    statusFilter === 'all' ? undefined : statusFilter
  );
  const { data: allSubmissions = [] } = useStoreSubmissions(); // For batch geocoding
  const { data: counts } = useSubmissionCounts();
  const updateStatus = useUpdateSubmissionStatus();
  const deleteSubmission = useDeleteSubmission();
  const approveAndCreate = useApproveAndCreateLocation();
  const updateCoordinates = useUpdateSubmissionCoordinates();

  // Count submissions without coordinates
  const submissionsWithoutCoords = allSubmissions.filter(
    (s) => s.status === 'pending' && (s.lat === null || s.lng === null)
  ).length;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const handleApprove = async (submission: StoreSubmission) => {
    if (!userId || !organizationId) {
      toast({
        title: 'Error',
        description: 'Unable to approve. Please ensure you are logged in and have an organization.',
        variant: 'destructive',
      });
      return;
    }

    // Check if coordinates exist
    if (submission.lat === null || submission.lng === null) {
      toast({
        title: 'Missing coordinates',
        description: 'This submission does not have location coordinates. Please set them before approving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await approveAndCreate.mutateAsync({
        submission,
        reviewedBy: userId,
        organizationId,
      });
      toast({
        title: 'Location created!',
        description: `${submission.business_name} has been approved and added as a new location.`,
      });
      setSelectedSubmission(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve submission.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (submission: StoreSubmission) => {
    if (!userId) return;
    try {
      await updateStatus.mutateAsync({
        id: submission.id,
        status: 'rejected',
        reviewedBy: userId,
        submission, // Pass submission for email notification
      });
      toast({
        title: 'Submission rejected',
        description: `${submission.business_name} has been rejected. A notification email has been sent.`,
      });
      setSelectedSubmission(null);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reject submission.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSubmission.mutateAsync(deleteId);
      toast({
        title: 'Submission deleted',
        description: 'The submission has been permanently removed.',
      });
      setDeleteId(null);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete submission.',
        variant: 'destructive',
      });
    }
  };

  const filterOptions: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: counts?.total },
    { value: 'pending', label: 'Pending', count: counts?.pending },
    { value: 'approved', label: 'Approved', count: counts?.approved },
    { value: 'rejected', label: 'Rejected', count: counts?.rejected },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Store Submissions</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage store registration requests
          </p>
        </div>

        <div className="flex gap-2">
          {submissionsWithoutCoords > 0 && (
            <Button variant="outline" onClick={() => setBatchGeocodeOpen(true)}>
              <Zap className="h-4 w-4 mr-2" />
              Batch Geocode
              <Badge variant="secondary" className="ml-2">{submissionsWithoutCoords}</Badge>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {filterOptions.find((f) => f.value === statusFilter)?.label}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className="flex justify-between"
                >
                  <span>{option.label}</span>
                  {option.count !== undefined && (
                    <Badge variant="secondary" className="ml-2">{option.count}</Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts?.total ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts?.pending ?? 0}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts?.approved ?? 0}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts?.rejected ?? 0}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No submissions found</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'pending'
                  ? 'All pending submissions have been reviewed'
                  : 'Store submissions will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission, index) => {
                    const StatusIcon = statusConfig[submission.status].icon;
                    return (
                      <motion.tr
                        key={submission.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{submission.business_name}</p>
                            <p className="text-sm text-muted-foreground">{submission.contact_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{submission.city}, {submission.state}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categoryLabels[submission.category as LocationCategory] || submission.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusConfig[submission.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[submission.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(submission.created_at), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {submission.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(submission)}
                                  disabled={updateStatus.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleReject(submission)}
                                  disabled={updateStatus.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(submission.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <SubmissionDetailsDialog
        submission={selectedSubmission}
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        onApprove={(updatedSubmission) => handleApprove(updatedSubmission)}
        onReject={() => selectedSubmission && handleReject(selectedSubmission)}
        isUpdating={updateStatus.isPending || approveAndCreate.isPending}
        isMapLoaded={isMapLoaded}
        onCoordinatesUpdate={async (id, lat, lng) => {
          await updateCoordinates.mutateAsync({ id, lat, lng });
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Geocode Dialog */}
      <BatchGeocodeDialog
        open={batchGeocodeOpen}
        onClose={() => setBatchGeocodeOpen(false)}
        submissions={allSubmissions}
        isMapLoaded={isMapLoaded}
        onCoordinatesUpdate={async (id, lat, lng) => {
          await updateCoordinates.mutateAsync({ id, lat, lng });
        }}
      />
    </div>
  );
}
