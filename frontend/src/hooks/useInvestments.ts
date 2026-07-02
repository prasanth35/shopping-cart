import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Investment } from "@/types";

const KEY = ["investments"];

export function useInvestments() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<Investment[]>("/investments") });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Investment>("/investments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<Investment>(`/investments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/investments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useContributeInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId, amount, note }: { id: string; accountId: string; amount: number; note?: string }) =>
      api.post<Investment>(`/investments/${id}/contribute`, { accountId, amount, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateInvestmentValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: number }) =>
      api.patch<Investment>(`/investments/${id}/current-value`, { currentValue }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
