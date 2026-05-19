import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Lock, User, Building2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/locatepro-logo.png';

export function SignupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const [formData, setFormData] = useState({
    organizationName: '',
    fullName: '',
    email: '',
    password: '',
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
    if (!formData.fullName.trim()) {
      setError('Your name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Sign up the user - the trigger will auto-create organization and assign admin role
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: formData.fullName.trim(),
            organization_name: formData.organizationName.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        setIsComplete(true);
        toast({
          title: 'Account Created!',
          description: 'Please check your email to verify your account.',
        });
      }
    } catch (err) {
      console.error('[Signup] Error:', err);
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="LocatePro" className="h-10" />
          </div>

          <Card className="border-2 border-accent/50">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl text-primary">Check Your Email!</CardTitle>
              <CardDescription className="text-base">
                We've sent a verification link to <span className="font-medium">{formData.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-2">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the verification link</li>
                  <li>Log in to access your dashboard</li>
                </ol>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full" size="lg">
                Go to Login
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the email?{' '}
                <button
                  type="button"
                  onClick={() => setIsComplete(false)}
                  className="text-primary hover:underline"
                >
                  Try again
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={logo} alt="LocatePro" className="h-10" />
          </Link>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Get started with LocatePro - set up your organization and manage your locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">
                  <User className="w-4 h-4 inline mr-2" />
                  Your Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="John Smith"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <Separator />
              <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
