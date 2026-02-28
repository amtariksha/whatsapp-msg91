import { NextResponse } from "next/server";

// ─── GET /api/balance ─────────────────────────────────────
// Check MSG91 WhatsApp prepaid balance
export async function GET() {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91_AUTH_KEY not configured" },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(
            "https://api.msg91.com/api/v5/whatsapp/checkBalance",
            {
                method: "POST",
                headers: {
                    Authkey: authKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            }
        );

        const responseText = await response.text();
        console.log("[Balance] MSG91 response:", response.status, responseText);

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to check balance", details: responseText },
                { status: response.status }
            );
        }

        let data: any;
        try {
            data = JSON.parse(responseText);
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON response from MSG91", raw: responseText },
                { status: 502 }
            );
        }

        // Extract balance from various possible response shapes
        const balance =
            data?.balance ??
            data?.data?.balance ??
            data?.wallet_balance ??
            data?.data?.wallet_balance ??
            null;

        const currency =
            data?.currency ??
            data?.data?.currency ??
            "INR";

        return NextResponse.json({
            balance: balance !== null ? Number(balance) : null,
            currency,
            raw: data,
        });
    } catch (err) {
        console.error("[Balance] Error:", err);
        return NextResponse.json(
            { error: "Failed to check balance" },
            { status: 500 }
        );
    }
}
