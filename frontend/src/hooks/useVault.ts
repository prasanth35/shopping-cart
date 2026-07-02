import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VaultEntryMeta, VaultEntryRevealed, VaultEntryType } from "@/types";

const KEY = ["vault"];

export function useVaultEntries() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<VaultEntryMeta[]>("/vault") });
}

export function useCreateVaultEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: VaultEntryType; title: string; data: Record<string, unknown> }) =>
      api.post<VaultEntryMeta>("/vault", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateVaultEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { type: VaultEntryType; title: string; data: Record<string, unknown> } }) =>
      api.patch<VaultEntryMeta>(`/vault/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteVaultEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vault/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRevealVaultEntry() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post<VaultEntryRevealed>(`/vault/${id}/reveal`, { password }),
  });
}
