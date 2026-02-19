"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed");
                return;
            }

            router.push("/");
            router.refresh();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                padding: "1rem",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "420px",
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    padding: "2.5rem",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        marginBottom: "2rem",
                    }}
                >
                    <div
                        style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "16px",
                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "1rem",
                            boxShadow: "0 8px 25px rgba(34,197,94,0.3)",
                        }}
                    >
                        <MessageSquare size={28} color="white" />
                    </div>
                    <h1
                        style={{
                            color: "white",
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            margin: 0,
                        }}
                    >
                        WACRM
                    </h1>
                    <p
                        style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.875rem",
                            margin: "0.25rem 0 0",
                        }}
                    >
                        Sign in to your account
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "10px",
                            padding: "0.75rem 1rem",
                            marginBottom: "1.5rem",
                            color: "#fca5a5",
                            fontSize: "0.875rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "1.25rem" }}>
                        <label
                            style={{
                                display: "block",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                marginBottom: "0.5rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@wacrm.in"
                            required
                            style={{
                                width: "100%",
                                padding: "0.75rem 1rem",
                                borderRadius: "10px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                background: "rgba(255,255,255,0.05)",
                                color: "white",
                                fontSize: "0.95rem",
                                outline: "none",
                                transition: "border-color 0.2s",
                                boxSizing: "border-box",
                            }}
                            onFocus={(e) =>
                                (e.target.style.borderColor = "rgba(34,197,94,0.5)")
                            }
                            onBlur={(e) =>
                                (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                            }
                        />
                    </div>

                    <div style={{ marginBottom: "1.75rem" }}>
                        <label
                            style={{
                                display: "block",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                marginBottom: "0.5rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            Password
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: "100%",
                                    padding: "0.75rem 3rem 0.75rem 1rem",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(255,255,255,0.05)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    outline: "none",
                                    transition: "border-color 0.2s",
                                    boxSizing: "border-box",
                                }}
                                onFocus={(e) =>
                                (e.target.style.borderColor =
                                    "rgba(34,197,94,0.5)")
                                }
                                onBlur={(e) =>
                                (e.target.style.borderColor =
                                    "rgba(255,255,255,0.1)")
                                }
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: "absolute",
                                    right: "0.75rem",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    color: "rgba(255,255,255,0.4)",
                                    cursor: "pointer",
                                    padding: "4px",
                                    display: "flex",
                                }}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "0.8rem",
                            borderRadius: "10px",
                            border: "none",
                            background: loading
                                ? "rgba(34,197,94,0.5)"
                                : "linear-gradient(135deg, #22c55e, #16a34a)",
                            color: "white",
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            transition: "all 0.2s",
                            boxShadow: loading
                                ? "none"
                                : "0 4px 15px rgba(34,197,94,0.3)",
                        }}
                    >
                        {loading && (
                            <Loader2
                                size={18}
                                style={{
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                        )}
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>

                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}
