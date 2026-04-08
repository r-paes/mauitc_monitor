import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  instancesApi,
  type InstanceCreate,
  type InstanceUpdate,
  type ServiceCreate,
  type ServiceUpdate,
} from "@/lib/api/instances";

export const INSTANCES_KEY = ["instances"] as const;

export function useInstances() {
  return useQuery({
    queryKey: INSTANCES_KEY,
    queryFn: instancesApi.list,
  });
}

export function useInstance(id: string) {
  return useQuery({
    queryKey: [...INSTANCES_KEY, id],
    queryFn: () => instancesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InstanceCreate) => instancesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

export function useUpdateInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InstanceUpdate }) =>
      instancesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

export function useDeleteInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => instancesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

// ─── Services (containers monitorados) ─────────────────────────────────────

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, data }: { instanceId: string; data: ServiceCreate }) =>
      instancesApi.createService(instanceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, serviceId, data }: { instanceId: string; serviceId: string; data: ServiceUpdate }) =>
      instancesApi.updateService(instanceId, serviceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, serviceId }: { instanceId: string; serviceId: string }) =>
      instancesApi.removeService(instanceId, serviceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}
