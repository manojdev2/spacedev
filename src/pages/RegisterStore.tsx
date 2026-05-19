import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Store, MapPin, Phone, Mail, Globe, FileText, CheckCircle, Loader2, Navigation, Lock, CreditCard, LogIn, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { categoryLabels } from '@/data/demoData';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { AddressAutocomplete, AddressDetails } from '@/components/admin/AddressAutocomplete';
import { LocationFormMapPreview } from '@/components/admin/LocationFormMapPreview';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSubscription } from '@/hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';

const storeSubmissionSchema = z.object({
  business_name: z.string().trim().min(2, 'Business name must be at least 2 characters').max(100, 'Business name must be less than 100 characters'),
  contact_name: z.string().trim().min(2, 'Contact name must be at least 2 characters').max(100, 'Contact name must be less than 100 characters'),
  contact_email: z.string().trim().email('Please enter a valid email address').max(255, 'Email must be less than 255 characters'),
  contact_phone: z.string().trim().min(10, 'Please enter a valid phone number').max(20, 'Phone number must be less than 20 characters'),
  address: z.string().trim().min(5, 'Please enter a valid address').max(200, 'Address must be less than 200 characters'),
  city: z.string().trim().min(2, 'City must be at least 2 characters').max(100, 'City must be less than 100 characters'),
  state: z.string().trim().min(2, 'State must be at least 2 characters').max(100, 'State must be less than 100 characters'),
  zip_code: z.string().trim().min(3, 'Please enter a valid ZIP/Postal code').max(20, 'ZIP/Postal code must be less than 20 characters'),
  country: z.string().trim().min(2, 'Country must be at least 2 characters').max(100, 'Country must be less than 100 characters'),
  website: z.string().trim().url('Please enter a valid URL').optional().or(z.literal('')),
  category: z.string().min(1, 'Please select a category'),
  services: z.array(z.string()).optional(),
  additional_notes: z.string().trim().max(1000, 'Notes must be less than 1000 characters').optional(),
});

type StoreSubmissionForm = z.infer<typeof storeSubmissionSchema>;

const availableServices = [
  'In-Store Shopping',
  'Curbside Pickup',
  'Delivery',
  'Online Orders',
  'Repairs',
  'Returns',
  'Gift Wrapping',
  'Personal Shopping',
];

export default function RegisterStore() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isLoaded } = useGoogleMaps();
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { requestLocation, isLoading: isGettingLocation, latitude, longitude, error: geoError } = useGeolocation();
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();

  // Check authentication status
  const { data: session, isLoading: isLoadingAuth } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const isAuthenticated = !!session;
  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status);
  const isCheckingAccess = isLoadingAuth || isLoadingSubscription;

  // Handle geolocation result - update map and reverse geocode
  const handleUseMyLocation = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  // When geolocation returns coordinates, update the map and address
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedLocation({ lat: latitude, lng: longitude });
      reverseGeocode(latitude, longitude);
    }
  }, [latitude, longitude]);

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!isLoaded || !window.google) return;
    
    setIsGeocoding(true);
    const geocoder = new google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results[0]) {
        const result = response.results[0];
        const components = result.address_components;
        
        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let zipCode = '';
        let country = '';
        
        components.forEach((component) => {
          const types = component.types;
          if (types.includes('street_number')) streetNumber = component.long_name;
          if (types.includes('route')) route = component.long_name;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_1')) state = component.short_name;
          if (types.includes('postal_code')) zipCode = component.long_name;
          if (types.includes('country')) country = component.long_name;
        });
        
        const address = streetNumber ? `${streetNumber} ${route}` : route;
        
        form.setValue('address', address);
        form.setValue('city', city);
        form.setValue('state', state);
        form.setValue('zip_code', zipCode);
        form.setValue('country', country);
        
        toast({
          title: 'Address updated',
          description: address ? `${address}, ${city}` : 'Location coordinates updated',
        });
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handler for map position change (marker drag or map click) - debounced
  const handlePositionChange = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    
    // Clear any pending geocode request
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    
    // Debounce the reverse geocode to prevent toast spam during quick drags
    geocodeTimeoutRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 500);
  }, [isLoaded]);

  // Handler for address autocomplete selection
  const handleAddressSelect = (placeData: AddressDetails) => {
    form.setValue('address', placeData.address);
    form.setValue('city', placeData.city);
    form.setValue('state', placeData.state);
    form.setValue('zip_code', placeData.zipCode);
    form.setValue('country', placeData.country);
    
    // Store coordinates for map preview
    if (placeData.lat && placeData.lng) {
      setSelectedLocation({ lat: placeData.lat, lng: placeData.lng });
    }
  };

  const form = useForm<StoreSubmissionForm>({
    resolver: zodResolver(storeSubmissionSchema),
    defaultValues: {
      business_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'USA',
      website: '',
      category: 'retail',
      services: [],
      additional_notes: '',
    },
  });

  const onSubmit = async (data: StoreSubmissionForm) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('store_submissions')
        .insert({
          business_name: data.business_name,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          country: data.country,
          website: data.website || null,
          category: data.category,
          services: data.services || [],
          additional_notes: data.additional_notes || null,
          lat: selectedLocation?.lat || null,
          lng: selectedLocation?.lng || null,
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: 'Submission received!',
        description: 'We will review your store and get back to you soon.',
      });
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission failed',
        description: 'There was an error submitting your store. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - show sign in prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <LogIn className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to sign in to your account before you can register a store or store zone.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
            <Link to="/login">
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // No active subscription - show subscription prompt with trial option

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-free-trial');
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: 'Trial Started!',
        description: data.message || 'Your 14-day free trial has begun.',
      });
      
      // Refresh the page to update subscription status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Could not start trial',
        description: error.message || 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Start Your Free Trial</h1>
          <p className="text-muted-foreground mb-6">
            Try LocatePro free for 14 days. No credit card required. Register stores, manage store zones, and explore all features.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              onClick={handleStartTrial}
              disabled={isStartingTrial}
            >
              {isStartingTrial ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Trial...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start 14-Day Free Trial
                </>
              )}
            </Button>
          </div>
          
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Or choose a paid plan for full access
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/')}>
                Back to Home
              </Button>
              <Link to="/pricing">
                <Button variant="secondary">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Submission Received!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for registering your store. Our team will review your submission and get back to you within 2-3 business days.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
            <Button onClick={() => {
              setIsSubmitted(false);
              form.reset();
            }}>
              Submit Another Store
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <Store className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Register Your Store</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Submit your business to be listed on our store locator. Our team will review your submission and contact you shortly.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>
              Please provide accurate details about your business location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Business Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Business Details
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Business Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.yourbusiness.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Information
                  </h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone *
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@yourbusiness.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Store Location
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseMyLocation}
                      disabled={isGettingLocation}
                      className="flex items-center gap-2"
                    >
                      {isGettingLocation ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Getting location...
                        </>
                      ) : (
                        <>
                          <Navigation className="h-4 w-4" />
                          Use My Location
                        </>
                      )}
                    </Button>
                  </div>
                  {geoError && (
                    <p className="text-sm text-destructive">{geoError}</p>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <AddressAutocomplete
                            value={field.value}
                            onChange={field.onChange}
                            onPlaceSelect={handleAddressSelect}
                            placeholder="Start typing an address..."
                            required
                            isMapLoaded={isLoaded}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Map Preview */}
                  <div className="h-48 rounded-lg overflow-hidden border border-border relative">
                    <LocationFormMapPreview
                      lat={selectedLocation?.lat}
                      lng={selectedLocation?.lng}
                      isLoaded={isLoaded}
                      locationName="Selected Location"
                      onPositionChange={handlePositionChange}
                    />
                    {isGeocoding && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg shadow-sm border">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Updating address...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province *</FormLabel>
                          <FormControl>
                            <Input placeholder="NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP/Postal Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <Input placeholder="USA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Services Offered
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="services"
                    render={() => (
                      <FormItem>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {availableServices.map((service) => (
                            <FormField
                              key={service}
                              control={form.control}
                              name="services"
                              render={({ field }) => (
                                <FormItem
                                  key={service}
                                  className="flex flex-row items-center space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(service)}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        return checked
                                          ? field.onChange([...currentValue, service])
                                          : field.onChange(currentValue.filter((v) => v !== service));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    {service}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Notes */}
                <FormField
                  control={form.control}
                  name="additional_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information about your store..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Store className="h-5 w-5 mr-2" />
                      Submit Store for Review
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
