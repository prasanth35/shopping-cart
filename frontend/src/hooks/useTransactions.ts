import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Transaction } from "@/types";

export interface TransactionFilters {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  accountId?: string;
  creditCardId?: string;
  categoryId?: string;
  type?: string;
  search?: string;
}

interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

function toQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => api.get<TransactionListResponse>(`/transactions?${toQueryString(filters)}`),
  });
}

function invalidateRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["accounts"] });
  qc.invalidateQueries({ queryKey: ["credit-cards"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Transaction>("/transactions", data),
    onSuccess: () => invalidateRelated(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<Transaction>(`/transactions/${id}`, data),
    onSuccess: () => invalidateRelated(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => invalidateRelated(qc),
  });
}
