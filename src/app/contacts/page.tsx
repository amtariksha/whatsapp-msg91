"use client";

import { useState } from "react";
import { Users, Search, Mail, Phone, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useContacts } from "@/lib/hooks";

export default function ContactsPage() {
    const [search, setSearch] = useState("");
    const { data: contacts, isLoading } = useContacts(search);

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
                                {contacts?.length || 0} contacts
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

                    <ScrollArea className="max-h-[calc(100vh-240px)]">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                            </div>
                        ) : contacts?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Users className="w-8 h-8 mb-2" />
                                <p className="text-sm">No contacts found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {contacts?.map((contact) => {
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
                                                {contact.email || "—"}
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
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
