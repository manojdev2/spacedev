import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const demoOrgId = "11111111-1111-1111-1111-111111111111";
    const results: { email: string; status: string; error?: string }[] = [];

    // Demo users to create
    const demoUsers = [
      { email: "admin@demo.com", password: "Admin123!", role: "admin" as const },
      { email: "user@demo.com", password: "User123!", role: "staff" as const },
    ];

    for (const user of demoUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === user.email);

      if (existingUser) {
        // User exists, just ensure role is set
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert(
            {
              user_id: existingUser.id,
              organization_id: demoOrgId,
              role: user.role,
            },
            { onConflict: "user_id,organization_id" }
          );

        if (roleError) {
          // Try insert if upsert fails (no unique constraint on user_id, organization_id)
          await supabase.from("user_roles").insert({
            user_id: existingUser.id,
            organization_id: demoOrgId,
            role: user.role,
          });
        }

        results.push({ email: user.email, status: "exists", error: undefined });
        continue;
      }

      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (createError) {
        results.push({ email: user.email, status: "error", error: createError.message });
        continue;
      }

      if (newUser?.user) {
        // Assign role
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: newUser.user.id,
          organization_id: demoOrgId,
          role: user.role,
        });

        if (roleError) {
          results.push({ email: user.email, status: "created_no_role", error: roleError.message });
        } else {
          results.push({ email: user.email, status: "created" });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
