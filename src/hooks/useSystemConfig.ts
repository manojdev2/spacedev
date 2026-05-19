import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppIdentityConfig {
  app_name: string;
  tagline: string;
  primary_color: string;
  website_url: string;
}

interface SystemSettingsConfig {
  default_language: string;
  default_timezone: string;
  distance_unit: 'miles' | 'kilometers';
  allow_public_submissions: boolean;
  require_approval: boolean;
}

interface EmailConfig {
  enabled: boolean;
  sender_name: string;
  sender_email: string;
  notify_on_submission: boolean;
  notify_on_approval: boolean;
}

interface SecurityConfig {
  require_email_verification: boolean;
  session_timeout: string;
  enforce_strong_passwords: boolean;
  enable_rate_limiting: boolean;
}

export interface SystemConfig {
  appIdentity: AppIdentityConfig | null;
  systemSettings: SystemSettingsConfig | null;
  emailConfig: EmailConfig | null;
  securityConfig: SecurityConfig | null;
}

interface UseSystemConfigReturn {
  config: SystemConfig;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSystemConfig(): UseSystemConfigReturn {
  const [config, setConfig] = useState<SystemConfig>({
    appIdentity: null,
    systemSettings: null,
    emailConfig: null,
    securityConfig: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['app_identity', 'system_settings', 'email_config', 'security_config']);

      if (fetchError) {
        throw fetchError;
      }

      const configMap: SystemConfig = {
        appIdentity: null,
        systemSettings: null,
        emailConfig: null,
        securityConfig: null,
      };

      data?.forEach((item) => {
        const value = item.value as Record<string, unknown>;
        switch (item.key) {
          case 'app_identity':
            configMap.appIdentity = value as unknown as AppIdentityConfig;
            break;
          case 'system_settings':
            configMap.systemSettings = value as unknown as SystemSettingsConfig;
            break;
          case 'email_config':
            configMap.emailConfig = value as unknown as EmailConfig;
            break;
          case 'security_config':
            configMap.securityConfig = value as unknown as SecurityConfig;
            break;
        }
      });

      setConfig(configMap);
    } catch (err) {
      console.error('[useSystemConfig] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}

// Convenience hooks for specific config sections
export function useAppIdentity() {
  const { config, isLoading, error } = useSystemConfig();
  return {
    appIdentity: config.appIdentity,
    appName: config.appIdentity?.app_name || 'LocatePro',
    tagline: config.appIdentity?.tagline || 'Find locations near you',
    primaryColor: config.appIdentity?.primary_color || '#3b82f6',
    websiteUrl: config.appIdentity?.website_url || '',
    isLoading,
    error,
  };
}

export function useSystemSettings() {
  const { config, isLoading, error } = useSystemConfig();
  return {
    settings: config.systemSettings,
    defaultLanguage: config.systemSettings?.default_language || 'en',
    defaultTimezone: config.systemSettings?.default_timezone || 'UTC',
    distanceUnit: config.systemSettings?.distance_unit || 'miles',
    allowPublicSubmissions: config.systemSettings?.allow_public_submissions ?? true,
    requireApproval: config.systemSettings?.require_approval ?? true,
    isLoading,
    error,
  };
}

export function useEmailConfig() {
  const { config, isLoading, error } = useSystemConfig();
  return {
    emailConfig: config.emailConfig,
    enabled: config.emailConfig?.enabled ?? false,
    senderName: config.emailConfig?.sender_name || 'LocatePro',
    senderEmail: config.emailConfig?.sender_email || '',
    notifyOnSubmission: config.emailConfig?.notify_on_submission ?? true,
    notifyOnApproval: config.emailConfig?.notify_on_approval ?? true,
    isLoading,
    error,
  };
}

export function useSecurityConfig() {
  const { config, isLoading, error } = useSystemConfig();
  return {
    securityConfig: config.securityConfig,
    requireEmailVerification: config.securityConfig?.require_email_verification ?? true,
    sessionTimeout: config.securityConfig?.session_timeout || '7d',
    enforceStrongPasswords: config.securityConfig?.enforce_strong_passwords ?? true,
    enableRateLimiting: config.securityConfig?.enable_rate_limiting ?? true,
    isLoading,
    error,
  };
}
