import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { BattleEvent, Session } from '../types'

const MAX_EVENTS = 100

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<BattleEvent[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)

  const addEvent = useCallback((event: BattleEvent) => {
    setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS))
  }, [])

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('rpg:event', (event: BattleEvent) => {
      addEvent(event)
    })

    socket.on('rpg:session_update', (session: Session) => {
      setActiveSession(session)
    })

    socket.on('rpg:config_change', () => {
      window.dispatchEvent(new CustomEvent('rpg:refresh'))
    })

    socket.on('rpg:summon', (event: BattleEvent) => {
      window.dispatchEvent(new CustomEvent('rpg:summon_update', { detail: event }))
    })

    return () => {
      socket.disconnect()
    }
  }, [addEvent])

  return { connected, events, addEvent, activeSession }
}
