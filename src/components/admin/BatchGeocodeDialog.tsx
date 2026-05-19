import { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, CheckCircle2, XCircle, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StoreSubmission } from '@/hooks/useStoreSubmissions';

interface GeocodeResult {
  id: string;
  businessName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  lat?: number;
  lng?: number;
  error?: string;
}

interface BatchGeocodeDialogProps {
  open: boolean;
  onClose: () => void;
  submissions: StoreSubmission[];
  isMapLoaded: boolean;
  onCoordinatesUpdate: (id: string, lat: number, lng: number) => Promise<void>;
}

export function BatchGeocodeDialog({
  open,
  onClose,
  submissions,
  isMapLoaded,
  onCoordinatesUpdate,
}: BatchGeocodeDialogProps) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  // Filter submissions without coordinates
  const submissionsWithoutCoords = submissions.filter(
    (s) => s.status === 'pending' && (s.lat === null || s.lng === null)
  );

  // Initialize results when dialog opens
  useEffect(() => {
    if (open) {
      setResults(
        submissionsWithoutCoords.map((s) => ({
          id: s.id,
          businessName: s.business_name,
          status: 'pending',
        }))
      );
      setCurrentIndex(0);
      setIsProcessing(false);
    }
  }, [open, submissions]);

  const geocodeAddress = useCallback(
    async (submission: StoreSubmission): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
        if (!window.google?.maps?.Geocoder) {
          reject(new Error('Google Maps not loaded'));
          return;
        }

        const geocoder = new google.maps.Geocoder();
        const fullAddress = `${submission.address}, ${submission.city}, ${submission.state} ${submission.zip_code}, ${submission.country}`;

        geocoder.geocode({ address: fullAddress }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const location = results[0].geometry.location;
            resolve({ lat: location.lat(), lng: location.lng() });
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
    },
    []
  );

  const processNext = useCallback(async () => {
    if (currentIndex >= submissionsWithoutCoords.length) {
      setIsProcessing(false);
      const successCount = results.filter((r) => r.status === 'success').length;
      toast({
        title: 'Batch geocoding complete',
        description: `Successfully geocoded ${successCount} of ${submissionsWithoutCoords.length} submissions.`,
      });
      return;
    }

    const submission = submissionsWithoutCoords[currentIndex];

    // Update status to processing
    setResults((prev) =>
      prev.map((r) => (r.id === submission.id ? { ...r, status: 'processing' } : r))
    );

    try {
      const coords = await geocodeAddress(submission);

      // Save to database
      await onCoordinatesUpdate(submission.id, coords.lat, coords.lng);

      // Update result
      setResults((prev) =>
        prev.map((r) =>
          r.id === submission.id
            ? { ...r, status: 'success', lat: coords.lat, lng: coords.lng }
            : r
        )
      );
    } catch (error) {
      setResults((prev) =>
        prev.map((r) =>
          r.id === submission.id
            ? { ...r, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            : r
        )
      );
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));

    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, submissionsWithoutCoords, geocodeAddress, onCoordinatesUpdate, results, toast]);

  // Process submissions one by one
  useEffect(() => {
    if (isProcessing && currentIndex < submissionsWithoutCoords.length) {
      processNext();
    }
  }, [isProcessing, currentIndex, processNext, submissionsWithoutCoords.length]);

  const handleStart = () => {
    setIsProcessing(true);
    setCurrentIndex(0);
    setResults((prev) => prev.map((r) => ({ ...r, status: 'pending', error: undefined })));
  };

  const handleStop = () => {
    setIsProcessing(false);
  };

  const progress =
    submissionsWithoutCoords.length > 0
      ? (results.filter((r) => r.status === 'success' || r.status === 'error').length /
          submissionsWithoutCoords.length) *
        100
      : 0;

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  const getStatusIcon = (status: GeocodeResult['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Batch Geocoding
          </DialogTitle>
          <DialogDescription>
            Automatically generate coordinates for submissions with missing location data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {submissionsWithoutCoords.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="font-medium">All set!</p>
              <p className="text-sm text-muted-foreground">
                All pending submissions already have coordinates.
              </p>
            </div>
          ) : (
            <>
              {/* Progress Section */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {submissionsWithoutCoords.length} submission
                    {submissionsWithoutCoords.length !== 1 ? 's' : ''} to process
                  </span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {(successCount > 0 || errorCount > 0) && (
                  <div className="flex gap-3 text-sm">
                    <span className="text-primary">{successCount} succeeded</span>
                    {errorCount > 0 && (
                      <span className="text-destructive">{errorCount} failed</span>
                    )}
                  </div>
                )}
              </div>

              {/* Results List */}
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-1">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(result.status)}
                        <span className="text-sm truncate">{result.businessName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === 'success' && result.lat && result.lng && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                          </span>
                        )}
                        {result.status === 'error' && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {submissionsWithoutCoords.length > 0 && (
            <>
              {isProcessing ? (
                <Button variant="destructive" onClick={handleStop}>
                  <X className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button onClick={handleStart} disabled={!isMapLoaded}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Geocoding
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
