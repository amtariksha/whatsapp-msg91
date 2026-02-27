import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── POST /api/templates/local/[id]/submit ───────────────────
// Submit a local template to MSG91 for WhatsApp/Facebook approval
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91_AUTH_KEY not configured" },
            { status: 500 }
        );
    }

    // Fetch the local template
    const { data: template, error: fetchError } = await supabaseAdmin
        .from("templates_local")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !template) {
        return NextResponse.json(
            { error: "Template not found" },
            { status: 404 }
        );
    }

    if (template.status !== "draft" && template.status !== "rejected") {
        return NextResponse.json(
            { error: `Template is already ${template.status}. Only draft or rejected templates can be submitted.` },
            { status: 400 }
        );
    }

    // Build the MSG91 template payload
    // MSG91 API: POST https://api.msg91.com/api/v5/whatsapp/whatsapp-template/
    const components: Record<string, unknown>[] = [];

    // Header component (optional)
    if (template.header_type && template.header_content) {
        if (template.header_type === "TEXT") {
            components.push({
                type: "HEADER",
                format: "TEXT",
                text: template.header_content,
            });
        }
        // For media headers (IMAGE, VIDEO, DOCUMENT) the format is different
        // but text headers are the most common for initial implementation
    }

    // Body component (required)
    components.push({
        type: "BODY",
        text: template.body,
    });

    // Footer component (optional)
    if (template.footer) {
        components.push({
            type: "FOOTER",
            text: template.footer,
        });
    }

    // Buttons (optional)
    if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
        components.push({
            type: "BUTTONS",
            buttons: template.buttons,
        });
    }

    const msg91Payload = {
        name: template.name,
        category: template.category || "MARKETING",
        language: template.language || "en",
        components,
    };

    try {
        console.log("[Template Submit] Submitting to MSG91:", JSON.stringify(msg91Payload, null, 2));

        const response = await fetch(
            "https://api.msg91.com/api/v5/whatsapp/whatsapp-template/",
            {
                method: "POST",
                headers: {
                    authkey: authKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(msg91Payload),
            }
        );

        const responseText = await response.text();
        let responseData: any;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        console.log("[Template Submit] MSG91 response:", response.status, responseText);

        if (!response.ok) {
            console.error("[Template Submit] MSG91 HTTP error:", response.status, responseText);
            return NextResponse.json(
                {
                    error: "MSG91 rejected the template submission",
                    details: responseData,
                },
                { status: 502 }
            );
        }

        if (typeof responseData === "object" && responseData?.hasError) {
            console.error("[Template Submit] MSG91 API error:", responseText);
            return NextResponse.json(
                {
                    error: responseData.errors || "MSG91 returned an error",
                    details: responseData,
                },
                { status: 502 }
            );
        }

        // Extract MSG91 template ID from response
        const msg91TemplateId =
            responseData?.data?.id ||
            responseData?.data?.template_id ||
            responseData?.id ||
            responseData?.template_id ||
            null;

        // Update local template status to "pending" and store MSG91 ID
        const { error: updateError } = await supabaseAdmin
            .from("templates_local")
            .update({
                status: "pending",
                msg91_template_id: msg91TemplateId,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (updateError) {
            console.error("[Template Submit] DB update error:", updateError);
        }

        return NextResponse.json({
            success: true,
            status: "pending",
            msg91TemplateId,
            msg91Response: responseData,
        });
    } catch (err) {
        console.error("[Template Submit] Network error:", err);
        return NextResponse.json(
            { error: "Failed to connect to MSG91" },
            { status: 500 }
        );
    }
}
