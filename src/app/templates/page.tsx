"use client";

import { useState, useEffect, Fragment } from "react";
import {
    Plus,
    FileText,
    RefreshCw,
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    MoreVertical,
    Eye,
    Pencil,
    Copy,
    Clipboard,
    Trash2,
    Send,
    CloudUpload,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TemplateFormDialog } from "@/components/templates/template-form-dialog";

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
    msg91TemplateId?: string;
    createdAt: string;
}

interface SyncedTemplate {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
}

/** Render template body with highlighted {{N}} variables as React elements */
function renderPreviewBody(text: string) {
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => {
        if (/^\{\{\d+\}\}$/.test(part)) {
            return (
                <span
                    key={i}
                    className="bg-emerald-200 text-emerald-800 px-0.5 rounded text-[10px] font-mono"
                >
                    {part}
                </span>
            );
        }
        return <Fragment key={i}>{part}</Fragment>;
    });
}

function StatusBadge({ status }: { status: string }) {
    const lower = status.toLowerCase();
    const config: Record<string, { bg: string; icon: React.ReactNode }> = {
        draft: { bg: "bg-slate-100 text-slate-600", icon: <Clock className="w-3 h-3" /> },
        pending: { bg: "bg-amber-50 text-amber-700", icon: <Clock className="w-3 h-3" /> },
        approved: { bg: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
        rejected: { bg: "bg-red-50 text-red-700", icon: <XCircle className="w-3 h-3" /> },
    };
    const { bg, icon } = config[lower] || config.draft;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${bg}`}>
            {icon}
            {status}
        </span>
    );
}

function CategoryBadge({ category }: { category: string }) {
    const colors: Record<string, string> = {
        MARKETING: "bg-purple-50 text-purple-700 border-purple-100",
        UTILITY: "bg-blue-50 text-blue-700 border-blue-100",
        AUTHENTICATION: "bg-orange-50 text-orange-700 border-orange-100",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${colors[category] || "bg-slate-50 text-slate-600 border-slate-100"}`}>
            {category}
        </span>
    );
}

const LANGUAGE_LABELS: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    ta: "Tamil",
    te: "Telugu",
    mr: "Marathi",
};

export default function TemplatesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"local" | "synced">("local");
    const [templates, setTemplates] = useState<LocalTemplate[]>([]);
    const [syncedTemplates, setSyncedTemplates] = useState<SyncedTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Form dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [editTemplate, setEditTemplate] = useState<LocalTemplate | null>(null);

    // View dialog state
    const [viewTemplate, setViewTemplate] = useState<LocalTemplate | null>(null);

    // Clipboard toast
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Submission state
    const [submittingId, setSubmittingId] = useState<string | null>(null);

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

    const handleSave = async (data: { name: string; category: string; language: string; body: string; footer: string; headerType?: string; headerContent?: string; buttons?: unknown[] }) => {
        if (editTemplate?.msg91TemplateId) {
            // Edit on MSG91 — use the remote edit route
            const res = await fetch(`/api/templates/local/${editTemplate.id}/edit-remote`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) {
                alert(`MSG91 edit failed: ${result.error || "Unknown error"}`);
                return;
            }
        } else if (editTemplate) {
            // Local-only edit
            await fetch(`/api/templates/local/${editTemplate.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        } else {
            // Create new
            await fetch("/api/templates/local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        }
        setEditTemplate(null);
        fetchLocalTemplates();
    };

    const handleEdit = (t: LocalTemplate) => {
        setEditTemplate(t);
        setFormOpen(true);
    };

    const handleNewTemplate = () => {
        setEditTemplate(null);
        setFormOpen(true);
    };

    const handleDuplicate = async (t: LocalTemplate) => {
        await fetch("/api/templates/local", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: `${t.name}_copy`,
                category: t.category,
                language: t.language,
                body: t.body,
                footer: t.footer || undefined,
            }),
        });
        fetchLocalTemplates();
    };

    const handleDelete = async (t: LocalTemplate) => {
        if (t.msg91TemplateId) {
            if (!confirm("Delete this template? This will also remove it from MSG91.")) return;
            await fetch(`/api/templates/local/${t.id}/delete-remote`, { method: "DELETE" });
        } else {
            if (!confirm("Delete this template?")) return;
            await fetch(`/api/templates/local/${t.id}`, { method: "DELETE" });
        }
        fetchLocalTemplates();
    };

    const handleEditRemote = async (t: LocalTemplate) => {
        // Opens the form dialog in edit mode — on save, sends to MSG91
        setEditTemplate(t);
        setFormOpen(true);
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSubmitForApproval = async (id: string) => {
        if (!confirm("Submit this template for Facebook/WhatsApp approval? Once submitted, it will be reviewed by Meta.")) return;
        setSubmittingId(id);
        try {
            const res = await fetch(`/api/templates/local/${id}/submit`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                alert(`Submission failed: ${data.error || "Unknown error"}`);
                return;
            }
            fetchLocalTemplates();
        } catch (e) {
            console.error("Submit failed:", e);
            alert("Failed to submit template. Please try again.");
        } finally {
            setSubmittingId(null);
        }
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
                    <Button
                        variant="outline"
                        onClick={handleSync}
                        disabled={syncing}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync from MSG91"}
                    </Button>
                    <Button
                        onClick={handleNewTemplate}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Plus className="w-4 h-4" />
                        New Template
                    </Button>
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

            {/* Local Templates — Grid Cards */}
            {activeTab === "local" && (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                            <FileText className="w-10 h-10 mb-3" />
                            <p className="text-sm font-medium">No local templates</p>
                            <p className="text-xs mt-1 mb-4">Create your first template to get started</p>
                            <Button
                                onClick={handleNewTemplate}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                size="sm"
                            >
                                <Plus className="w-4 h-4" />
                                Create Template
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((t) => (
                                <div
                                    key={t.id}
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                                >
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between p-4 pb-2">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-semibold text-slate-800 truncate font-mono">
                                                {t.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <CategoryBadge category={t.category} />
                                                <StatusBadge status={t.status} />
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 -mt-1 -mr-1">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                <DropdownMenuItem onClick={() => setViewTemplate(t)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(t)}>
                                                    <Pencil className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {t.msg91TemplateId && (
                                                    <DropdownMenuItem onClick={() => handleEditRemote(t)}>
                                                        <CloudUpload className="w-4 h-4 mr-2" />
                                                        Edit on MSG91
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => handleDuplicate(t)}>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                {(t.status === "draft" || t.status === "rejected") && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleSubmitForApproval(t.id)}
                                                        disabled={submittingId === t.id}
                                                    >
                                                        {submittingId === t.id ? (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4 mr-2" />
                                                        )}
                                                        {submittingId === t.id ? "Submitting..." : "Submit for Approval"}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => handleCopyId(t.id)}>
                                                    <Clipboard className="w-4 h-4 mr-2" />
                                                    {copiedId === t.id ? "Copied!" : "Copy ID"}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(t)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    {t.msg91TemplateId ? "Delete (MSG91 + Local)" : "Delete"}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Card Body — Preview */}
                                    <div className="px-4 pb-3 flex-1">
                                        <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                                            {renderPreviewBody(t.body)}
                                        </p>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="px-4 py-2.5 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                            {LANGUAGE_LABELS[t.language] || t.language}
                                        </span>
                                        {t.footer && (
                                            <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                {t.footer}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Synced Templates — Grid Cards */}
            {activeTab === "synced" && (
                <>
                    {syncedTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                            <RefreshCw className="w-10 h-10 mb-3" />
                            <p className="text-sm font-medium">No synced templates</p>
                            <p className="text-xs mt-1 mb-4">Click &quot;Sync from MSG91&quot; to fetch approved templates</p>
                            <Button
                                onClick={handleSync}
                                disabled={syncing}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                                Sync Now
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {syncedTemplates.map((t) => (
                                <div
                                    key={t.id}
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-slate-800 truncate font-mono">
                                            {t.name}
                                        </h3>
                                        <StatusBadge status={t.status} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CategoryBadge category={t.category} />
                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                            {LANGUAGE_LABELS[t.language] || t.language}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Template Form Dialog */}
            <TemplateFormDialog
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditTemplate(null);
                }}
                onSave={handleSave}
                initialData={editTemplate ? {
                    name: editTemplate.name,
                    category: editTemplate.category,
                    language: editTemplate.language,
                    body: editTemplate.body,
                    footer: editTemplate.footer || "",
                } : undefined}
                isEdit={!!editTemplate}
            />

            {/* View Template Dialog */}
            <Dialog open={!!viewTemplate} onOpenChange={(open) => { if (!open) setViewTemplate(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-base">
                            {viewTemplate?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {viewTemplate && (
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center gap-2">
                                <CategoryBadge category={viewTemplate.category} />
                                <StatusBadge status={viewTemplate.status} />
                                <span className="text-xs text-slate-400">
                                    {LANGUAGE_LABELS[viewTemplate.language] || viewTemplate.language}
                                </span>
                            </div>

                            {/* WhatsApp-style preview */}
                            <div className="rounded-xl bg-[#e5ddd5] p-4">
                                <div className="max-w-[300px]">
                                    <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
                                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                            {renderPreviewBody(viewTemplate.body)}
                                        </p>
                                        {viewTemplate.footer && (
                                            <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-1.5">
                                                {viewTemplate.footer}
                                            </p>
                                        )}
                                        <div className="flex justify-end mt-1">
                                            <span className="text-[10px] text-slate-400">12:00 PM</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        handleCopyId(viewTemplate.id);
                                    }}
                                    className="gap-1.5 text-xs"
                                >
                                    <Clipboard className="w-3.5 h-3.5" />
                                    {copiedId === viewTemplate.id ? "Copied!" : "Copy ID"}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setViewTemplate(null);
                                        handleEdit(viewTemplate);
                                    }}
                                    className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                </Button>
                                {(viewTemplate.status === "draft" || viewTemplate.status === "rejected") && (
                                    <Button
                                        size="sm"
                                        disabled={submittingId === viewTemplate.id}
                                        onClick={() => {
                                            handleSubmitForApproval(viewTemplate.id);
                                        }}
                                        className="gap-1.5 text-xs bg-blue-500 hover:bg-blue-600"
                                    >
                                        {submittingId === viewTemplate.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Send className="w-3.5 h-3.5" />
                                        )}
                                        {submittingId === viewTemplate.id ? "Submitting..." : "Submit for Approval"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
