import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosResponse } from "axios"

export function useApiQuery(
  key: string[],
  fetcher: () => Promise<AxiosResponse>,
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await fetcher()
      return res.data ?? res
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? 30 * 1000,
  })
}

export function useApiMutation<TVars = void>(
  mutator: (vars: TVars) => Promise<AxiosResponse>,
  options?: {
    onSuccess?: (data: any, vars: TVars) => void;
    onError?: (error: any, vars: TVars) => void;
    invalidate?: string[][];
  },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: TVars) => {
      const res = await mutator(vars)
      return res.data ?? res
    },
    onSuccess: (data, vars: TVars) => {
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
