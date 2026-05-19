import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendWhatsAppRequest {
  phone: string;
  message: string;
  notificationType: 'store_alert' | 'appointment_reminder' | 'submission_update' | 'verification' | 'marketing';
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface EvolutionAPIResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
  };
  messageTimestamp: string;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!EVOLUTION_API_URL) {
      throw new Error("EVOLUTION_API_URL is not configured");
    }
    
    // Normalize URL - remove trailing slash to prevent double slashes
    const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, '');
    if (!EVOLUTION_API_KEY) {
      throw new Error("EVOLUTION_API_KEY is not configured");
    }
    if (!EVOLUTION_INSTANCE_NAME) {
      throw new Error("EVOLUTION_INSTANCE_NAME is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { phone, message, notificationType, userId, metadata }: SendWhatsAppRequest = await req.json();

    // Validate required fields
    if (!phone || !message || !notificationType) {
      throw new Error("Missing required fields: phone, message, notificationType");
    }

    // Format phone number (remove non-numeric characters except +)
    const formattedPhone = phone.replace(/[^\d]/g, '');

    // Log the notification attempt
    const { data: logEntry, error: logError } = await supabase
      .from('notification_logs')
      .insert({
        recipient_phone: formattedPhone,
        recipient_user_id: userId || null,
        notification_type: notificationType,
        message_content: message,
        status: 'pending',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    // Send message via Evolution API
    const evolutionResponse = await fetch(
      `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
          delay: 1000, // 1 second delay for natural feel
          linkPreview: true,
        }),
      }
    );

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      // Update log with failure
      if (logEntry) {
        await supabase
          .from('notification_logs')
          .update({
            status: 'failed',
            error_message: JSON.stringify(evolutionData),
          })
          .eq('id', logEntry.id);
      }
      throw new Error(`Evolution API error: ${JSON.stringify(evolutionData)}`);
    }

    const responseData = evolutionData as EvolutionAPIResponse;

    // Update log with success
    if (logEntry) {
      await supabase
        .from('notification_logs')
        .update({
          status: 'sent',
          external_message_id: responseData.key?.id || null,
        })
        .eq('id', logEntry.id);
    }

    console.log("WhatsApp message sent successfully:", responseData.key?.id);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.key?.id,
        timestamp: responseData.messageTimestamp,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-whatsapp function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
