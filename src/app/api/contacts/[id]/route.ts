import { NextRequest, NextResponse } from "next/server";
import type { Contact } from "@/lib/types";

/**
 * GET /api/contacts/[id]
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/contacts`);
    const contacts: Contact[] = await res.json();
    const contact = contacts.find((c) => c.id === id);

    if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
}

/**
 * PATCH /api/contacts/[id]
 * Update contact tags.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    return NextResponse.json({
        id,
        tags: body.tags || [],
        message: `Contact ${id} updated`,
    });
}
