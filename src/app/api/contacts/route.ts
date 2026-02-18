import { NextRequest, NextResponse } from "next/server";
import type { Contact } from "@/lib/types";

// ─── In-memory contacts store ──────────────────────────────
const contacts: Contact[] = [
    {
        id: "c1",
        name: "Rahul Sharma",
        phone: "919876543210",
        email: "rahul@example.com",
        tags: ["VIP", "Returning"],
        createdAt: "2025-12-01T10:00:00Z",
    },
    {
        id: "c2",
        name: "Priya Patel",
        phone: "919876543211",
        email: "priya@example.com",
        tags: ["New"],
        createdAt: "2026-01-15T08:30:00Z",
    },
    {
        id: "c3",
        name: "Amit Kumar",
        phone: "919876543212",
        email: "amit@example.com",
        tags: ["Support"],
        createdAt: "2026-02-01T14:00:00Z",
    },
    {
        id: "c4",
        name: "Sneha Reddy",
        phone: "919876543213",
        email: "sneha@example.com",
        tags: ["VIP"],
        createdAt: "2026-02-10T09:00:00Z",
    },
    {
        id: "c5",
        name: "Vikram Singh",
        phone: "919876543214",
        email: "vikram@example.com",
        tags: ["Returning"],
        createdAt: "2026-01-20T11:00:00Z",
    },
];

// ─── GET /api/contacts ─────────────────────────────────────
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();

    let filtered = [...contacts];

    if (search) {
        filtered = filtered.filter(
            (c) =>
                c.name.toLowerCase().includes(search) ||
                c.phone.includes(search) ||
                c.email?.toLowerCase().includes(search)
        );
    }

    return NextResponse.json(filtered);
}

// ─── POST /api/contacts ────────────────────────────────────
export async function POST(request: NextRequest) {
    const body = await request.json();
    const newContact: Contact = {
        id: `c-${Date.now()}`,
        name: body.name || "Unknown",
        phone: body.phone,
        email: body.email || "",
        tags: body.tags || [],
        createdAt: new Date().toISOString(),
    };
    contacts.push(newContact);
    return NextResponse.json(newContact, { status: 201 });
}
