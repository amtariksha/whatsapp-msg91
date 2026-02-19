"use client";

import { useState } from "react";
import {
    IndianRupee,
    Plus,
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePayments } from "@/lib/hooks";
import { PaymentLinkDialog } from "@/components/payments/payment-link-dialog";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
    created: {
        label: "Created",
        color: "text-blue-700",
        bg: "bg-blue-100",
        icon: Clock,
    },
    paid: {
        label: "Paid",
        color: "text-emerald-700",
        bg: "bg-emerald-100",
        icon: CheckCircle2,
    },
    unpaid: {
        label: "Unpaid",
        color: "text-amber-700",
        bg: "bg-amber-100",
        icon: Clock,
    },
    cancelled: {
        label: "Cancelled",
        color: "text-red-700",
        bg: "bg-red-100",
        icon: XCircle,
    },
    expired: {
        label: "Expired",
        color: "text-slate-700",
        bg: "bg-slate-100",
        icon: XCircle,
    },
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
    }).format(amount);
}

export default function PaymentsPage() {
    const [statusFilter, setStatusFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const { data, isLoading } = usePayments({
        status: statusFilter,
    });

    const payments = data?.payments || [];
    const summary = data?.summary || {
        created: { count: 0, total: 0 },
        paid: { count: 0, total: 0 },
        unpaid: { count: 0, total: 0 },
        cancelled: { count: 0, total: 0 },
    };

    const summaryCards = [
        {
            label: "CREATED",
            icon: Plus,
            count: summary.created.count,
            total: summary.created.total,
            color: "text-blue-600",
            border: "border-blue-200",
        },
        {
            label: "PAID",
            icon: CheckCircle2,
            count: summary.paid.count,
            total: summary.paid.total,
            color: "text-emerald-600",
            border: "border-emerald-200",
        },
        {
            label: "UNPAID",
            icon: Clock,
            count: summary.unpaid.count,
            total: summary.unpaid.total,
            color: "text-amber-600",
            border: "border-amber-200",
        },
        {
            label: "CANCELLED",
            icon: XCircle,
            count: summary.cancelled.count,
            total: summary.cancelled.total,
            color: "text-red-600",
            border: "border-red-200",
        },
    ];

    return (
        <div className="h-full overflow-auto p-6 bg-slate-50">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Payments</h1>
                            <p className="text-sm text-slate-500">
                                Send payment links and track status
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setDialogOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Payment
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Card
                                key={card.label}
                                className={cn("border", card.border)}
                            >
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className={cn("w-4 h-4", card.color)} />
                                        <span className="text-[11px] font-semibold tracking-wider text-slate-500">
                                            {card.label}
                                        </span>
                                    </div>
                                    <p className="text-xl font-bold text-slate-900">
                                        {formatCurrency(card.total)}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        ({card.count})
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 mb-4">
                    {["all", "created", "paid", "unpaid", "cancelled"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize",
                                statusFilter === s
                                    ? "bg-emerald-500 text-white"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {s === "all" ? "All" : s}
                        </button>
                    ))}
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-3">Contact Name</div>
                        <div className="col-span-2">Mobile Number</div>
                        <div className="col-span-2">Created At</div>
                        <div className="col-span-1">Amount</div>
                        <div className="col-span-1">Created By</div>
                        <div className="col-span-1">Msg Status</div>
                        <div className="col-span-2">Payment Status</div>
                    </div>

                    <ScrollArea className="max-h-[calc(100vh-380px)]">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <CreditCard className="w-10 h-10 mb-3 opacity-40" />
                                <p className="text-sm font-medium">No payments yet</p>
                                <p className="text-xs mt-1">
                                    Click &ldquo;+ New Payment&rdquo; to create a payment link
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {payments.map((payment) => {
                                    const config = statusConfig[payment.paymentStatus] || statusConfig.created;
                                    const StatusIcon = config.icon;
                                    return (
                                        <div
                                            key={payment.id}
                                            className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="col-span-3 text-sm font-medium text-slate-900 truncate">
                                                {payment.contactName}
                                            </div>
                                            <div className="col-span-2 text-sm text-slate-600">
                                                +{payment.phone}
                                            </div>
                                            <div className="col-span-2 text-xs text-slate-500">
                                                {formatDistanceToNow(new Date(payment.createdAt), {
                                                    addSuffix: true,
                                                })}
                                            </div>
                                            <div className="col-span-1 text-sm font-semibold text-slate-900">
                                                {formatCurrency(payment.amount)}
                                            </div>
                                            <div className="col-span-1">
                                                <Badge variant="secondary" className="text-[10px] h-5">
                                                    {payment.createdBy}
                                                </Badge>
                                            </div>
                                            <div className="col-span-1">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-[10px] h-5",
                                                        payment.messageStatus === "sent"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-slate-100 text-slate-500"
                                                    )}
                                                >
                                                    {payment.messageStatus === "sent"
                                                        ? "✓ Sent"
                                                        : payment.messageStatus}
                                                </Badge>
                                            </div>
                                            <div className="col-span-2">
                                                <Badge
                                                    className={cn(
                                                        "text-[10px] h-6 gap-1 font-semibold",
                                                        config.bg,
                                                        config.color,
                                                        "border-0"
                                                    )}
                                                >
                                                    <StatusIcon className="w-3 h-3" />
                                                    {config.label}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            <PaymentLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
