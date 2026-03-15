import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Subscribe to Supabase realtime changes on a table
 * @param {string} table - table name
 * @param {function} callback - called with payload on change
 * @param {object} opts - { event, filter }
 */
export function useRealtime(table, callback, opts = {}) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!table) return

    const channelName = `realtime-${table}-${Math.random()}`
    const channel = supabase.channel(channelName)
      .on('postgres_changes', {
        event: opts.event || '*',
        schema: 'public',
        table,
        filter: opts.filter,
      }, (payload) => callbackRef.current(payload))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table, opts.event, opts.filter])
}
