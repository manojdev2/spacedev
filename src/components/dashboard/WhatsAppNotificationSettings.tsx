import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Phone, 
  Bell, 
  Store, 
  Calendar, 
  ClipboardCheck, 
  Megaphone,
  Send,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
  useSendVerificationCode,
  useVerifyPhoneNumber,
  useSendTestMessage,
} from '@/hooks/useNotificationPreferences';

const countryCodes = [
  { code: '+1', country: 'US/CA' },
  { code: '+44', country: 'UK' },
  { code: '+55', country: 'BR' },
  { code: '+91', country: 'IN' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+34', country: 'ES' },
  { code: '+39', country: 'IT' },
  { code: '+81', country: 'JP' },
  { code: '+86', country: 'CN' },
  { code: '+61', country: 'AU' },
  { code: '+52', country: 'MX' },
  { code: '+351', country: 'PT' },
];

export function WhatsAppNotificationSettings() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const savePreferences = useSaveNotificationPreferences();
  const sendVerificationCode = useSendVerificationCode();
  const verifyPhone = useVerifyPhoneNumber();
  const sendTest = useSendTestMessage();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [storeAlerts, setStoreAlerts] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [submissionUpdates, setSubmissionUpdates] = useState(true);
  const [marketingMessages, setMarketingMessages] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    if (preferences) {
      setPhoneNumber(preferences.phone_number);
      setCountryCode(preferences.phone_country_code);
      setWhatsappEnabled(preferences.whatsapp_enabled);
      setStoreAlerts(preferences.store_alerts);
      setAppointmentReminders(preferences.appointment_reminders);
      setSubmissionUpdates(preferences.submission_updates);
      setMarketingMessages(preferences.marketing_messages);
    }
  }, [preferences]);

  const handleSave = () => {
    savePreferences.mutate({
      phone_number: phoneNumber,
      phone_country_code: countryCode,
      whatsapp_enabled: whatsappEnabled,
      store_alerts: storeAlerts,
      appointment_reminders: appointmentReminders,
      submission_updates: submissionUpdates,
      marketing_messages: marketingMessages,
    });
  };

  const handleSendVerification = () => {
    sendVerificationCode.mutate(undefined, {
      onSuccess: () => setShowVerification(true),
    });
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      verifyPhone.mutate(verificationCode, {
        onSuccess: () => {
          setShowVerification(false);
          setVerificationCode('');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <MessageCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <CardTitle>WhatsApp Notifications</CardTitle>
            <CardDescription>
              Receive instant notifications via WhatsApp for store alerts and updates
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Number Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              WhatsApp Number
            </Label>
          {preferences?.verified ? (
              <Badge variant="default" className="bg-success text-success-foreground">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : preferences?.phone_number ? (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Verified
              </Badge>
            ) : null}
          </div>
          
          <div className="flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countryCodes.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} {c.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="tel"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              className="flex-1"
            />
          </div>

          {/* Verification Section */}
          {!preferences?.verified && phoneNumber && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              {!showVerification ? (
                <Button
                  variant="outline"
                  onClick={handleSendVerification}
                  disabled={sendVerificationCode.isPending || !phoneNumber}
                  className="w-full"
                >
                  {sendVerificationCode.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Send Verification Code
                </Button>
              ) : (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Enter the 6-digit code sent to your WhatsApp
                  </p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={setVerificationCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVerification(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleVerify}
                      disabled={verificationCode.length !== 6 || verifyPhone.isPending}
                      className="flex-1"
                    >
                      {verifyPhone.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <Separator />

        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Enable WhatsApp Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Turn on/off all WhatsApp notifications
            </p>
          </div>
          <Switch
            checked={whatsappEnabled}
            onCheckedChange={setWhatsappEnabled}
          />
        </div>

        {/* Notification Types */}
        <motion.div
          initial={false}
          animate={{ opacity: whatsappEnabled ? 1 : 0.5 }}
          className="space-y-4"
        >
          <Label className="text-sm font-medium text-muted-foreground">
            Notification Types
          </Label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Store Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    New stores nearby, promotions, hours changes
                  </p>
                </div>
              </div>
              <Switch
                checked={storeAlerts}
                onCheckedChange={setStoreAlerts}
                disabled={!whatsappEnabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Appointment Reminders</p>
                  <p className="text-xs text-muted-foreground">
                    Booking confirmations and reminders
                  </p>
                </div>
              </div>
              <Switch
                checked={appointmentReminders}
                onCheckedChange={setAppointmentReminders}
                disabled={!whatsappEnabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Submission Updates</p>
                  <p className="text-xs text-muted-foreground">
                    Store registration approval/rejection notices
                  </p>
                </div>
              </div>
              <Switch
                checked={submissionUpdates}
                onCheckedChange={setSubmissionUpdates}
                disabled={!whatsappEnabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Megaphone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Marketing Messages</p>
                  <p className="text-xs text-muted-foreground">
                    Promotions, tips, and updates (optional)
                  </p>
                </div>
              </div>
              <Switch
                checked={marketingMessages}
                onCheckedChange={setMarketingMessages}
                disabled={!whatsappEnabled}
              />
            </div>
          </div>
        </motion.div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSave}
            disabled={savePreferences.isPending || !phoneNumber}
            className="flex-1"
          >
            {savePreferences.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
          
          {preferences?.verified && (
            <Button
              variant="outline"
              onClick={() => sendTest.mutate()}
              disabled={sendTest.isPending}
            >
              {sendTest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test Message
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
