import { useState, useCallback, useEffect, useRef } from 'react'
import { getMetrics } from '../services/api'

/**
 * useMetrics — fetch + optional realtime polling
 *
 * @param {object} options
 * @param {number|null} options.pollInterval  - ms between auto-fetches (null = disabled)
 * @param {number}      options.limit         - max records per fetch (default 720)
 */
export function useMetrics({ pollInterval = null, limit = 720 } = {}) {
  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [isPolling, setIsPolling] = useState(false)

  const lastParams = useRef({ compressorId: null, startDate: null, windowMs: null })
  const timerRef   = useRef(null)
  const mountedRef = useRef(true)
  // Always-fresh tick fn — avoids duplicating the sliding-window logic
  const tickRef    = useRef(() => {})

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearInterval(timerRef.current)
    }
  }, [])

  const _doFetch = useCallback(async (compressorId, startDate, endDate) => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const params = { limit }
      if (startDate) params.start = new Date(startDate).toISOString()
      if (endDate)   params.end   = new Date(endDate).toISOString()
      const res = await getMetrics(compressorId, params)
      if (mountedRef.current) setRecords(res.data)
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        setRecords([])
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [limit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep tickRef current so the interval always uses the latest _doFetch / lastParams
  tickRef.current = () => {
    const { compressorId: cId, windowMs: wMs } = lastParams.current
    if (!cId) return
    const now   = new Date()
    const start = new Date(now - wMs)
    _doFetch(cId, start.toISOString(), now.toISOString())
  }

  // Public fetch — updates params, triggers an immediate fetch, then arms the timer
  const fetch = useCallback((compressorId, startDate, endDate) => {
    const windowMs = startDate && endDate
      ? new Date(endDate) - new Date(startDate)
      : 2 * 3600 * 1000

    lastParams.current = { compressorId, startDate, windowMs }
    _doFetch(compressorId, startDate, endDate)

    clearInterval(timerRef.current)
    if (pollInterval) {
      setIsPolling(true)
      timerRef.current = setInterval(() => tickRef.current(), pollInterval)
    }
  }, [_doFetch, pollInterval])

  // Restart timer when pollInterval changes (e.g. user picks a different refresh rate)
  useEffect(() => {
    if (!pollInterval) {
      clearInterval(timerRef.current)
      setIsPolling(false)
      return
    }
    if (lastParams.current.compressorId) {
      clearInterval(timerRef.current)
      setIsPolling(true)
      timerRef.current = setInterval(() => tickRef.current(), pollInterval)
    }
    return () => clearInterval(timerRef.current)
  }, [pollInterval])  // eslint-disable-line react-hooks/exhaustive-deps

  return { records, loading, error, fetch, isPolling }
}