"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Login page renders without sidebar chrome
    if (pathname === "/login") {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
