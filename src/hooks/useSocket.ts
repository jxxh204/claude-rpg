import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { BattleEvent } from '../types'

const MAX_EVENTS = 100

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<BattleEvent[]>([])

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

    socket.on('rpg:config_change', (event: BattleEvent) => {
      // config_change는 rpg:event로도 오므로 별도 처리 가능
      // 필요 시 설정 새로고침 트리거
      window.dispatchEvent(new CustomEvent('rpg:refresh'))
    })

    socket.on('rpg:summon', (event: BattleEvent) => {
      window.dispatchEvent(new CustomEvent('rpg:summon_update', { detail: event }))
    })

    return () => {
      socket.disconnect()
    }
  }, [addEvent])

  return { connected, events, addEvent }
}
