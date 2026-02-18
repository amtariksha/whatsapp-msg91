"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { SendMessagePayload, Message, Conversation } from "./types";
import { generateId } from "./utils";
import { useAppStore } from "./store";
import { useEffect } from "react";

// ─── WhatsApp Numbers ──────────────────────────────────────
export function useNumbers() {
    const setNumbers = useAppStore((s) => s.setNumbers);

    const query = useQuery({
        queryKey: ["numbers"],
        queryFn: api.getNumbers,
        staleTime: Infinity, // numbers don't change during session
    });

    useEffect(() => {
        if (query.data) {
            setNumbers(query.data);
        }
    }, [query.data, setNumbers]);

    return query;
}

// ─── Conversations ─────────────────────────────────────────
export function useConversations(status?: string, search?: string) {
    return useQuery({
        queryKey: ["conversations", status, search],
        queryFn: () => api.getConversations(status, search),
        refetchInterval: 10000,
    });
}

export function useConversation(id: string | null) {
    return useQuery({
        queryKey: ["conversation", id],
        queryFn: () => api.getConversation(id!),
        enabled: !!id,
    });
}

// ─── Send Message with Optimistic Update ───────────────────
export function useSendMessage() {
    const queryClient = useQueryClient();
    const activeConversationId = useAppStore((s) => s.activeConversationId);

    return useMutation({
        mutationFn: (payload: SendMessagePayload) => api.sendMessage(payload),
        onMutate: async (payload) => {
            await queryClient.cancelQueries({
                queryKey: ["conversation", activeConversationId],
            });

            const previousConversation = queryClient.getQueryData([
                "conversation",
                activeConversationId,
            ]);

            const optimisticMessage: Message = {
                id: generateId(),
                conversationId: payload.conversationId,
                direction: "outbound",
                contentType: payload.contentType,
                body:
                    payload.contentType === "text"
                        ? payload.text
                        : `Template: ${(payload as { templateName: string }).templateName}`,
                status: "sending",
                isInternalNote: false,
                timestamp: new Date().toISOString(),
            };

            queryClient.setQueryData(
                ["conversation", activeConversationId],
                (old: Conversation | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        messages: [...old.messages, optimisticMessage],
                        lastMessage: optimisticMessage.body,
                        lastMessageTime: optimisticMessage.timestamp,
                    };
                }
            );

            return { previousConversation };
        },
        onError: (_err, _payload, context) => {
            if (context?.previousConversation) {
                queryClient.setQueryData(
                    ["conversation", activeConversationId],
                    context.previousConversation
                );
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ["conversation", activeConversationId],
            });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

// ─── Resolve/Reopen Conversation ───────────────────────────
export function useUpdateConversationStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.updateConversationStatus(id, status),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["conversation"] });
        },
    });
}

// ─── Contacts ──────────────────────────────────────────────
export function useContacts(search?: string) {
    return useQuery({
        queryKey: ["contacts", search],
        queryFn: () => api.getContacts(search),
    });
}

export function useUpdateContactTags() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
            api.updateContactTags(id, tags),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
            queryClient.invalidateQueries({ queryKey: ["conversation"] });
        },
    });
}

// ─── Templates ─────────────────────────────────────────────
export function useTemplates() {
    return useQuery({
        queryKey: ["templates"],
        queryFn: api.getTemplates,
        staleTime: 5 * 60 * 1000,
    });
}
