import { useState, useEffect, useCallback } from 'react'

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()

    // 설정 변경 시 자동 새로고침
    const handler = () => fetchData()
    window.addEventListener('rpg:refresh', handler)
    return () => window.removeEventListener('rpg:refresh', handler)
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
