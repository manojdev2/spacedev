import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  GripVertical,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLocationPhotos } from '@/hooks/useLocationPhotos';
import { useLocationPhotoUpload } from '@/hooks/useLocationPhotoUpload';

interface LocationPhotoManagerProps {
  locationId: string;
  locationName: string;
}

export function LocationPhotoManager({ locationId, locationName }: LocationPhotoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  
  const { data: photos = [], isLoading } = useLocationPhotos(locationId);
  const { 
    uploadPhoto, 
    deletePhoto, 
    updatePhotoCaption, 
    isUploading, 
    uploadProgress 
  } = useLocationPhotoUpload(locationId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadPhoto(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditCaption = (photoId: string, currentCaption: string | null) => {
    setEditingCaptionId(photoId);
    setCaptionValue(currentCaption || '');
  };

  const handleSaveCaption = async (photoId: string) => {
    await updatePhotoCaption(photoId, captionValue);
    setEditingCaptionId(null);
    setCaptionValue('');
  };

  const handleCancelEdit = () => {
    setEditingCaptionId(null);
    setCaptionValue('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos
          </CardTitle>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isUploading && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Uploading...</p>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : photos.length === 0 ? (
          <div 
            className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No photos yet</p>
            <p className="text-sm text-muted-foreground">Click to upload photos for {locationName}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group relative aspect-square rounded-lg overflow-hidden border bg-muted"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Location photo'}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditCaption(photo.id, photo.caption)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this photo? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePhoto(photo.id, photo.url)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Caption editing */}
                  {editingCaptionId === photo.id ? (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80">
                      <div className="flex gap-1">
                        <Input
                          value={captionValue}
                          onChange={(e) => setCaptionValue(e.target.value)}
                          placeholder="Add caption..."
                          className="h-8 text-xs bg-background"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCaption(photo.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleSaveCaption(photo.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : photo.caption ? (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-xs text-white truncate">{photo.caption}</p>
                    </div>
                  ) : null}

                  {/* Order indicator */}
                  <div className="absolute top-2 left-2 w-6 h-6 rounded bg-black/60 flex items-center justify-center">
                    <span className="text-xs text-white font-medium">{photo.display_order + 1}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Upload placeholder */}
            <div 
              className="aspect-square rounded-lg border-2 border-dashed border-muted hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Add more</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Supported formats: JPG, PNG, WebP. Max size: 5MB per image.
        </p>
      </CardContent>
    </Card>
  );
}
