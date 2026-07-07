/**
 * src/hooks/useCompressors.js — Compressor registry, backed by the backend
 * (replaces the old hardcoded COMPRESSORS/COMPRESSOR_TYPE lists in utils/format.js)
 */
import { useEffect, useState } from 'react'
import { getCompressors } from '../services/api'

let _cache = null          // [{ id, type }] once loaded
let _inflight = null       // dedupe concurrent fetches across components

async function fetchCompressors() {
  if (_cache) return _cache
  if (!_inflight) {
    _inflight = getCompressors()
      .then(res => { _cache = res.data; return _cache })
      .finally(() => { _inflight = null })
  }
  return _inflight
}

// Call after admin creates/edits/deletes a compressor so other pages refetch
export function invalidateCompressorsCache() {
  _cache = null
}

export function useCompressors() {
  const [list, setList] = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    let alive = true
    fetchCompressors()
      .then(data => { if (alive) setList(data) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const ids     = list.map(c => c.id)
  const typeMap = Object.fromEntries(list.map(c => [c.id, c.type]))

  return { list, ids, typeMap, loading }
}
