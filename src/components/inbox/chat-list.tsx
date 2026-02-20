"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatChatTime, truncate } from "@/lib/utils";
import { useConversations } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import type { Conversation } from "@/lib/types";
import { SessionTimer } from "./session-timer";

export function ChatList() {
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    const { activeConversationId, setActiveConversation } = useAppStore();
    const { data: conversations, isLoading } = useConversations(status, search);

    return (
        <div className="flex flex-col h-full w-[340px] min-w-[340px] border-r border-slate-200 bg-white">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Messages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 border-b border-slate-100">
                <Tabs value={status} onValueChange={setStatus}>
                    <TabsList className="w-full h-9 bg-slate-100 p-0.5">
                        <TabsTrigger
                            value="all"
                            className="flex-1 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            All
                        </TabsTrigger>
                        <TabsTrigger
                            value="open"
                            className="flex-1 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            Open
                        </TabsTrigger>
                        <TabsTrigger
                            value="resolved"
                            className="flex-1 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            Resolved
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                    </div>
                ) : conversations?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Search className="w-8 h-8 mb-2" />
                        <p className="text-sm">No conversations found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {conversations?.map((conv) => (
                            <ConversationItem
                                key={conv.id}
                                conversation={conv}
                                isActive={conv.id === activeConversationId}
                                onClick={() => setActiveConversation(conv.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ConversationItem({
    conversation,
    isActive,
    onClick,
}: {
    conversation: Conversation;
    isActive: boolean;
    onClick: () => void;
}) {
    const initials = conversation.contact.name
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
        conversation.contact.name.charCodeAt(0) % colors.length;

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-slate-50",
                isActive && "bg-emerald-50/70 hover:bg-emerald-50/70 border-l-2 border-l-emerald-500"
            )}
        >
            <Avatar className="w-10 h-10 flex-shrink-0 mt-0.5">
                <AvatarFallback
                    className={cn(
                        "bg-gradient-to-br text-white text-xs font-semibold",
                        colors[colorIndex]
                    )}
                >
                    {initials}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span
                        className={cn(
                            "text-sm font-medium truncate",
                            isActive ? "text-emerald-900" : "text-slate-900"
                        )}
                    >
                        {conversation.contact.name}
                    </span>
                    <div className="flex items-center gap-1.5 ml-2">
                        {conversation.lastIncomingTimestamp && (
                            <SessionTimer
                                lastIncomingTimestamp={conversation.lastIncomingTimestamp}
                                className="w-2.5 h-2.5"
                                showLabel={false}
                            />
                        )}
                        <span className="text-xs text-slate-400 flex-shrink-0">
                            {formatChatTime(conversation.lastMessageTime)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate pr-2">
                        {truncate(conversation.lastMessage || "No messages yet", 35)}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 flex-shrink-0">
                            {conversation.unreadCount}
                        </Badge>
                    )}
                </div>

                {conversation.status === "resolved" && (
                    <Badge
                        variant="secondary"
                        className="mt-1 text-[10px] h-4 bg-slate-100 text-slate-500"
                    >
                        Resolved
                    </Badge>
                )}
                {conversation.assignedTo && (
                    <Badge
                        variant="secondary"
                        className="mt-1 text-[10px] h-4 bg-indigo-50 text-indigo-600 border border-indigo-100"
                    >
                        Assigned
                    </Badge>
                )}
            </div>
        </button>
    );
}
