import { NextRequest, NextResponse } from "next/server";

// Reference the same mock data from parent route
// In a real app this would be a database
import type { Conversation } from "@/lib/types";

// We need a shared data store — for simplicity, re-import the mock data approach
// This duplicates slightly but keeps route handlers independent

function getConversationsStore(): Conversation[] {
    // In production, this would be a DB query
    // For now, we fetch from our own API to stay DRY
    return [];
}

/**
 * GET /api/conversations/[id]
 * Fetch a single conversation with its messages.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // Fetch from the conversations list endpoint
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/conversations`);
    const conversations: Conversation[] = await res.json();
    const conversation = conversations.find((c) => c.id === id);

    if (!conversation) {
        return NextResponse.json(
            { error: "Conversation not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(conversation);
}

/**
 * PATCH /api/conversations/[id]
 * Update conversation status (resolve/reopen).
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    // In a real app, update DB. For mock, just return the updated object.
    return NextResponse.json({
        id,
        status: body.status || "open",
        message: `Conversation ${id} updated`,
    });
}
