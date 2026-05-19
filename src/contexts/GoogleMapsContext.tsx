import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';

// Include all libraries needed across the app
const libraries: ('places' | 'geocoding' | 'drawing' | 'visualization')[] = ['places', 'geocoding', 'drawing', 'visualization'];

interface GoogleMapsContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKey: string | null;
  isApiKeyLoading: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
  apiKey: null,
  isApiKeyLoading: true,
});

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
}

interface GoogleMapsProviderProps {
  children: ReactNode;
}

/**
 * Inner component that actually loads the Google Maps API.
 * This is only rendered when we have a valid API key, ensuring
 * the loader is never initialized with an empty key.
 */
function GoogleMapsLoaderInner({ 
  apiKey, 
  children,
  onLoadStateChange,
}: { 
  apiKey: string; 
  children: ReactNode;
  onLoadStateChange: (isLoaded: boolean, error?: Error) => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    onLoadStateChange(isLoaded, loadError);
  }, [isLoaded, loadError, onLoadStateChange]);

  return <>{children}</>;
}

/**
 * Provider component that initializes Google Maps API once at the app level.
 * This prevents the "Loader must not be called again with different options" error
 * by ensuring there's only ONE instance of the loader across the entire app,
 * and that it's only initialized with a valid API key.
 */
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { apiKey, isLoading: isApiKeyLoading, error: apiKeyError } = useGoogleMapsApiKey();
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | undefined>(undefined);

  const handleLoadStateChange = (loaded: boolean, error?: Error) => {
    setIsLoaded(loaded);
    setLoadError(error);
  };

  const value: GoogleMapsContextValue = {
    isLoaded,
    loadError: loadError || (apiKeyError ? new Error(apiKeyError) : undefined),
    apiKey,
    isApiKeyLoading,
  };

  // Only render the loader component when we have a valid API key
  // This ensures useJsApiLoader is never called with an empty key
  if (apiKey && !isApiKeyLoading) {
    return (
      <GoogleMapsContext.Provider value={value}>
        <GoogleMapsLoaderInner 
          apiKey={apiKey} 
          onLoadStateChange={handleLoadStateChange}
        >
          {children}
        </GoogleMapsLoaderInner>
      </GoogleMapsContext.Provider>
    );
  }

  // Render without the loader while API key is loading
  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
}
