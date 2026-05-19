import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Camera, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useLocationPhotos, LocationPhoto } from '@/hooks/useLocationPhotos';

interface LocationPhotoGalleryProps {
  locationId: string;
  locationName: string;
}

function LightboxModal({
  photos,
  initialIndex,
  onClose,
}: {
  photos: LocationPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goNext();
    else if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'Escape') onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Image */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photos[currentIndex].url}
          alt={photos[currentIndex].caption || `Photo ${currentIndex + 1}`}
          className="max-w-full max-h-[75vh] object-contain rounded-lg"
        />
        {photos[currentIndex].caption && (
          <p className="text-white text-center mt-4 max-w-lg">
            {photos[currentIndex].caption}
          </p>
        )}
        <p className="text-white/60 text-sm mt-2">
          {currentIndex + 1} / {photos.length}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function LocationPhotoGallery({ locationId, locationName }: LocationPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { data: photos = [], isLoading } = useLocationPhotos(locationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ImageOff className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No photos available</p>
            <p className="text-sm text-muted-foreground">
              Photos for {locationName} will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
            <span className="text-sm font-normal text-muted-foreground">
              ({photos.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Carousel */}
          <div className="md:hidden">
            <Carousel className="w-full">
              <CarouselContent>
                {photos.map((photo, index) => (
                  <CarouselItem key={photo.id}>
                    <button
                      onClick={() => setLightboxIndex(index)}
                      className="w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg overflow-hidden"
                    >
                      <AspectRatio ratio={4 / 3}>
                        <img
                          src={photo.url}
                          alt={photo.caption || `Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </AspectRatio>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {photos.length > 1 && (
                <>
                  <CarouselPrevious className="-left-3" />
                  <CarouselNext className="-right-3" />
                </>
              )}
            </Carousel>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid grid-cols-4 gap-3">
            {photos.slice(0, 8).map((photo, index) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setLightboxIndex(index)}
                className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg overflow-hidden"
              >
                <AspectRatio ratio={1}>
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </AspectRatio>
                {/* Show "View all" on last item if more photos exist */}
                {index === 7 && photos.length > 8 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-medium">
                      +{photos.length - 8} more
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <LightboxModal
            photos={photos}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
