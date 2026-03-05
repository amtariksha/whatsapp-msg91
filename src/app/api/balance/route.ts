import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

// ─── GET /api/balance ─────────────────────────────────────
// Check MSG91 WhatsApp prepaid balance
export async function GET(request: NextRequest) {
    const { orgId } = getRequestContext(request.headers);
    const authKey = await getAppSetting("msg91_auth_key", process.env.MSG91_AUTH_KEY || "", orgId);
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91 Auth Key not configured. Set it in Settings or as MSG91_AUTH_KEY env variable." },
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
