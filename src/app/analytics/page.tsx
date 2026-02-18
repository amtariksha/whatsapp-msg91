"use client";

import {
    BarChart3,
    MessageSquare,
    Users,
    CheckCircle2,
    TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
    {
        label: "Total Conversations",
        value: "1,284",
        change: "+12%",
        icon: MessageSquare,
        color: "from-blue-500 to-indigo-600",
        bg: "bg-blue-50",
        textColor: "text-blue-600",
    },
    {
        label: "Active Chats",
        value: "42",
        change: "+5%",
        icon: TrendingUp,
        color: "from-emerald-500 to-teal-600",
        bg: "bg-emerald-50",
        textColor: "text-emerald-600",
    },
    {
        label: "Resolved Today",
        value: "156",
        change: "+18%",
        icon: CheckCircle2,
        color: "from-violet-500 to-purple-600",
        bg: "bg-violet-50",
        textColor: "text-violet-600",
    },
    {
        label: "Total Contacts",
        value: "3,891",
        change: "+8%",
        icon: Users,
        color: "from-orange-500 to-red-500",
        bg: "bg-orange-50",
        textColor: "text-orange-600",
    },
];

export default function AnalyticsPage() {
    return (
        <div className="h-full overflow-auto p-6 bg-slate-50">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
                        <p className="text-sm text-slate-500">
                            Overview of your WhatsApp messaging performance
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat) => {
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
                                            <p className="text-xs text-emerald-600 mt-1 font-medium">
                                                {stat.change} from last week
                                            </p>
                                        </div>
                                        <div
                                            className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                                        >
                                            <Icon className={`w-5 h-5 ${stat.textColor}`} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Placeholder Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-slate-700">
                                Messages Over Time
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-48 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">Chart coming soon</p>
                                    <p className="text-xs mt-1">
                                        Connect a charting library to visualize data
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold text-slate-700">
                                Response Time Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-48 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">Chart coming soon</p>
                                    <p className="text-xs mt-1">
                                        Track average response times per agent
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
