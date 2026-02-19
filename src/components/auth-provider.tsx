"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    logout: async () => { },
    refresh: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Skip auth check on login page
        if (pathname === "/login") {
            setLoading(false);
            return;
        }
        fetchUser();
    }, [fetchUser, pathname]);

    const logout = useCallback(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        router.push("/login");
    }, [router]);

    return (
        <AuthContext.Provider
            value={{ user, loading, logout, refresh: fetchUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}
