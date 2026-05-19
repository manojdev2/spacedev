import { useState } from 'react';
import { Share2, Mail, Twitter, Facebook, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Location } from '@/types';
import { toast } from '@/hooks/use-toast';

interface ShareMenuProps {
  location: Location;
}

export function ShareMenu({ location }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/locator?location=${location.id}`;
  const shareTitle = `Check out ${location.name}`;
  const shareText = `${location.name} - ${location.address}, ${location.city}, ${location.state} ${location.zipCode}`;

  const handleEmailShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleTwitterShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'The location link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy the link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Share2 className="h-3.5 w-3.5" />
          <span className="sr-only">Share location</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
        <DropdownMenuItem onClick={handleEmailShare} className="cursor-pointer">
          <Mail className="h-4 w-4 mr-2" />
          Share via Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitterShare} className="cursor-pointer">
          <Twitter className="h-4 w-4 mr-2" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebookShare} className="cursor-pointer">
          <Facebook className="h-4 w-4 mr-2" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-success" />
          ) : (
            <Link2 className="h-4 w-4 mr-2" />
          )}
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
