"use client";

import { useState } from "react";
import { Mail, Phone, Tag, Plus, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useConversation, useUpdateContactTags } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";

export function ContactDetails() {
    const {
        activeConversationId,
        contactPanelOpen,
        setContactPanelOpen,
    } = useAppStore();
    const { data: conversation } = useConversation(activeConversationId);
    const updateTags = useUpdateContactTags();
    const [newTag, setNewTag] = useState("");

    if (!contactPanelOpen || !conversation) return null;

    const contact = conversation.contact;
    const initials = contact.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        const updatedTags = [...contact.tags, newTag.trim()];
        updateTags.mutate({ id: contact.id, tags: updatedTags });
        setNewTag("");
    };

    const handleRemoveTag = (tag: string) => {
        const updatedTags = contact.tags.filter((t) => t !== tag);
        updateTags.mutate({ id: contact.id, tags: updatedTags });
    };

    return (
        <div className="w-[300px] min-w-[300px] h-full border-l border-slate-200 bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">
                    Contact Details
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setContactPanelOpen(false)}
                    className="h-7 w-7 text-slate-400"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Profile */}
            <div className="flex flex-col items-center py-6 px-4">
                <Avatar className="w-16 h-16 mb-3">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xl font-semibold">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <h4 className="text-base font-semibold text-slate-900">
                    {contact.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                    Customer since{" "}
                    {new Date(contact.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                    })}
                </p>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="px-4 py-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
                        <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            Phone
                        </p>
                        <p className="text-sm text-slate-800">+{contact.phone}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50">
                        <Mail className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            Email
                        </p>
                        <p className="text-sm text-slate-800">
                            {contact.email || "Not provided"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50">
                        <User className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            WhatsApp Number
                        </p>
                        <p className="text-sm text-slate-800">
                            +{conversation.integratedNumber}
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Tags */}
            <div className="px-4 py-4 flex-1">
                <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Tags</p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                    {contact.tags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs h-6 bg-slate-50 border border-slate-200 hover:bg-slate-100 gap-1 pr-1"
                        >
                            {tag}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-0.5 hover:text-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                    {contact.tags.length === 0 && (
                        <p className="text-xs text-slate-400">No tags yet</p>
                    )}
                </div>

                {/* Add Tag */}
                <div className="flex items-center gap-1.5">
                    <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddTag();
                        }}
                        className="h-8 text-xs flex-1"
                    />
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                        className="h-8 w-8"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
