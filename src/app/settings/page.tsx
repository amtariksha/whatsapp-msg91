"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Shield,
    User,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Loader2,
    KeyRound,
    Zap,
    Pencil,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface UserRecord {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export default function SettingsPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);

    // ─── Form state ────────────────────────────────────────
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [userRole, setUserRole] = useState("agent");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // ─── Settings tab ───────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"users" | "quick-replies">("users");

    // ─── Reset password dialog ─────────────────────────────
    const [resetUserId, setResetUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState("");

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error("Failed to fetch users:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, userRole }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to create user");
                return;
            }

            setShowAddDialog(false);
            setName("");
            setEmail("");
            setPassword("");
            setUserRole("agent");
            fetchUsers();
        } catch {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (user: UserRecord) => {
        await fetch(`/api/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: !user.is_active }),
        });
        fetchUsers();
    };

    const toggleRole = async (user: UserRecord) => {
        const newRole = user.role === "admin" ? "agent" : "admin";
        await fetch(`/api/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
        });
        fetchUsers();
    };

    const deleteUser = async (user: UserRecord) => {
        if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
        await fetch(`/api/users/${user.id}`, { method: "DELETE" });
        fetchUsers();
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetUserId || !newPassword) return;

        await fetch(`/api/users/${resetUserId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: newPassword }),
        });
        setResetUserId(null);
        setNewPassword("");
    };

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-slate-700">
                        Admin Access Required
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        You need admin permissions to access settings.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Settings
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage users and quick replies
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab("users")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "users"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <User className="w-4 h-4 inline mr-2" />
                    Users
                </button>
                <button
                    onClick={() => setActiveTab("quick-replies")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "quick-replies"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Quick Replies
                </button>
            </div>

            {activeTab === "users" && (
                <>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setShowAddDialog(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add User
                        </button>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                                        Name
                                    </th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                                        Email
                                    </th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                                        Role
                                    </th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                                        Status
                                    </th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="text-center py-12 text-slate-400"
                                        >
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr
                                            key={u.id}
                                            className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                        <User className="w-4 h-4 text-emerald-700" />
                                                    </div>
                                                    <span className="font-medium text-slate-800 text-sm">
                                                        {u.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleRole(u)}
                                                    disabled={u.id === currentUser?.id}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${u.role === "admin"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-blue-100 text-blue-700"
                                                        } ${u.id === currentUser?.id ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
                                                >
                                                    <Shield className="w-3 h-3" />
                                                    {u.role}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleActive(u)}
                                                    disabled={u.id === currentUser?.id}
                                                    className={`inline-flex items-center gap-1.5 text-sm ${u.id === currentUser?.id
                                                        ? "opacity-60 cursor-not-allowed"
                                                        : "cursor-pointer"
                                                        }`}
                                                >
                                                    {u.is_active ? (
                                                        <>
                                                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                                                            <span className="text-emerald-700 font-medium text-xs">
                                                                Active
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                                                            <span className="text-slate-500 font-medium text-xs">
                                                                Disabled
                                                            </span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setResetUserId(u.id);
                                                            setNewPassword("");
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Reset password"
                                                    >
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                    {u.id !== currentUser?.id && (
                                                        <button
                                                            onClick={() => deleteUser(u)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ─── Add User Dialog ──────────────────────────── */}
                    {showAddDialog && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                                    Add New User
                                </h2>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 mb-4">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Name
                                        </label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                            placeholder="john@company.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                            placeholder="Minimum 6 characters"
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Role
                                        </label>
                                        <select
                                            value={userRole}
                                            onChange={(e) => setUserRole(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        >
                                            <option value="agent">Agent</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddDialog(false);
                                                setError("");
                                            }}
                                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                        >
                                            {saving && (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            )}
                                            {saving ? "Creating…" : "Create User"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ─── Reset Password Dialog ────────────────────── */}
                    {resetUserId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                                    Reset Password
                                </h2>
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            New Password
                                        </label>
                                        <input
                                            autoFocus
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                            placeholder="Minimum 6 characters"
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setResetUserId(null)}
                                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                                        >
                                            Reset Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === "quick-replies" && (
                <QuickRepliesTab />
            )}
        </div>
    );
}

// ─── Quick Replies Tab ────────────────────────────────────
function QuickRepliesTab() {
    const [quickReplies, setQuickReplies] = useState<{ id: string; title: string; body: string; shortcut?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [shortcut, setShortcut] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchReplies = async () => {
        try {
            const res = await fetch("/api/quick-replies");
            if (res.ok) setQuickReplies(await res.json());
        } catch (e) {
            console.error("Failed to fetch quick replies:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReplies(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editId ? `/api/quick-replies/${editId}` : "/api/quick-replies";
            const method = editId ? "PATCH" : "POST";
            await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body, shortcut: shortcut || undefined }),
            });
            resetForm();
            fetchReplies();
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (qr: { id: string; title: string; body: string; shortcut?: string }) => {
        setEditId(qr.id);
        setTitle(qr.title);
        setBody(qr.body);
        setShortcut(qr.shortcut || "");
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this quick reply?")) return;
        await fetch(`/api/quick-replies/${id}`, { method: "DELETE" });
        fetchReplies();
    };

    const resetForm = () => {
        setShowForm(false);
        setEditId(null);
        setTitle("");
        setBody("");
        setShortcut("");
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Quick Reply
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">
                        {editId ? "Edit Quick Reply" : "New Quick Reply"}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="e.g., Greeting"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Shortcut (optional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/</span>
                                    <input
                                        type="text"
                                        value={shortcut}
                                        onChange={(e) => setShortcut(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        placeholder="greeting"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none min-h-[80px]"
                                placeholder="Hello! How can I help you today?"
                                required
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
                                {saving ? "Saving..." : editId ? "Update" : "Create"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : quickReplies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Zap className="w-8 h-8 mb-2" />
                        <p className="text-sm">No quick replies yet</p>
                        <p className="text-xs mt-1">Add your first canned response</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {quickReplies.map((qr) => (
                            <div key={qr.id} className="px-5 py-3 hover:bg-slate-50/50 flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-medium text-slate-800">{qr.title}</span>
                                        {qr.shortcut && (
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">/{qr.shortcut}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{qr.body}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => handleEdit(qr)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(qr.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
