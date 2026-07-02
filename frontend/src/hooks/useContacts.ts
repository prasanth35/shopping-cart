import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Contact, Split } from "@/types";

const KEY = ["contacts"];

export function useContacts() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<Contact[]>("/contacts") });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; notes?: string }) => api.post<Contact>("/contacts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useContactSplits(contactId: string | null) {
  return useQuery({
    queryKey: ["contacts", contactId, "splits"],
    queryFn: () => api.get<Split[]>(`/contacts/${contactId}/splits`),
    enabled: !!contactId,
  });
}
