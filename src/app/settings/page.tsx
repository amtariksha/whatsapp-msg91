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
                        User Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage who can access the CRM
                    </p>
                </div>
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
        </div>
    );
}
