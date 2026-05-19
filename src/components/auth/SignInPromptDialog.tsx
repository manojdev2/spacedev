import { Link } from 'react-router-dom';
import { Heart, LogIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SignInPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

export function SignInPromptDialog({ open, onOpenChange, redirectTo = '/locator' }: SignInPromptDialogProps) {
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Save Your Favorite Locations</DialogTitle>
          <DialogDescription className="text-base">
            Sign in to save locations to your favorites and access them from any device.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button asChild variant="hero" size="lg" className="w-full">
            <Link to={loginUrl} onClick={() => onOpenChange(false)}>
              <LogIn className="h-5 w-5 mr-2" />
              Sign In
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-2">
          Don't have an account?{' '}
          <Link 
            to={loginUrl} 
            className="text-primary hover:underline font-medium"
            onClick={() => onOpenChange(false)}
          >
            Create one for free
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
