"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { SendMessagePayload, Message, Conversation, CreatePaymentPayload } from "./types";
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

// ─── Assign Conversation ───────────────────────────────────
export function useAssignConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
            api.assignConversation(id, userId),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["conversation"] });
        },
    });
}

// ─── Users ─────────────────────────────────────────────────
export function useUsers() {
    return useQuery({
        queryKey: ["users"],
        queryFn: api.getUsers,
        staleTime: 60 * 1000,
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

// ─── Quick Replies ─────────────────────────────────────────
export function useQuickReplies() {
    return useQuery({
        queryKey: ["quick-replies"],
        queryFn: api.getQuickReplies,
    });
}

export function useCreateQuickReply() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; body: string; shortcut?: string }) =>
            api.createQuickReply(data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
        },
    });
}

export function useDeleteQuickReply() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteQuickReply(id),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
        },
    });
}

// ─── Reminders ─────────────────────────────────────────────
export function useReminders() {
    return useQuery({
        queryKey: ["reminders"],
        queryFn: api.getReminders,
        refetchInterval: 30000, // check every 30s
    });
}

export function useCreateReminder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { conversationId: string; remindAt: string; note?: string }) =>
            api.createReminder(data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
        },
    });
}

export function useDismissReminder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.dismissReminder(id),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
        },
    });
}

// ─── Local Templates ───────────────────────────────────────
export function useLocalTemplates() {
    return useQuery({
        queryKey: ["local-templates"],
        queryFn: api.getLocalTemplates,
    });
}

export function useCreateLocalTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            category: string;
            language: string;
            headerText?: string;
            bodyText: string;
            footerText?: string;
        }) => api.createLocalTemplate(data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["local-templates"] });
        },
    });
}

export function useDeleteLocalTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteLocalTemplate(id),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["local-templates"] });
        },
    });
}

export function useSyncTemplates() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.syncTemplates(),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["local-templates"] });
            queryClient.invalidateQueries({ queryKey: ["templates"] });
        },
    });
}

// ─── Payments ──────────────────────────────────────────────
export function usePayments(params?: {
    status?: string;
    from?: string;
    to?: string;
}) {
    return useQuery({
        queryKey: ["payments", params],
        queryFn: () => api.getPayments(params),
        refetchInterval: 15000,
    });
}

export function useCreatePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreatePaymentPayload) =>
            api.createPayment(payload),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

export function useUpdatePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...payload }: { id: string; paymentStatus?: string; transactionRef?: string }) =>
            api.updatePayment(id, payload),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
        },
    });
}
