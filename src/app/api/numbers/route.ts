import { NextResponse } from "next/server";
import type { WhatsAppNumber } from "@/lib/types";

/**
 * GET /api/numbers
 * Parse MSG91_INTEGRATED_NUMBERS env var and return the list of configured numbers.
 * Format: "number:label,number:label" e.g. "919999999999:Sales,918888888888:Support"
 */
export async function GET() {
    const raw = process.env.MSG91_INTEGRATED_NUMBERS || "";

    const numbers: WhatsAppNumber[] = raw
        .split(",")
        .filter(Boolean)
        .map((entry, index) => {
            const [number, label] = entry.split(":");
            return {
                id: `num-${index}`,
                number: number.trim(),
                label: label?.trim() || `Number ${index + 1}`,
                isDefault: index === 0,
            };
        });

    return NextResponse.json(numbers);
}
