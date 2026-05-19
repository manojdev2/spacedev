import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Flag, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Eye,
  Star,
  Loader2,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useReportedReviews, useUpdateReportStatus, ReportedReview } from '@/hooks/useReportedReviews';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  inappropriate: 'Inappropriate Content',
  offensive: 'Offensive Language',
  false_info: 'False Information',
  other: 'Other',
};

export default function ReportedReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportedReview | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'resolve' | 'dismiss' | null;
    deleteReview: boolean;
  }>({ open: false, action: null, deleteReview: false });

  const { data: reports = [], isLoading } = useReportedReviews(statusFilter === 'all' ? undefined : statusFilter);
  const updateStatus = useUpdateReportStatus();
  const { toast } = useToast();

  const handleAction = async (action: 'resolve' | 'dismiss', deleteReview = false) => {
    if (!selectedReport) return;

    try {
      await updateStatus.mutateAsync({
        reportId: selectedReport.id,
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        deleteReview,
      });

      toast({
        title: action === 'resolve' ? 'Report resolved' : 'Report dismissed',
        description: deleteReview 
          ? 'The report was resolved and the review was deleted.'
          : `The report was ${action === 'resolve' ? 'resolved' : 'dismissed'}.`,
      });

      setActionDialog({ open: false, action: null, deleteReview: false });
      setSelectedReport(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update report status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6" />
            Reported Reviews
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage reported content from users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{reports.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">
                {reports.filter(r => {
                  if (r.status !== 'resolved' || !r.reviewed_at) return false;
                  const today = new Date();
                  const reviewedDate = new Date(r.reviewed_at);
                  return reviewedDate.toDateString() === today.toDateString();
                }).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No reports found</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'pending' 
                  ? 'No pending reports to review.'
                  : 'No reports match the selected filter.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={statusColors[report.status] || statusColors.pending}
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {reasonLabels[report.reason] || report.reason}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <div className="flex items-center gap-1 text-amber-500 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3 w-3 ${
                                i < (report.review?.rating || 0) ? 'fill-current' : ''
                              }`} 
                            />
                          ))}
                        </div>
                        <p className="text-sm truncate">
                          {report.review?.title || report.review?.content || 'No content'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {report.review?.location?.name || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {report.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-600"
                              onClick={() => {
                                setSelectedReport(report);
                                setActionDialog({ open: true, action: 'resolve', deleteReview: false });
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedReport(report);
                                setActionDialog({ open: true, action: 'dismiss', deleteReview: false });
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={!!selectedReport && !actionDialog.open} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                <Badge 
                  variant="outline" 
                  className={statusColors[selectedReport.status] || statusColors.pending}
                >
                  {selectedReport.status}
                </Badge>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Reason</h4>
                <p className="font-medium">{reasonLabels[selectedReport.reason] || selectedReport.reason}</p>
              </div>

              {selectedReport.details && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Additional Details</h4>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedReport.details}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Reported Review</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-1 text-amber-500 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${
                          i < (selectedReport.review?.rating || 0) ? 'fill-current' : ''
                        }`} 
                      />
                    ))}
                  </div>
                  {selectedReport.review?.title && (
                    <h5 className="font-semibold mb-1">{selectedReport.review.title}</h5>
                  )}
                  <p className="text-sm">{selectedReport.review?.content || 'No content'}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Location: {selectedReport.review?.location?.name || 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Reported {formatDistanceToNow(new Date(selectedReport.created_at), { addSuffix: true })}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedReport?.status === 'pending' && (
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActionDialog({ open: true, action: 'dismiss', deleteReview: false })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => setActionDialog({ open: true, action: 'resolve', deleteReview: false })}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, deleteReview: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'resolve' 
                ? 'Mark this report as resolved. You can also delete the reported review.'
                : 'Dismiss this report as invalid or not requiring action.'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.action === 'resolve' && (
            <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Trash2 className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Delete the review?</p>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
              <Button
                variant={actionDialog.deleteReview ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setActionDialog(prev => ({ ...prev, deleteReview: !prev.deleteReview }))}
              >
                {actionDialog.deleteReview ? 'Yes, delete' : 'No, keep'}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null, deleteReview: false })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === 'resolve' && actionDialog.deleteReview ? 'destructive' : 'default'}
              onClick={() => handleAction(actionDialog.action!, actionDialog.deleteReview)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionDialog.action === 'resolve' 
                ? (actionDialog.deleteReview ? 'Resolve & Delete Review' : 'Resolve Report')
                : 'Dismiss Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
