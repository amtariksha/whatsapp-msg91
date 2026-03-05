import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrgId, orgError } from "@/lib/org-helpers";

// ─── GET /api/analytics — Org-scoped dashboard analytics ──
export async function GET(request: NextRequest) {
    const orgId = getOrgId(request);
    if (!orgId) return orgError();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
        // Run all queries in parallel
        const [
            totalConversationsRes,
            activeChatsRes,
            resolvedTodayRes,
            totalContactsRes,
            totalMessagesRes,
            paymentsRes,
            messagesOverTimeRes,
        ] = await Promise.all([
            // Total conversations
            supabaseAdmin
                .from("conversations")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", orgId),

            // Active (open) chats
            supabaseAdmin
                .from("conversations")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", orgId)
                .eq("status", "open"),

            // Resolved today
            supabaseAdmin
                .from("conversations")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", orgId)
                .eq("status", "resolved")
                .gte("updated_at", todayStart.toISOString()),

            // Total contacts
            supabaseAdmin
                .from("contacts")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", orgId),

            // Total messages in period
            supabaseAdmin
                .from("messages")
                .select("id, conversation_id", { count: "exact", head: true })
                .in(
                    "conversation_id",
                    (await supabaseAdmin
                        .from("conversations")
                        .select("id")
                        .eq("organization_id", orgId)
                    ).data?.map((c) => c.id) || []
                )
                .gte("created_at", since),

            // Payments summary
            supabaseAdmin
                .from("payments")
                .select("amount, payment_status")
                .eq("organization_id", orgId),

            // Messages over time (last N days, grouped by day)
            supabaseAdmin
                .from("messages")
                .select("created_at, direction")
                .in(
                    "conversation_id",
                    (await supabaseAdmin
                        .from("conversations")
                        .select("id")
                        .eq("organization_id", orgId)
                    ).data?.map((c) => c.id) || []
                )
                .gte("created_at", since)
                .order("created_at", { ascending: true }),
        ]);

        // Calculate payment stats
        const payments = paymentsRes.data || [];
        const paymentStats = {
            total: payments.reduce((s, p) => s + Number(p.amount), 0),
            paid: payments
                .filter((p) => p.payment_status === "paid")
                .reduce((s, p) => s + Number(p.amount), 0),
            paidCount: payments.filter((p) => p.payment_status === "paid").length,
            pendingCount: payments.filter(
                (p) => p.payment_status === "created" || p.payment_status === "unpaid"
            ).length,
        };

        // Group messages by day
        const messagesByDay: Record<string, { inbound: number; outbound: number }> = {};
        for (const msg of messagesOverTimeRes.data || []) {
            const day = new Date(msg.created_at).toISOString().split("T")[0];
            if (!messagesByDay[day]) messagesByDay[day] = { inbound: 0, outbound: 0 };
            messagesByDay[day][msg.direction as "inbound" | "outbound"]++;
        }

        const messagesOverTime = Object.entries(messagesByDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, counts]) => ({ date, ...counts }));

        return NextResponse.json({
            stats: {
                totalConversations: totalConversationsRes.count || 0,
                activeChats: activeChatsRes.count || 0,
                resolvedToday: resolvedTodayRes.count || 0,
                totalContacts: totalContactsRes.count || 0,
                totalMessages: totalMessagesRes.count || 0,
            },
            payments: paymentStats,
            messagesOverTime,
        });
    } catch (err) {
        console.error("Analytics error:", err);
        return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
    }
}
