import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { to, templateName, templateParams } = await req.json();

        const WHATSAPP_TOKEN = Deno.env.get("VITE_WHATSAPP_TOKEN");
        const WHATSAPP_PHONE_ID = Deno.env.get("VITE_WHATSAPP_PHONE_ID");
        const WHATSAPP_API_URL = `${Deno.env.get("VITE_WHATSAPP_API_URL")}/${WHATSAPP_PHONE_ID}/messages`;

        const supabase = createClient(
            Deno.env.get("VITE_SUPABASE_URL") ?? "",
            Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const messageBody = {
            messaging_product: "whatsapp",
            to: to,
            type: "template",
            template: {
                name: templateName, // e.g., "intern_acceptance"
                language: { code: "en" },
                components: [
                    {
                        type: "body",
                        parameters: templateParams.map(param => ({ type: "text", text: param })),
                    },
                ],
            },
        };

        const response = await fetch(WHATSAPP_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messageBody),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(responseData));
        }

        // Log success to whatsapp_logs
        await supabase.from("whatsapp_logs").insert({
            phone_number: to,
            message_type: templateName,
            status: "sent",
        });

        return new Response(JSON.stringify({ success: true, data: responseData }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        // Log failure
        // In a real app, you'd parse `to` and `templateName` from the erroring request
        // For now, logging the error is sufficient.
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});