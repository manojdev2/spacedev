import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUserOrganization() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('[useUserOrganization] No authenticated user');
          setOrganizationId(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        console.log('[useUserOrganization] User found:', user.id);

        // Fetch user's organization from user_roles table
        const { data, error: queryError } = await supabase
          .from('user_roles')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[useUserOrganization] Query result:', { data, queryError });

        if (queryError) {
          console.error('[useUserOrganization] Query error:', queryError);
          setError(queryError.message);
          setOrganizationId(null);
          setRole(null);
        } else if (data) {
          console.log('[useUserOrganization] Organization found:', data.organization_id);
          setOrganizationId(data.organization_id);
          setRole(data.role as 'admin' | 'staff');
        } else {
          console.log('[useUserOrganization] No role found for user');
          setOrganizationId(null);
          setRole(null);
          setError('No organization assigned to this user');
        }
      } catch (err) {
        console.error('[useUserOrganization] Catch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setOrganizationId(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useUserOrganization] Auth state changed:', event);
      fetchOrganization();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { organizationId, role, isLoading, error };
}
