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

export function useAddInvestmentTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      type,
      units,
      nav,
      amount,
      date,
      note,
    }: {
      id: string;
      type: "BUY" | "SELL" | "SIP";
      units: number;
      nav: number;
      amount: number;
      date?: string;
      note?: string;
    }) => api.post<Investment>(`/investments/${id}/transactions`, { type, units, nav, amount, date, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
