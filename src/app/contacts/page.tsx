"use client";

import { useState, useEffect } from "react";
import { Users, Search, Mail, Phone, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useContacts } from "@/lib/hooks";

export default function ContactsPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const { data, isLoading } = useContacts(search, page);

    const contacts = data?.contacts || [];
    const total = data?.total || 0;
    const limit = data?.limit || 25;
    const totalPages = Math.ceil(total / limit);

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1);
    }, [search]);

    const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1;
    const showingTo = Math.min(page * limit, total);

    return (
        <div className="h-full overflow-auto p-6 bg-slate-50">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Contacts</h1>
                            <p className="text-sm text-slate-500">
                                {total} contact{total !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, phone, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 bg-white border-slate-200"
                    />
                </div>

                {/* Contact List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-4">Contact</div>
                        <div className="col-span-3">Phone</div>
                        <div className="col-span-3">Email</div>
                        <div className="col-span-2">Tags</div>
                    </div>

                    <div className="min-h-[400px]">
                        {isLoading && !contacts.length ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                            </div>
                        ) : contacts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Users className="w-8 h-8 mb-2" />
                                <p className="text-sm">No contacts found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {contacts.map((contact) => {
                                    const initials = contact.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2);
                                    const colors = [
                                        "from-blue-500 to-indigo-600",
                                        "from-emerald-500 to-teal-600",
                                        "from-orange-500 to-red-500",
                                        "from-violet-500 to-purple-600",
                                        "from-pink-500 to-rose-600",
                                    ];
                                    const colorIndex =
                                        contact.name.charCodeAt(0) % colors.length;

                                    return (
                                        <div
                                            key={contact.id}
                                            className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="col-span-4 flex items-center gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarFallback
                                                        className={cn(
                                                            "bg-gradient-to-br text-white text-xs font-semibold",
                                                            colors[colorIndex]
                                                        )}
                                                    >
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium text-slate-900 truncate">
                                                    {contact.name}
                                                </span>
                                            </div>
                                            <div className="col-span-3 flex items-center gap-1.5 text-sm text-slate-600">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                +{contact.phone}
                                            </div>
                                            <div className="col-span-3 flex items-center gap-1.5 text-sm text-slate-600 truncate">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                {contact.email || "\u2014"}
                                            </div>
                                            <div className="col-span-2 flex flex-wrap gap-1">
                                                {contact.tags.map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="secondary"
                                                        className="text-[10px] h-5 bg-slate-100"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {total > 0 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30">
                            <p className="text-sm text-slate-500">
                                Showing {showingFrom}\u2013{showingTo} of {total}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="h-8 px-3 text-xs"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                    Previous
                                </Button>
                                <span className="text-sm text-slate-600 tabular-nums">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="h-8 px-3 text-xs"
                                >
                                    Next
                                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
