import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

// ─── GET /api/logs ────────────────────────────────────────
// Fetch WhatsApp delivery logs from MSG91
export async function GET(request: NextRequest) {
    const { orgId } = getRequestContext(request.headers);
    const authKey = await getAppSetting("msg91_auth_key", process.env.MSG91_AUTH_KEY || "", orgId);
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91 Auth Key not configured. Set it in Settings or as MSG91_AUTH_KEY env variable." },
            { status: 500 }
        );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const phone = searchParams.get("phone") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");

    try {
        // Build filter body for MSG91 logs API
        const filterBody: Record<string, unknown> = {};
        if (from) filterBody.from_date = from;
        if (to) filterBody.to_date = to;
        if (phone) filterBody.phone = phone.replace(/^\+/, "");
        if (status && status !== "all") filterBody.status = status;
        filterBody.page = page;
        filterBody.limit = limit;

        const response = await fetch(
            "https://api.msg91.com/api/v5/whatsapp/logs",
            {
                method: "POST",
                headers: {
                    Authkey: authKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(filterBody),
            }
        );

        const responseText = await response.text();
        console.log("[Logs] MSG91 response status:", response.status);

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch logs from MSG91", details: responseText },
                { status: response.status }
            );
        }

        let data: any;
        try {
            data = JSON.parse(responseText);
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON response from MSG91" },
                { status: 502 }
            );
        }

        // Normalize the response — MSG91 may return different structures
        let rawLogs: any[] = [];
        let total = 0;

        if (Array.isArray(data)) {
            rawLogs = data;
            total = data.length;
        } else if (Array.isArray(data?.data)) {
            rawLogs = data.data;
            total = data.total || data.count || data.data.length;
        } else if (Array.isArray(data?.logs)) {
            rawLogs = data.logs;
            total = data.total || data.count || data.logs.length;
        } else if (data?.data && typeof data.data === "object" && !Array.isArray(data.data)) {
            // Some APIs return { data: { logs: [...], total: N } }
            if (Array.isArray(data.data.logs)) {
                rawLogs = data.data.logs;
                total = data.data.total || data.data.count || rawLogs.length;
            }
        }

        // Map to our log format
        const logs = rawLogs.map((log: any) => ({
            id: log.id || log._id || log.request_id || String(Math.random()),
            phone: log.phone || log.recipient || log.to || "",
            direction: log.direction || log.type || (log.sender ? "outbound" : "outbound"),
            status: log.status || log.delivery_status || "unknown",
            contentType: log.content_type || log.msg_type || log.type || "text",
            templateName: log.template_name || log.templateName || undefined,
            sentAt: log.sent_at || log.created_at || log.timestamp || log.createdAt || "",
            deliveredAt: log.delivered_at || log.deliveredAt || undefined,
            readAt: log.read_at || log.readAt || undefined,
            credits: log.credits || log.credit || log.cost || undefined,
        }));

        return NextResponse.json({
            logs,
            total,
            page,
            limit,
        });
    } catch (err) {
        console.error("[Logs] Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch logs" },
            { status: 500 }
        );
    }
}
