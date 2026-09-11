import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export function useRequireAuth(redirectTo: string = "/login") {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: redirectTo, replace: true });
    }
  }, [loading, navigate, redirectTo, user]);

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
  };
}

export function useRedirectAuthenticated(redirectTo: string = "/dashboard") {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirectTo, replace: true });
    }
  }, [loading, navigate, redirectTo, user]);

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
  };
}