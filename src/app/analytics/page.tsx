"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    MessageSquare,
    Users,
    CheckCircle2,
    TrendingUp,
    IndianRupee,
    Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface AnalyticsData {
    stats: {
        totalConversations: number;
        activeChats: number;
        resolvedToday: number;
        totalContacts: number;
        totalMessages: number;
    };
    payments: {
        total: number;
        paid: number;
        paidCount: number;
        pendingCount: number;
    };
    messagesOverTime: Array<{
        date: string;
        inbound: number;
        outbound: number;
    }>;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/analytics?days=${days}`);
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (e) {
                console.error("Failed to fetch analytics:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [days]);

    const statCards = data
        ? [
              {
                  label: "Total Conversations",
                  value: data.stats.totalConversations.toLocaleString(),
                  icon: MessageSquare,
                  bg: "bg-blue-50",
                  textColor: "text-blue-600",
              },
              {
                  label: "Active Chats",
                  value: data.stats.activeChats.toLocaleString(),
                  icon: TrendingUp,
                  bg: "bg-emerald-50",
                  textColor: "text-emerald-600",
              },
              {
                  label: "Resolved Today",
                  value: data.stats.resolvedToday.toLocaleString(),
                  icon: CheckCircle2,
                  bg: "bg-violet-50",
                  textColor: "text-violet-600",
              },
              {
                  label: "Total Contacts",
                  value: data.stats.totalContacts.toLocaleString(),
                  icon: Users,
                  bg: "bg-orange-50",
                  textColor: "text-orange-600",
              },
          ]
        : [];

    // Format dates for chart labels
    const chartData = (data?.messagesOverTime || []).map((d) => ({
        ...d,
        date: new Date(d.date).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
        }),
    }));

    return (
        <div className="h-full overflow-auto p-6 bg-slate-50">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">
                                Analytics
                            </h1>
                            <p className="text-sm text-slate-500">
                                Overview of your WhatsApp messaging performance
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                        {[7, 30, 90].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    days === d
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {statCards.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <Card
                                        key={stat.label}
                                        className="border-slate-200 hover:shadow-md transition-shadow"
                                    >
                                        <CardContent className="pt-5 pb-5">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                                        {stat.label}
                                                    </p>
                                                    <p className="text-2xl font-bold text-slate-900">
                                                        {stat.value}
                                                    </p>
                                                </div>
                                                <div
                                                    className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                                                >
                                                    <Icon
                                                        className={`w-5 h-5 ${stat.textColor}`}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                            {/* Messages Over Time */}
                            <Card className="border-slate-200 lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold text-slate-700">
                                        Messages Over Time
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer
                                            width="100%"
                                            height={280}
                                        >
                                            <BarChart data={chartData}>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#e2e8f0"
                                                />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{
                                                        fontSize: 11,
                                                        fill: "#94a3b8",
                                                    }}
                                                    tickLine={false}
                                                    axisLine={{
                                                        stroke: "#e2e8f0",
                                                    }}
                                                />
                                                <YAxis
                                                    tick={{
                                                        fontSize: 11,
                                                        fill: "#94a3b8",
                                                    }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: "8px",
                                                        border: "1px solid #e2e8f0",
                                                        boxShadow:
                                                            "0 4px 6px -1px rgba(0,0,0,0.1)",
                                                    }}
                                                />
                                                <Legend />
                                                <Bar
                                                    dataKey="inbound"
                                                    name="Inbound"
                                                    fill="#10b981"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                                <Bar
                                                    dataKey="outbound"
                                                    name="Outbound"
                                                    fill="#6366f1"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-[280px] flex items-center justify-center text-slate-400">
                                            <div className="text-center">
                                                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                                <p className="text-sm">
                                                    No message data yet
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Payment Stats */}
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-sm font-semibold text-slate-700">
                                        Payment Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                                        <IndianRupee className="w-5 h-5 text-emerald-600" />
                                        <div>
                                            <p className="text-xs text-emerald-600 font-medium">
                                                Total Collected
                                            </p>
                                            <p className="text-lg font-bold text-emerald-700">
                                                {"\u20B9"}
                                                {(
                                                    data?.payments.paid || 0
                                                ).toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">
                                                Total Created
                                            </span>
                                            <span className="font-medium text-slate-800">
                                                {"\u20B9"}
                                                {(
                                                    data?.payments.total || 0
                                                ).toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">
                                                Paid
                                            </span>
                                            <span className="font-medium text-emerald-600">
                                                {data?.payments.paidCount || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">
                                                Pending
                                            </span>
                                            <span className="font-medium text-amber-600">
                                                {data?.payments.pendingCount ||
                                                    0}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-xs text-slate-400">
                                            {data?.stats.totalMessages?.toLocaleString() ||
                                                0}{" "}
                                            messages in last {days} days
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
