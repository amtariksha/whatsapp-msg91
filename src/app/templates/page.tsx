"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    FileText,
    RefreshCw,
    Trash2,
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    Pencil,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface LocalTemplate {
    id: string;
    name: string;
    category: string;
    language: string;
    body: string;
    status: string;
    headerType?: string;
    headerContent?: string;
    footer?: string;
    createdAt: string;
}

interface SyncedTemplate {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
}

export default function TemplatesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"local" | "synced">("local");
    const [templates, setTemplates] = useState<LocalTemplate[]>([]);
    const [syncedTemplates, setSyncedTemplates] = useState<SyncedTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [category, setCategory] = useState("MARKETING");
    const [language, setLanguage] = useState("en");
    const [body, setBody] = useState("");
    const [footer, setFooter] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchLocalTemplates = async () => {
        try {
            const res = await fetch("/api/templates/local");
            if (res.ok) setTemplates(await res.json());
        } catch (e) {
            console.error("Failed to fetch local templates:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/templates/sync", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setSyncedTemplates(data.templates || []);
                setActiveTab("synced");
            }
        } catch (e) {
            console.error("Sync failed:", e);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchLocalTemplates();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editId ? `/api/templates/local/${editId}` : "/api/templates/local";
            const method = editId ? "PATCH" : "POST";
            await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, category, language, body, footer: footer || undefined }),
            });
            resetForm();
            fetchLocalTemplates();
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (t: LocalTemplate) => {
        setEditId(t.id);
        setName(t.name);
        setCategory(t.category);
        setLanguage(t.language);
        setBody(t.body);
        setFooter(t.footer || "");
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this template?")) return;
        await fetch(`/api/templates/local/${id}`, { method: "DELETE" });
        fetchLocalTemplates();
    };

    const resetForm = () => {
        setShowForm(false);
        setEditId(null);
        setName("");
        setCategory("MARKETING");
        setLanguage("en");
        setBody("");
        setFooter("");
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: "bg-slate-100 text-slate-600",
            pending: "bg-amber-50 text-amber-700",
            approved: "bg-emerald-50 text-emerald-700",
            APPROVED: "bg-emerald-50 text-emerald-700",
            rejected: "bg-red-50 text-red-700",
            REJECTED: "bg-red-50 text-red-700",
        };
        const icons: Record<string, React.ReactNode> = {
            draft: <Clock className="w-3 h-3" />,
            pending: <Clock className="w-3 h-3" />,
            approved: <CheckCircle2 className="w-3 h-3" />,
            APPROVED: <CheckCircle2 className="w-3 h-3" />,
            rejected: <XCircle className="w-3 h-3" />,
            REJECTED: <XCircle className="w-3 h-3" />,
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}>
                {icons[status] || <Clock className="w-3 h-3" />}
                {status}
            </span>
        );
    };

    if (user?.role !== "admin") {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-slate-700">Admin Access Required</h2>
                    <p className="text-sm text-slate-500 mt-1">You need admin permissions to manage templates.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Template Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Create and manage message templates</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync from MSG91"}
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Template
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab("local")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "local"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    Local Templates ({templates.length})
                </button>
                <button
                    onClick={() => setActiveTab("synced")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "synced"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    Synced ({syncedTemplates.length})
                </button>
            </div>

            {/* Create / Edit Form */}
            {showForm && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">
                        {editId ? "Edit Template" : "New Template"}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="order_update"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                >
                                    <option value="MARKETING">Marketing</option>
                                    <option value="UTILITY">Utility</option>
                                    <option value="AUTHENTICATION">Authentication</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Language</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                >
                                    <option value="en">English</option>
                                    <option value="hi">Hindi</option>
                                    <option value="ta">Tamil</option>
                                    <option value="te">Telugu</option>
                                    <option value="mr">Marathi</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                Body <span className="text-slate-400">(use &#123;&#123;1&#125;&#125; for variables)</span>
                            </label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none min-h-[100px]"
                                placeholder="Hello {{1}}! Your order #{{2}} has been shipped."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Footer (optional)</label>
                            <input
                                type="text"
                                value={footer}
                                onChange={(e) => setFooter(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                placeholder="Reply STOP to unsubscribe"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : editId ? "Update" : "Create Draft"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Local Templates */}
            {activeTab === "local" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <FileText className="w-8 h-8 mb-2" />
                            <p className="text-sm">No local templates</p>
                            <p className="text-xs mt-1">Create your first template to get started</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Category</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Language</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((t) => (
                                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-5 py-3">
                                            <div>
                                                <span className="text-sm font-medium text-slate-800">{t.name}</span>
                                                <p className="text-xs text-slate-500 truncate max-w-[300px] mt-0.5">{t.body}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{t.category}</span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-600">{t.language}</td>
                                        <td className="px-5 py-3">{statusBadge(t.status)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(t)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Synced Templates */}
            {activeTab === "synced" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {syncedTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <RefreshCw className="w-8 h-8 mb-2" />
                            <p className="text-sm">No synced templates</p>
                            <p className="text-xs mt-1">Click &quot;Sync from MSG91&quot; to fetch approved templates</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Category</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Language</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {syncedTemplates.map((t) => (
                                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{t.name}</td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{t.category}</span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-600">{t.language}</td>
                                        <td className="px-5 py-3">{statusBadge(t.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
