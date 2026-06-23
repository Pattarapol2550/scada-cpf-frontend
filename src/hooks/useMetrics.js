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
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [isPolling, setIsPolling] = useState(false)

  // Keep latest fetch params so the interval can re-use them
  const lastParams = useRef({ compressorId: null, startDate: null, windowMs: null })
  const timerRef   = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearInterval(timerRef.current)
    }
  }, [])

  // Core fetcher — always slides `end` to now when called from poll
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

  // Public fetch — manual trigger, also (re)starts the poll timer
  const fetch = useCallback((compressorId, startDate, endDate) => {
    // Compute window size so poll can slide it forward
    const windowMs = startDate && endDate
      ? new Date(endDate) - new Date(startDate)
      : 2 * 3600 * 1000 // default 2 h

    lastParams.current = { compressorId, startDate, windowMs }

    _doFetch(compressorId, startDate, endDate)

    // (Re)start interval if polling is enabled
    clearInterval(timerRef.current)
    if (pollInterval) {
      setIsPolling(true)
      timerRef.current = setInterval(() => {
        const { compressorId: cId, windowMs: wMs } = lastParams.current
        if (!cId) return
        const now   = new Date()
        const start = new Date(now - wMs)
        _doFetch(cId, start.toISOString(), now.toISOString())
      }, pollInterval)
    }
  }, [_doFetch, pollInterval])

  // Stop / restart poll when pollInterval prop changes
  useEffect(() => {
    if (!pollInterval) {
      clearInterval(timerRef.current)
      setIsPolling(false)
    }
    // If there's an active compressor, restart the timer with the new interval
    if (pollInterval && lastParams.current.compressorId) {
      clearInterval(timerRef.current)
      setIsPolling(true)
      timerRef.current = setInterval(() => {
        const { compressorId: cId, windowMs: wMs } = lastParams.current
        if (!cId) return
        const now   = new Date()
        const start = new Date(now - wMs)
        _doFetch(cId, start.toISOString(), now.toISOString())
      }, pollInterval)
    }
    return () => clearInterval(timerRef.current)
  }, [pollInterval, _doFetch])

  return { records, loading, error, fetch, isPolling }
}