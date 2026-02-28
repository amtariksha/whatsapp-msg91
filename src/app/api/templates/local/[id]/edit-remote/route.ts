import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── PUT /api/templates/local/[id]/edit-remote ────────────────
// Edit a template on MSG91 (already submitted/approved)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91_AUTH_KEY not configured" },
            { status: 500 }
        );
    }

    // Get the integrated number
    let integratedNumber = "";
    const { data: dbNumbers } = await supabaseAdmin
        .from("integrated_numbers")
        .select("number")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
    if (dbNumbers?.number) {
        integratedNumber = dbNumbers.number;
    } else {
        integratedNumber = (process.env.MSG91_INTEGRATED_NUMBER || "").replace(/^\+/, "");
        if (!integratedNumber) {
            const envNumbers = process.env.MSG91_INTEGRATED_NUMBERS || "";
            const firstEntry = envNumbers.split(",")[0] || "";
            integratedNumber = firstEntry.split(":")[0].trim().replace(/^\+/, "");
        }
    }

    // Fetch the local template
    const { data: template, error: fetchError } = await supabaseAdmin
        .from("templates_local")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (!template.msg91_template_id) {
        return NextResponse.json(
            { error: "Template has not been submitted to MSG91 yet. Submit it first." },
            { status: 400 }
        );
    }

    // Build MSG91 components from request body
    const components: Record<string, unknown>[] = [];

    if (body.headerType === "TEXT" && body.headerContent) {
        components.push({ type: "HEADER", format: "TEXT", text: body.headerContent });
    }

    components.push({ type: "BODY", text: body.body });

    if (body.footer) {
        components.push({ type: "FOOTER", text: body.footer });
    }

    if (body.buttons && Array.isArray(body.buttons) && body.buttons.length > 0) {
        components.push({ type: "BUTTONS", buttons: body.buttons });
    }

    const msg91Payload: Record<string, unknown> = {
        integrated_number: integratedNumber,
        components,
    };

    try {
        console.log("[Template Edit] Editing on MSG91:", template.msg91_template_id, JSON.stringify(msg91Payload, null, 2));

        const response = await fetch(
            `https://api.msg91.com/api/v5/whatsapp/whatsapp-template/${template.msg91_template_id}`,
            {
                method: "PUT",
                headers: {
                    Authkey: authKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(msg91Payload),
            }
        );

        const responseText = await response.text();
        let responseData: unknown;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        console.log("[Template Edit] MSG91 response:", response.status, responseText);

        if (!response.ok) {
            const msg91Error = typeof responseData === "object" && responseData !== null
                ? ((responseData as Record<string, unknown>)?.message || (responseData as Record<string, unknown>)?.errors || (responseData as Record<string, unknown>)?.error || responseText)
                : responseText;
            return NextResponse.json(
                {
                    error: `MSG91 error (${response.status}): ${typeof msg91Error === "string" ? msg91Error : JSON.stringify(msg91Error)}`,
                    details: responseData,
                },
                { status: 502 }
            );
        }

        if (typeof responseData === "object" && responseData !== null && (responseData as Record<string, unknown>)?.hasError) {
            const errData = responseData as Record<string, unknown>;
            const msg91Error = errData.errors || errData.message || "MSG91 returned an error";
            return NextResponse.json(
                {
                    error: typeof msg91Error === "string" ? msg91Error : JSON.stringify(msg91Error),
                    details: responseData,
                },
                { status: 502 }
            );
        }

        // Update local template with new content + set status to pending
        const updateData: Record<string, unknown> = {
            status: "pending",
            updated_at: new Date().toISOString(),
        };
        if (body.body !== undefined) updateData.body = body.body;
        if (body.headerType !== undefined) updateData.header_type = body.headerType;
        if (body.headerContent !== undefined) updateData.header_content = body.headerContent;
        if (body.footer !== undefined) updateData.footer = body.footer;
        if (body.buttons !== undefined) updateData.buttons = body.buttons;

        await supabaseAdmin
            .from("templates_local")
            .update(updateData)
            .eq("id", id);

        return NextResponse.json({
            success: true,
            status: "pending",
            msg91Response: responseData,
        });
    } catch (err) {
        console.error("[Template Edit] Network error:", err);
        return NextResponse.json(
            { error: "Failed to connect to MSG91" },
            { status: 500 }
        );
    }
}
