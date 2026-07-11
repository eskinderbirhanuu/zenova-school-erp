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

export function useApiMutation(
  mutator: (vars: any) => Promise<AxiosResponse>,
  options?: { onSuccess?: (data: any, vars: any) => void; invalidate?: string[][] },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: any) => {
      const res = await mutator(vars)
      return res.data ?? res
    },
    onSuccess: (data, vars) => {
      if (options?.invalidate) {
        for (const key of options.invalidate) {
          queryClient.invalidateQueries({ queryKey: key })
        }
      }
      options?.onSuccess?.(data, vars)
    },
  })
}
