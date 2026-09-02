import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const loc = useLocation();
  if (status === "unknown") return null; // load() sürüyor
  if (status === "anon") return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
