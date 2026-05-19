import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Edit2, Trash2, User, Loader2, ThumbsUp, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useLocationReviews,
  useLocationRatingStats,
  useUserReview,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
  Review,
} from '@/hooks/useReviews';
import {
  useReviewHelpfuls,
  useUserHelpfuls,
  useUserReports,
  useToggleHelpful,
  useReportReview,
} from '@/hooks/useReviewActions';

interface LocationReviewsProps {
  locationId: string;
  locationName: string;
}

function StarRating({
  rating,
  onRate,
  size = 'md',
  interactive = false,
}: {
  rating: number;
  onRate?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  locationId,
  existingReview,
  onCancel,
  onSuccess,
}: {
  locationId: string;
  existingReview?: Review | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [content, setContent] = useState(existingReview?.content || '');
  const { toast } = useToast();
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a star rating.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to leave a review.',
          variant: 'destructive',
        });
        return;
      }

      if (existingReview) {
        await updateReview.mutateAsync({
          id: existingReview.id,
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
        });
        toast({
          title: 'Review updated',
          description: 'Your review has been updated.',
        });
      } else {
        await createReview.mutateAsync({
          location_id: locationId,
          user_id: user.id,
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
        });
        toast({
          title: 'Review submitted',
          description: 'Thank you for your review!',
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = createReview.isPending || updateReview.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Your Rating *</label>
        <StarRating rating={rating} onRate={setRating} size="lg" interactive />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Title (Optional)</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience"
          maxLength={100}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Review (Optional)</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with others..."
          className="min-h-[100px]"
          maxLength={1000}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : existingReview ? (
            'Update Review'
          ) : (
            'Submit Review'
          )}
        </Button>
      </div>
    </form>
  );
}

function ReviewCard({
  review,
  isOwn,
  onEdit,
  onDelete,
  locationId,
  userId,
  helpfulCount,
  isMarkedHelpful,
  hasReported,
  onToggleHelpful,
  onReport,
}: {
  review: Review;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  locationId: string;
  userId: string | null;
  helpfulCount: number;
  isMarkedHelpful: boolean;
  hasReported: boolean;
  onToggleHelpful: () => void;
  onReport: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            {isOwn && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Review</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete your review? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          {review.title && <p className="font-medium mb-1">{review.title}</p>}
          {review.content && <p className="text-sm text-muted-foreground">{review.content}</p>}
          
          {/* Helpful & Report Actions */}
          <div className="flex items-center gap-3 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-xs ${isMarkedHelpful ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={onToggleHelpful}
              disabled={!userId || isOwn}
            >
              <ThumbsUp className={`h-3.5 w-3.5 mr-1 ${isMarkedHelpful ? 'fill-current' : ''}`} />
              Helpful{helpfulCount > 0 && ` (${helpfulCount})`}
            </Button>
            {!isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs ${hasReported ? 'text-destructive' : 'text-muted-foreground'}`}
                onClick={onReport}
                disabled={!userId || hasReported}
              >
                <Flag className={`h-3.5 w-3.5 mr-1 ${hasReported ? 'fill-current' : ''}`} />
                {hasReported ? 'Reported' : 'Report'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LocationReviews({ locationId, locationName }: LocationReviewsProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const { toast } = useToast();

  const { data: reviews = [], isLoading: reviewsLoading } = useLocationReviews(locationId);
  const { data: stats } = useLocationRatingStats(locationId);
  const { data: userReview } = useUserReview(locationId, userId || undefined);
  const { data: helpfulCounts = {} } = useReviewHelpfuls(locationId);
  const { data: userHelpfuls = new Set<string>() } = useUserHelpfuls(locationId, userId || undefined);
  const { data: userReports = new Set<string>() } = useUserReports(locationId, userId || undefined);
  
  const deleteReview = useDeleteReview();
  const toggleHelpful = useToggleHelpful();
  const reportReview = useReportReview();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview.mutateAsync({ id: reviewId, locationId });
      toast({
        title: 'Review deleted',
        description: 'Your review has been removed.',
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleHelpful = async (reviewId: string) => {
    if (!userId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to mark reviews as helpful.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await toggleHelpful.mutateAsync({
        reviewId,
        userId,
        locationId,
        isCurrentlyHelpful: userHelpfuls.has(reviewId),
      });
    } catch (error) {
      console.error('Error toggling helpful:', error);
      toast({
        title: 'Error',
        description: 'Failed to update. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenReportDialog = (reviewId: string) => {
    if (!userId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to report reviews.',
        variant: 'destructive',
      });
      return;
    }
    setReportingReviewId(reviewId);
    setReportReason('');
    setReportDetails('');
    setReportDialogOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!userId || !reportingReviewId || !reportReason) return;

    try {
      await reportReview.mutateAsync({
        reviewId: reportingReviewId,
        userId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
        locationId,
      });
      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe.',
      });
      setReportDialogOpen(false);
    } catch (error) {
      console.error('Error reporting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingReview(null);
  };

  const handleWriteReview = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to leave a review.',
        variant: 'destructive',
      });
      return;
    }
    setIsFormOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Reviews
          </CardTitle>
          {!userReview && !isFormOpen && (
            <Button size="sm" onClick={handleWriteReview}>
              Write a Review
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        {stats && stats.count > 0 && (
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{stats.average.toFixed(1)}</div>
              <StarRating rating={Math.round(stats.average)} size="sm" />
              <p className="text-sm text-muted-foreground mt-1">
                {stats.count} {stats.count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star - 1];
                const percentage = stats.count > 0 ? (count / stats.count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-3">{star}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="w-8 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stats && stats.count === 0 && !isFormOpen && (
          <div className="text-center py-6">
            <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground">Be the first to review {locationName}</p>
          </div>
        )}

        {/* Review Form */}
        {(isFormOpen || editingReview) && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium mb-4">
                {editingReview ? 'Edit Your Review' : 'Write a Review'}
              </h3>
              <ReviewForm
                locationId={locationId}
                existingReview={editingReview}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingReview(null);
                }}
                onSuccess={handleFormSuccess}
              />
            </div>
          </>
        )}

        {/* Reviews List */}
        {reviews.length > 0 && (
          <>
            <Separator />
            <div className="divide-y divide-border">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isOwn={review.user_id === userId}
                  onEdit={() => {
                    setEditingReview(review);
                    setIsFormOpen(false);
                  }}
                  onDelete={() => handleDelete(review.id)}
                  locationId={locationId}
                  userId={userId}
                  helpfulCount={helpfulCounts[review.id] || 0}
                  isMarkedHelpful={userHelpfuls.has(review.id)}
                  hasReported={userReports.has(review.id)}
                  onToggleHelpful={() => handleToggleHelpful(review.id)}
                  onReport={() => handleOpenReportDialog(review.id)}
                />
              ))}
            </div>
          </>
        )}

        {reviewsLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
            <DialogDescription>
              Please let us know why you're reporting this review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason *</label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam or advertising</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="offensive">Offensive language</SelectItem>
                  <SelectItem value="fake">Fake or misleading</SelectItem>
                  <SelectItem value="off-topic">Off-topic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Additional details (optional)</label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide more context about your report..."
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReport} 
              disabled={!reportReason || reportReview.isPending}
            >
              {reportReview.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
