import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { 
  Download, 
  FileText, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Wallet,
  Bitcoin,
  Building2,
  Mail,
  Loader2,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Payment } from "@/hooks/useSubscription";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  succeeded: { label: "Paid", variant: "default", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3.5 w-3.5" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="h-3.5 w-3.5" /> },
  refunded: { label: "Refunded", variant: "outline", icon: <XCircle className="h-3.5 w-3.5" /> },
};

const paymentMethodIcons: Record<string, React.ReactNode> = {
  stripe: <CreditCard className="h-4 w-4" />,
  paypal: <Wallet className="h-4 w-4" />,
  crypto: <Bitcoin className="h-4 w-4" />,
  bank_transfer: <Building2 className="h-4 w-4" />,
};

function generateInvoiceNumber(payment: Payment): string {
  const date = new Date(payment.created_at);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = payment.id.slice(0, 8).toUpperCase();
  return `INV-${year}${month}-${shortId}`;
}

function generateInvoicePDF(payment: Payment): void {
  const invoiceNumber = generateInvoiceNumber(payment);
  const status = statusConfig[payment.status] || statusConfig.pending;
  
  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; }
        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-info h1 { font-size: 24px; color: #6366f1; margin-bottom: 8px; }
        .company-info p { color: #666; font-size: 14px; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { font-size: 28px; color: #1a1a1a; margin-bottom: 8px; }
        .invoice-details p { color: #666; font-size: 14px; margin-bottom: 4px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-failed { background: #fee2e2; color: #991b1b; }
        .divider { border-top: 2px solid #e5e7eb; margin: 30px 0; }
        .billing-section { margin-bottom: 30px; }
        .billing-section h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; letter-spacing: 0.5px; }
        .billing-section p { font-size: 14px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        th { background: #f9fafb; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e7eb; }
        td { padding: 16px 12px; border-bottom: 1px solid #e5e7eb; }
        .amount { text-align: right; }
        .total-row { background: #f9fafb; font-weight: 600; }
        .total-row td { font-size: 16px; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        .payment-method { display: flex; align-items: center; gap: 8px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="company-info">
           <h1>LocatePro</h1>
           <p>Store Locator Platform</p>
           <p>support@locatepro.com</p>
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Date:</strong> ${format(new Date(payment.created_at), "MMMM d, yyyy")}</p>
          <span class="status-badge status-${payment.status === 'succeeded' ? 'paid' : payment.status}">${status.label}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="billing-section">
        <h3>Payment Details</h3>
        <p><strong>Payment Method:</strong> ${payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
        <p><strong>Transaction ID:</strong> ${payment.stripe_payment_intent_id || payment.id}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${payment.description || 'Subscription Payment'}</td>
            <td class="amount">$${(payment.amount_cents / 100).toFixed(2)} ${payment.currency.toUpperCase()}</td>
          </tr>
          <tr class="total-row">
            <td>Total</td>
            <td class="amount">$${(payment.amount_cents / 100).toFixed(2)} ${payment.currency.toUpperCase()}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>If you have any questions about this invoice, please contact support@locatepro.com</p>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

export default function InvoicesPage() {
  const { payments, isLoading } = useSubscription();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isSending, setIsSending] = useState(false);

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch = 
      generateInvoiceNumber(payment).toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.stripe_payment_intent_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesMethod = methodFilter === "all" || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  }) || [];

  const totalPaid = filteredPayments
    .filter(p => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const openEmailDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setRecipientEmail("");
    setRecipientName("");
    setEmailDialogOpen(true);
  };

  const sendInvoiceEmail = async () => {
    if (!selectedPayment || !recipientEmail) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          recipientEmail,
          recipientName: recipientName || undefined,
          invoiceNumber: generateInvoiceNumber(selectedPayment),
          invoiceDate: format(new Date(selectedPayment.created_at), "MMMM d, yyyy"),
          amount: selectedPayment.amount_cents / 100,
          currency: selectedPayment.currency,
          description: selectedPayment.description || "Subscription Payment",
          paymentMethod: selectedPayment.payment_method,
          status: selectedPayment.status,
          transactionId: selectedPayment.stripe_payment_intent_id || selectedPayment.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Invoice Sent",
        description: `Invoice sent successfully to ${recipientEmail}`,
      });
      setEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to Send Invoice",
        description: error.message || "An error occurred while sending the invoice",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">View and download your payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl">{payments?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl text-success">
              ${(totalPaid / 100).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Payments</CardDescription>
            <CardTitle className="text-2xl text-warning">
              {payments?.filter(p => p.status === "pending").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Download invoices as PDF or filter by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="succeeded">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[160px]">
                  <CreditCard className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="stripe">Credit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredPayments.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const status = statusConfig[payment.status] || statusConfig.pending;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {generateInvoiceNumber(payment)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {payment.description || "Subscription Payment"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {paymentMethodIcons[payment.payment_method]}
                            <span className="capitalize text-sm">
                              {payment.payment_method.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(payment.amount_cents / 100).toFixed(2)}
                          <span className="text-xs text-muted-foreground ml-1 uppercase">
                            {payment.currency}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEmailDialog(payment)}
                              className="gap-1"
                            >
                              <Mail className="h-4 w-4" />
                              Email
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateInvoicePDF(payment)}
                              className="gap-1"
                            >
                              <Download className="h-4 w-4" />
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No invoices found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" || methodFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Your payment history will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Invoice via Email
            </DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <>Send invoice <span className="font-mono font-medium">{generateInvoiceNumber(selectedPayment)}</span> to a customer</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email *</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="customer@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient Name (optional)</Label>
              <Input
                id="recipient-name"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            {selectedPayment && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">
                    ${(selectedPayment.amount_cents / 100).toFixed(2)} {selectedPayment.currency.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{format(new Date(selectedPayment.created_at), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={statusConfig[selectedPayment.status]?.variant || "secondary"} className="text-xs">
                    {statusConfig[selectedPayment.status]?.label || selectedPayment.status}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={sendInvoiceEmail} disabled={!recipientEmail || isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
