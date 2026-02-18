"use client";

import { useRef, useEffect } from "react";
import {
    Check,
    CheckCheck,
    Clock,
    AlertCircle,
    FileText,
    Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useConversation, useUpdateConversationStatus } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { MessageComposer } from "./message-composer";
import type { Message, MessageStatus } from "@/lib/types";

function StatusIcon({ status }: { status: MessageStatus }) {
    switch (status) {
        case "sending":
            return <Clock className="w-3.5 h-3.5 text-slate-400" />;
        case "sent":
            return <Check className="w-3.5 h-3.5 text-slate-400" />;
        case "delivered":
            return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
        case "read":
            return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
        case "failed":
            return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
        default:
            return null;
    }
}

function MessageBubble({ message }: { message: Message }) {
    const isOutbound = message.direction === "outbound";
    const isNote = message.isInternalNote;
    const time = new Date(message.timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    return (
        <div
            className={cn(
                "flex w-full mb-2",
                isOutbound ? "justify-end" : "justify-start"
            )}
        >
            <div
                className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm relative",
                    isNote
                        ? "bg-amber-50 border border-amber-200"
                        : isOutbound
                            ? "bg-emerald-500 text-white rounded-br-md"
                            : "bg-white border border-slate-100 rounded-bl-md"
                )}
            >
                {isNote && (
                    <span className="text-[10px] font-semibold uppercase text-amber-600 block mb-1">
                        Internal Note
                    </span>
                )}

                {/* Content based on type */}
                {message.contentType === "image" && message.mediaUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                        <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                    </div>
                )}

                {message.contentType === "document" && (
                    <div
                        className={cn(
                            "flex items-center gap-2 mb-2 p-2 rounded-lg",
                            isOutbound ? "bg-emerald-600/30" : "bg-slate-50"
                        )}
                    >
                        <FileText className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm truncate">
                            {message.fileName || "Document"}
                        </span>
                    </div>
                )}

                <p
                    className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap",
                        isNote
                            ? "text-amber-900"
                            : isOutbound
                                ? "text-white"
                                : "text-slate-800"
                    )}
                >
                    {message.body}
                </p>

                <div
                    className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        isNote
                            ? "text-amber-500"
                            : isOutbound
                                ? "text-emerald-100"
                                : "text-slate-400"
                    )}
                >
                    <span className="text-[10px]">{time}</span>
                    {isOutbound && !isNote && <StatusIcon status={message.status} />}
                </div>
            </div>
        </div>
    );
}

export function ChatWindow() {
    const activeConversationId = useAppStore((s) => s.activeConversationId);
    const toggleContactPanel = useAppStore((s) => s.toggleContactPanel);
    const { data: conversation, isLoading } = useConversation(
        activeConversationId
    );
    const updateStatus = useUpdateConversationStatus();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation?.messages]);

    if (!activeConversationId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 text-slate-400">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <svg
                        className="w-10 h-10 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                </div>
                <p className="text-lg font-medium text-slate-500">
                    Select a conversation
                </p>
                <p className="text-sm mt-1">
                    Choose a chat from the list to start messaging
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50/50">
                <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50/50 text-slate-400">
                <p>Conversation not found</p>
            </div>
        );
    }

    const initials = conversation.contact.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/30">
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-16 bg-white border-b border-slate-200">
                <button
                    onClick={toggleContactPanel}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                    <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">
                            {conversation.contact.name}
                        </span>
                        <span className="text-xs text-slate-500">
                            +{conversation.contact.phone}
                        </span>
                    </div>
                </button>

                <div className="flex items-center gap-2">
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-xs",
                            conversation.status === "open"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-slate-100 text-slate-500"
                        )}
                    >
                        {conversation.status === "open" ? "Open" : "Resolved"}
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            updateStatus.mutate({
                                id: conversation.id,
                                status:
                                    conversation.status === "open" ? "resolved" : "open",
                            })
                        }
                        className={cn(
                            "text-xs h-8",
                            conversation.status === "open"
                                ? "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                : "text-blue-700 border-blue-200 hover:bg-blue-50"
                        )}
                    >
                        {conversation.status === "open" ? "Resolve" : "Reopen"}
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-5 py-4" ref={scrollRef}>
                <div className="space-y-1">
                    {conversation.messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </div>
            </ScrollArea>

            {/* Composer */}
            <MessageComposer conversation={conversation} />
        </div>
    );
}
