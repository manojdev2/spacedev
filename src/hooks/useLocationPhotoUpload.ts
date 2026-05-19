import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BUCKET_NAME = 'location-photos';

export function useLocationPhotoUpload(locationId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const uploadPhoto = async (file: File, caption?: string) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return null;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image under 5MB.',
        variant: 'destructive',
      });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${locationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      // Get current max display order
      const { data: existingPhotos } = await supabase
        .from('location_photos')
        .select('display_order')
        .eq('location_id', locationId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existingPhotos && existingPhotos.length > 0 
        ? existingPhotos[0].display_order + 1 
        : 0;

      // Insert photo record
      const { data: photoRecord, error: insertError } = await supabase
        .from('location_photos')
        .insert({
          location_id: locationId,
          url: publicUrl,
          caption: caption || null,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(100);

      // Invalidate photo queries
      queryClient.invalidateQueries({ queryKey: ['location-photos', locationId] });

      toast({
        title: 'Photo uploaded',
        description: 'The photo has been added to this location.',
      });

      return photoRecord;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split(`${BUCKET_NAME}/`);
      const filePath = urlParts[1];

      // Delete from storage
      if (filePath) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('location_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['location-photos', locationId] });

      toast({
        title: 'Photo deleted',
        description: 'The photo has been removed.',
      });

      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete photo. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updatePhotoCaption = async (photoId: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('location_photos')
        .update({ caption })
        .eq('id', photoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['location-photos', locationId] });

      toast({
        title: 'Caption updated',
        description: 'The photo caption has been saved.',
      });

      return true;
    } catch (error) {
      console.error('Error updating caption:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update caption. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const reorderPhotos = async (photoIds: string[]) => {
    try {
      // Update display order for each photo
      const updates = photoIds.map((id, index) => 
        supabase
          .from('location_photos')
          .update({ display_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      queryClient.invalidateQueries({ queryKey: ['location-photos', locationId] });

      return true;
    } catch (error) {
      console.error('Error reordering photos:', error);
      toast({
        title: 'Reorder failed',
        description: 'Failed to reorder photos. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    uploadPhoto,
    deletePhoto,
    updatePhotoCaption,
    reorderPhotos,
    isUploading,
    uploadProgress,
  };
}
