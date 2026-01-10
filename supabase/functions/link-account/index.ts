import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkAccountRequest {
  email: string;
  password: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Get the current user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get current user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: currentUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password }: LinkAccountRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a separate client to verify the credentials without affecting main session
    const verifyClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: signInData, error: signInError } = await verifyClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const linkedUserId = signInData.user.id;

    // Can't link to yourself
    if (linkedUserId === currentUser.id) {
      return new Response(
        JSON.stringify({ error: "Não é possível vincular a mesma conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to insert the link
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already linked
    const { data: existingLink } = await adminClient
      .from("linked_accounts")
      .select("id")
      .or(`and(primary_user_id.eq.${currentUser.id},linked_user_id.eq.${linkedUserId}),and(primary_user_id.eq.${linkedUserId},linked_user_id.eq.${currentUser.id})`)
      .maybeSingle();

    if (existingLink) {
      return new Response(
        JSON.stringify({ error: "Esta conta já está vinculada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count current links
    const { count } = await adminClient
      .from("linked_accounts")
      .select("id", { count: "exact" })
      .or(`primary_user_id.eq.${currentUser.id},linked_user_id.eq.${currentUser.id}`);

    if ((count || 0) >= 4) {
      return new Response(
        JSON.stringify({ error: "Limite máximo de 5 contas atingido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the link
    const { error: linkError } = await adminClient
      .from("linked_accounts")
      .insert({
        primary_user_id: currentUser.id,
        linked_user_id: linkedUserId,
      });

    if (linkError) {
      console.error("Error linking account:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao vincular conta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the linked user's profile (only safe data, no email)
    const { data: linkedProfile } = await adminClient
      .from("profiles")
      .select("id, username, avatar_url, user_code")
      .eq("id", linkedUserId)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        linkedProfile: linkedProfile ? {
          id: linkedProfile.id,
          email: '', // Don't expose email for security
          username: linkedProfile.username,
          avatar_url: linkedProfile.avatar_url,
          user_code: linkedProfile.user_code,
          isCurrentUser: false,
        } : null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in link-account function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
