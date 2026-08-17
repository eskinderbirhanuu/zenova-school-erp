import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosResponse } from "axios"

function isAxiosResponse<T>(value: AxiosResponse<T> | T): value is AxiosResponse<T> {
  return value !== null && typeof value === "object" && "data" in value && "status" in value
}

export function unwrapPaginated<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === "object" && Array.isArray((data as any).items)) return (data as any).items as T[]
  return []
}

export function useApiQuery<TData = unknown>(
  key: unknown[],
  fetcher: () => Promise<AxiosResponse<TData> | TData>,
  options?: { enabled?: boolean; staleTime?: number; refetchInterval?: number },
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await fetcher()
      return (isAxiosResponse(res) ? res.data : res) as TData
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? 30 * 1000,
    refetchInterval: options?.refetchInterval,
  })
}

export function useApiMutation<TVars = void, TData = unknown>(
  mutator: (vars: TVars) => Promise<AxiosResponse<TData>>,
  options?: {
    onSuccess?: (data: TData, vars: TVars) => void;
    onError?: (error: unknown, vars: TVars) => void;
    invalidate?: unknown[][];
  },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: TVars) => {
      const res = await mutator(vars)
      return res.data as TData
    },
    onSuccess: (data: TData, vars: TVars) => {
      if (options?.invalidate) {
        for (const key of options.invalidate) {
          queryClient.invalidateQueries({ queryKey: key })
        }
      }
      options?.onSuccess?.(data, vars)
    },
    onError: (error, vars: TVars) => {
      options?.onError?.(error, vars)
    },
  })
}
