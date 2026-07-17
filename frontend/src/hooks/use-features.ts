import { useState, useEffect } from "react"
import api from "@/services/api"

interface Features {
  chapa: boolean
}

export function useFeatures(): {
  features: Features
  loading: boolean
  isChapaEnabled: boolean
} {
  const [features, setFeatures] = useState<Features>({ chapa: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get("/config/features")
      .then((res) => setFeatures(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { features, loading, isChapaEnabled: features.chapa }
}
