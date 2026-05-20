import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Github, Facebook, Instagram, Mail, Phone, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
const appLogo = '/logo.png';

const footerLinks = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Coverage Map', href: '/locator' },
    { label: 'Add Store Zone', href: '/register-store' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '/contact' },
  ],
  resources: [
    { label: 'Documentation', href: '#' },
    { label: 'Help Center', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Status', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Github, href: '#', label: 'GitHub' },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Successfully subscribed!",
      description: "Thank you for subscribing to our newsletter.",
    });
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link to="/" className="inline-flex mb-4">
              <motion.img
                src={appLogo}
                alt="Logo"
                className="h-8 w-auto dark:[filter:invert(1)_hue-rotate(180deg)]"
                whileHover={{ opacity: 0.8 }}
                transition={{ type: 'spring', stiffness: 400 }}
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              AI-powered store locator platform that helps businesses find locations, optimize service coverage, and make data-driven decisions.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 mb-6">
              <a href="mailto:hello@locatepro.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4" />
                hello@locatepro.com
              </a>
              <a href="tel:+1-800-555-0123" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                +1 (800) 555-0123
              </a>
            </div>

            {/* Newsletter Signup */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-foreground">
                Stay Updated
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Get the latest updates on location intelligence.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-10 bg-background"
                  disabled={isSubmitting}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isSubmitting}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>

            {/* Social Icons */}
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="p-2.5 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col gap-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} LocatePro. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Sitemap
              </Link>
              <Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-right">
            Made with ❤️ by codespace
          </p>
        </div>
      </div>
    </footer>
  );
}