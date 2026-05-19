-- Drop the existing SELECT policy on user_roles that has circular dependency
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;

-- Create a new policy that allows users to view their own role entry
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);