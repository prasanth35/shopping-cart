import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreditCard, Transaction } from "@/types";

const KEY = ["credit-cards"];

export function useCreditCards() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<CreditCard[]>("/credit-cards") });
}

export function useCreateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<CreditCard>("/credit-cards", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<CreditCard>(`/credit-cards/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/credit-cards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function usePayCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId, amount, note }: { id: string; accountId: string; amount: number; note?: string }) =>
      api.post<Transaction>(`/credit-cards/${id}/pay`, { accountId, amount, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
