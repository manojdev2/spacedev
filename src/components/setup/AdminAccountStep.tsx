import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminAccountStepProps {
  onNext: (data: AdminData) => void;
  onBack: () => void;
  initialData?: AdminData;
}

export interface AdminData {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export function AdminAccountStep({ onNext, onBack, initialData }: AdminAccountStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    organizationName: initialData?.organizationName || '',
    adminName: initialData?.adminName || '',
    adminEmail: initialData?.adminEmail || '',
    adminPassword: initialData?.adminPassword || '',
    confirmPassword: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.organizationName.trim()) {
      setError('Organization name is required');
      return false;
    }
    if (formData.organizationName.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return false;
    }
    if (!formData.adminName.trim()) {
      setError('Admin name is required');
      return false;
    }
    if (!formData.adminEmail.trim()) {
      setError('Admin email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(formData.adminPassword)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[0-9]/.test(formData.adminPassword)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Validate email doesn't already exist by checking with complete-setup
      const { data, error: setupError } = await supabase.functions.invoke('complete-setup', {
        body: {
          organizationName: formData.organizationName.trim(),
          adminName: formData.adminName.trim(),
          adminEmail: formData.adminEmail.trim(),
          adminPassword: formData.adminPassword,
        },
      });

      if (setupError) {
        throw new Error(setupError.message || 'Failed to create admin account');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      onNext({
        organizationName: formData.organizationName.trim(),
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim(),
        adminPassword: formData.adminPassword,
      });
    } catch (err) {
      console.error('[AdminAccountStep] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create admin account');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.adminPassword;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strengthLevel = getPasswordStrength();
  const strengthColors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-500'];
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl">Create Super Admin Account</CardTitle>
        <CardDescription>
          Set up the primary administrator for your LocatePro installation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="organizationName">
            <Building2 className="w-4 h-4 inline mr-2" />
            Organization Name
          </Label>
          <Input
            id="organizationName"
            name="organizationName"
            placeholder="Your Company Name"
            value={formData.organizationName}
            onChange={handleInputChange}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminName">
            <User className="w-4 h-4 inline mr-2" />
            Admin Full Name
          </Label>
          <Input
            id="adminName"
            name="adminName"
            placeholder="John Smith"
            value={formData.adminName}
            onChange={handleInputChange}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminEmail">
            <Mail className="w-4 h-4 inline mr-2" />
            Admin Email
          </Label>
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            placeholder="admin@example.com"
            value={formData.adminEmail}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            A verification email will be sent to this address
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminPassword">
            <Lock className="w-4 h-4 inline mr-2" />
            Password
          </Label>
          <div className="relative">
            <Input
              id="adminPassword"
              name="adminPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={formData.adminPassword}
              onChange={handleInputChange}
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {formData.adminPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strengthLevel ? strengthColors[strengthLevel - 1] : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Password strength: {strengthLabels[Math.max(0, strengthLevel - 1)]}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            <Lock className="w-4 h-4 inline mr-2" />
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Admin'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
