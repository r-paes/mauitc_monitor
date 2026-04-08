import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulerApi, type SchedulerConfigUpdate } from "@/lib/api/scheduler";

export const SCHEDULER_KEY = ["scheduler-config"] as const;

export function useSchedulerConfigs() {
  return useQuery({
    queryKey: SCHEDULER_KEY,
    queryFn: schedulerApi.list,
  });
}

export function useUpdateSchedulerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: SchedulerConfigUpdate }) =>
      schedulerApi.update(key, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULER_KEY }),
  });
}
