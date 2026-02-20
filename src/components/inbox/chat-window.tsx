"use client";

import { useRef, useEffect, useState } from "react";
import {
    Check,
    CheckCheck,
    Clock,
    AlertCircle,
    FileText,
    Image as ImageIcon,
    UserPlus,
    XCircle,
    Bell,
    ChevronDown,
    MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    useConversation,
    useUpdateConversationStatus,
    useAssignConversation,
    useUsers,
} from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/components/auth-provider";
import { MessageComposer } from "./message-composer";
import { ReminderDialog } from "./reminder-dialog";
import type { Message, MessageStatus } from "@/lib/types";
import { SessionTimer } from "./session-timer";

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
                            ? "bg-[#dcf8c6] text-slate-900 rounded-br-md"
                            : "bg-white border border-slate-200 text-slate-900 rounded-bl-md"
                )}
            >
                {isNote && (
                    <span className="text-[10px] font-semibold uppercase text-amber-600 block mb-1">
                        Internal Note
                    </span>
                )}

                {/* Content based on type */}
                {message.contentType === "image" && message.mediaUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-slate-200/50">
                        <img src={message.mediaUrl} alt="uploaded content" className="w-full h-auto max-h-60 object-contain" />
                    </div>
                )}

                {message.contentType === "document" && (
                    <div
                        className={cn(
                            "flex items-center gap-2 mb-2 p-2 rounded-lg",
                            isOutbound ? "bg-black/5" : "bg-slate-50"
                        )}
                    >
                        <FileText className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm truncate">
                            {message.fileName || "Document"}
                        </span>
                    </div>
                )}

                {message.contentType === "interactive" && (
                    <div
                        className={cn(
                            "flex items-center gap-2 mb-2 p-2 rounded-lg",
                            isOutbound ? "bg-black/5 text-slate-800" : "bg-indigo-50 border border-indigo-100 text-indigo-700"
                        )}
                    >
                        <MessageSquareText className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">Interactive Message</span>
                    </div>
                )}

                {message.contentType === "location" && (
                    <div
                        className={cn(
                            "flex flex-col gap-1 mb-2 p-2 rounded-lg",
                            isOutbound ? "bg-black/5 text-slate-800" : "bg-slate-50 text-slate-800"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                            <span className="text-sm font-semibold">Location Shared</span>
                        </div>
                        {(() => {
                            try {
                                if (!isOutbound) {
                                    const parsed = JSON.parse(message.body);
                                    if (parsed.location?.latitude && parsed.location?.longitude) {
                                        return (
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${parsed.location.latitude},${parsed.location.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline mt-1 break-all"
                                            >
                                                View on Google Maps
                                            </a>
                                        );
                                    }
                                }
                            } catch (e) {
                                // Ignore JSON parse errors
                            }
                            return null;
                        })()}
                    </div>
                )}

                {message.contentType === "contact" && (
                    <div
                        className={cn(
                            "flex flex-col gap-1 mb-2 p-2 rounded-lg",
                            isOutbound ? "bg-black/5 text-slate-800" : "bg-slate-50 text-slate-800"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            <span className="text-sm font-semibold">Contact Card</span>
                        </div>
                        {(() => {
                            try {
                                if (!isOutbound) {
                                    const parsed = JSON.parse(message.body);
                                    if (parsed.contacts?.[0]?.name?.formatted_name) {
                                        return (
                                            <div className="text-xs mt-1 bg-white/50 px-2 py-1 rounded border border-black/5">
                                                <p className="font-medium">{parsed.contacts[0].name.formatted_name}</p>
                                                {parsed.contacts[0].phones?.[0]?.phone && (
                                                    <p className="text-slate-600 mt-0.5">{parsed.contacts[0].phones[0].phone}</p>
                                                )}
                                            </div>
                                        );
                                    }
                                }
                            } catch (e) {
                                // Ignore
                            }
                            return null;
                        })()}
                    </div>
                )}

                <p
                    className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap",
                        isNote
                            ? "text-amber-900"
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
                                ? "text-emerald-700/70"
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
    const assignConversation = useAssignConversation();
    const { data: users } = useUsers();
    const { user: currentUser } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showAssignMenu, setShowAssignMenu] = useState(false);
    const [showReminderDialog, setShowReminderDialog] = useState(false);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation?.messages]);

    // Close assignment menu when clicking outside
    useEffect(() => {
        if (!showAssignMenu) return;
        const handleClick = () => setShowAssignMenu(false);
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [showAssignMenu]);

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

    const isAssignedToMe = conversation.assignedTo === currentUser?.id;
    const isAdmin = currentUser?.role === "admin";
    const canClose = isAssignedToMe || isAdmin;
    const activeUsers = users?.filter((u) => u.isActive) || [];

    const handleAssign = (userId: string | null) => {
        assignConversation.mutate({ id: conversation.id, userId });
        setShowAssignMenu(false);
    };

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
                    <div className="flex flex-col items-start bg-transparent">
                        <span className="text-sm font-semibold text-slate-900">
                            {conversation.contact.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">
                                +{conversation.contact.phone}
                            </span>
                            {/* Session Timer */}
                            {conversation.lastIncomingTimestamp && (
                                <SessionTimer
                                    lastIncomingTimestamp={conversation.lastIncomingTimestamp}
                                    className="w-3.5 h-3.5"
                                    showLabel={false}
                                />
                            )}
                        </div>
                    </div>
                </button>

                <div className="flex items-center gap-2">
                    {/* Assigned badge */}
                    {conversation.assignedUser && (
                        <Badge
                            variant="secondary"
                            className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                            <UserPlus className="w-3 h-3 mr-1" />
                            {conversation.assignedUser.name}
                        </Badge>
                    )}

                    {/* Assignment dropdown */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAssignMenu(!showAssignMenu);
                            }}
                            className="text-xs h-8 gap-1"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Assign
                            <ChevronDown className="w-3 h-3" />
                        </Button>

                        {showAssignMenu && (
                            <div
                                className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Assign to me */}
                                {!isAssignedToMe && currentUser && (
                                    <button
                                        onClick={() => handleAssign(currentUser.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 text-emerald-700 font-medium flex items-center gap-2"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Assign to me
                                    </button>
                                )}

                                {conversation.assignedTo && (
                                    <button
                                        onClick={() => handleAssign(null)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Unassign
                                    </button>
                                )}

                                <div className="border-t border-slate-100 my-1" />

                                {activeUsers
                                    .filter((u) => u.id !== conversation.assignedTo)
                                    .map((u) => (
                                        <button
                                            key={u.id}
                                            onClick={() => handleAssign(u.id)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
                                        >
                                            {u.name}
                                            <span className="text-xs text-slate-400 ml-1">
                                                ({u.role})
                                            </span>
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Reminder button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReminderDialog(true)}
                        className="text-xs h-8"
                        title="Set Reminder"
                    >
                        <Bell className="w-3.5 h-3.5" />
                    </Button>

                    {/* Status badge */}
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

                    {/* Close / Reopen button */}
                    {conversation.status === "open" ? (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!canClose}
                            onClick={() =>
                                updateStatus.mutate({
                                    id: conversation.id,
                                    status: "resolved",
                                })
                            }
                            className={cn(
                                "text-xs h-8",
                                canClose
                                    ? "text-red-600 border-red-200 hover:bg-red-50"
                                    : "text-slate-400 border-slate-200 cursor-not-allowed"
                            )}
                            title={
                                canClose
                                    ? "Close this conversation"
                                    : "Only the assigned user or admin can close"
                            }
                        >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Close
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                updateStatus.mutate({
                                    id: conversation.id,
                                    status: "open",
                                })
                            }
                            className="text-xs h-8 text-blue-700 border-blue-200 hover:bg-blue-50"
                        >
                            Reopen
                        </Button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4" ref={scrollRef}>
                <div className="space-y-1">
                    {conversation.messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </div>
            </div>

            {/* Composer */}
            <MessageComposer conversation={conversation} />

            {/* Reminder Dialog */}
            {showReminderDialog && (
                <ReminderDialog
                    conversationId={conversation.id}
                    onClose={() => setShowReminderDialog(false)}
                />
            )}
        </div>
    );
}
