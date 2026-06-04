import { useState, useCallback } from 'react'
import { getMetrics } from '../services/api'

export function useMetrics() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async (compressorId, startDate, endDate) => {
    setLoading(true)
    setError(null)
    try {
      const params = { limit: 2000 }
      if (startDate) params.start = new Date(startDate).toISOString()
      if (endDate)   params.end   = new Date(endDate).toISOString()

      const res = await getMetrics(compressorId, params)
      setRecords(res.data)
    } catch (err) {
      setError(err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { records, loading, error, fetch }
}
