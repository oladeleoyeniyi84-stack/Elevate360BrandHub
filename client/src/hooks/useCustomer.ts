// Phase 68A — customer session + premium status hooks (React Query).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerApi, type CustomerUser, type PremiumStatus } from "@/api/customer";

export function useCustomer() {
  const qc = useQueryClient();

  const meQuery = useQuery<CustomerUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: () => customerApi.me(),
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    qc.invalidateQueries({ queryKey: ["/api/premium/status"] });
  };

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      customerApi.login(email, password),
    onSuccess: invalidate,
  });

  const signup = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      customerApi.signup(email, password),
    onSuccess: invalidate,
  });

  const logout = useMutation({
    mutationFn: () => customerApi.logout(),
    onSuccess: invalidate,
  });

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data,
    login,
    signup,
    logout,
    refetch: meQuery.refetch,
  };
}

export function usePremiumStatus(enabled = true) {
  return useQuery<PremiumStatus>({
    queryKey: ["/api/premium/status"],
    queryFn: () => customerApi.premiumStatus(),
    enabled,
    staleTime: 30_000,
  });
}
