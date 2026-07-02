import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardRange, DashboardSummary } from "@/types";

export function useDashboardSummary(range: DashboardRange) {
  return useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => api.get<DashboardSummary>(`/dashboard/summary?range=${range}`),
  });
}
