import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function mapPayment(row: Record<string, unknown>) {
    return {
        id: row.id,
        contactId: row.contact_id || undefined,
        conversationId: row.conversation_id || undefined,
        contactName: row.contact_name,
        phone: row.phone,
        amount: Number(row.amount),
        currency: row.currency || "INR",
        description: row.description || undefined,
        razorpayLinkId: row.razorpay_link_id || undefined,
        razorpayPaymentId: row.razorpay_payment_id || undefined,
        shortUrl: row.short_url || undefined,
        transactionRef: row.transaction_ref || undefined,
        messageStatus: row.message_status || "pending",
        paymentStatus: row.payment_status || "created",
        createdBy: row.created_by || "Sales",
        integratedNumber: row.integrated_number || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ─── GET /api/payments ─────────────────────────────────────
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabaseAdmin
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

    if (status && status !== "all") {
        query = query.eq("payment_status", status);
    }

    if (from) {
        query = query.gte("created_at", from);
    }
    if (to) {
        query = query.lte("created_at", to);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Payments fetch error:", error);
        return NextResponse.json({
            payments: [],
            summary: {
                created: { count: 0, total: 0 },
                paid: { count: 0, total: 0 },
                unpaid: { count: 0, total: 0 },
                cancelled: { count: 0, total: 0 },
            },
        });
    }

    const payments = (data || []).map(mapPayment);

    // Calculate summary
    const summary = {
        created: { count: payments.length, total: payments.reduce((s, p) => s + p.amount, 0) },
        paid: {
            count: payments.filter((p) => p.paymentStatus === "paid").length,
            total: payments.filter((p) => p.paymentStatus === "paid").reduce((s, p) => s + p.amount, 0),
        },
        unpaid: {
            count: payments.filter((p) => p.paymentStatus === "unpaid" || p.paymentStatus === "created").length,
            total: payments
                .filter((p) => p.paymentStatus === "unpaid" || p.paymentStatus === "created")
                .reduce((s, p) => s + p.amount, 0),
        },
        cancelled: {
            count: payments.filter((p) => p.paymentStatus === "cancelled" || p.paymentStatus === "expired").length,
            total: payments
                .filter((p) => p.paymentStatus === "cancelled" || p.paymentStatus === "expired")
                .reduce((s, p) => s + p.amount, 0),
        },
    };

    return NextResponse.json({ payments, summary });
}

// ─── POST /api/payments ────────────────────────────────────
export async function POST(request: NextRequest) {
    const body = await request.json();
    const {
        contactName,
        phone,
        amount,
        description,
        contactId,
        conversationId,
        integratedNumber,
        sendViaWhatsApp,
    } = body;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayLinkId: string | null = null;
    let shortUrl: string | null = null;

    // ─── Create Razorpay Payment Link ────────────────────────
    if (keyId && keySecret) {
        try {
            const rpResponse = await fetch(
                "https://api.razorpay.com/v1/payment_links",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization:
                            "Basic " +
                            Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
                    },
                    body: JSON.stringify({
                        amount: Math.round(amount * 100), // Razorpay expects paise
                        currency: "INR",
                        description: description || `Payment from ${contactName}`,
                        customer: {
                            name: contactName,
                            contact: `+${phone.replace(/^\+/, "")}`,
                        },
                        notify: { sms: false, email: false }, // We send via WhatsApp
                        reminder_enable: true,
                        callback_url: "",
                        callback_method: "get",
                    }),
                }
            );

            if (rpResponse.ok) {
                const rpData = await rpResponse.json();
                razorpayLinkId = rpData.id;
                shortUrl = rpData.short_url;
            } else {
                const errorText = await rpResponse.text();
                console.error("Razorpay error:", errorText);
            }
        } catch (err) {
            console.error("Razorpay create link error:", err);
        }
    }

    // ─── Store in Supabase ───────────────────────────────────
    const { data: payment, error } = await supabaseAdmin
        .from("payments")
        .insert({
            contact_id: contactId || null,
            conversation_id: conversationId || null,
            contact_name: contactName,
            phone: phone.replace(/^\+/, ""),
            amount,
            currency: "INR",
            description: description || null,
            razorpay_link_id: razorpayLinkId,
            short_url: shortUrl,
            message_status: "pending",
            payment_status: "created",
            created_by: integratedNumber ? "Sales" : "Sales",
            integrated_number: integratedNumber || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Payment insert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ─── Optionally send payment link via WhatsApp ───────────
    if (sendViaWhatsApp && shortUrl && conversationId) {
        const msgAuthKey = process.env.MSG91_AUTH_KEY;
        const sendFromNumber = integratedNumber || process.env.MSG91_INTEGRATED_NUMBER || "919999999999";
        const cleanPhone = phone.replace(/^\+/, "");
        const messageText = `💰 Payment Link\n\nAmount: ₹${amount.toLocaleString("en-IN")}\n${description ? `For: ${description}\n` : ""}\nPay here: ${shortUrl}`;

        let sendStatus: "sent" | "failed" = "failed";
        let providerMessageId: string | undefined;

        if (msgAuthKey) {
            try {
                const response = await fetch(
                    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
                    {
                        method: "POST",
                        headers: {
                            authkey: msgAuthKey,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            integrated_number: sendFromNumber,
                            content_type: "text",
                            recipient_number: cleanPhone,
                            payload: {
                                type: "text",
                                text: { body: messageText },
                            },
                        }),
                    }
                );

                const responseText = await response.text();
                let responseData: any;
                try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }

                if (!response.ok) {
                    console.error("[Payment WA Send] MSG91 HTTP error:", response.status, responseText);
                } else if (typeof responseData === "object" && responseData !== null && responseData.hasError) {
                    console.error("[Payment WA Send] MSG91 API error:", responseText);
                } else {
                    console.log("[Payment WA Send] MSG91 success:", responseText);
                    sendStatus = "sent";
                    providerMessageId = responseData?.data?.requestId
                        || responseData?.requestId
                        || responseData?.data?.request_id;
                }
            } catch (err) {
                console.error("[Payment WA Send] Network error:", err);
            }
        } else {
            console.error("[Payment WA Send] MSG91_AUTH_KEY not configured");
        }

        // Persist the payment link message
        await supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            direction: "outbound",
            content_type: "text",
            body: `💰 Payment Link — ₹${amount.toLocaleString("en-IN")}${description ? ` (${description})` : ""}\n${shortUrl}`,
            status: sendStatus,
            is_internal_note: false,
            integrated_number: sendFromNumber,
            external_id: providerMessageId || null,
            request_id: providerMessageId || null,
        });

        // Update conversation last message
        await supabaseAdmin
            .from("conversations")
            .update({
                last_message: `💰 Payment: ₹${amount.toLocaleString("en-IN")}`,
                last_message_time: new Date().toISOString(),
            })
            .eq("id", conversationId);

        // Update payment message status
        await supabaseAdmin
            .from("payments")
            .update({ message_status: sendStatus })
            .eq("id", payment.id);
    }

    return NextResponse.json(mapPayment(payment), { status: 201 });
}
