import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"

interface Features {
  chapa: boolean
}

export function useFeatures(): {
  features: Features
  loading: boolean
  isChapaEnabled: boolean
} {
  const { data, isLoading } = useQuery<Features>({
    queryKey: ["features"],
    queryFn: () => api.get("/config/features").then((res) => res.data),
    staleTime: 300_000,
    retry: 1,
  })
  const features = data ?? { chapa: false }
  return { features, loading: isLoading, isChapaEnabled: features.chapa }
}
