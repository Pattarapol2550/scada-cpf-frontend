/**
 * src/hooks/useCompressors.js — Compressor registry, backed by the backend
 * (replaces the old hardcoded COMPRESSORS/COMPRESSOR_TYPE lists in utils/format.js)
 */
import { useEffect, useMemo, useState } from 'react'
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

  // Memoize so `ids`/`typeMap` keep a stable reference across renders.
  // Consumers use these in effect/memo dependency arrays; a fresh array each
  // render would re-run those effects (API spam, interval churn) every render.
  const ids     = useMemo(() => list.map(c => c.id), [list])
  const typeMap = useMemo(() => Object.fromEntries(list.map(c => [c.id, c.type])), [list])

  return { list, ids, typeMap, loading }
}
