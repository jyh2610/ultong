import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createReport, listReports } from "../lib/reports";
import type { ReportType } from "../lib/reports";

export function useReports(contentId?: string) {
  return useQuery({
    queryKey: ["reports", contentId ?? "all"],
    queryFn: () => listReports(contentId),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contentId,
      type,
      detail,
    }: {
      contentId: string;
      type: ReportType;
      detail?: string;
    }) => createReport(contentId, type, detail),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}
