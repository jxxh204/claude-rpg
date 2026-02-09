import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BattleEvent } from '../types'

const ICON_MAP: Record<string, string> = {
  sword: '⚔️',
  shield: '🛡️',
  summon: '🐲',
  vanish: '💨',
  lightning: '⚡',
  skull: '💀',
  config: '✨',
  question: '❓',
  bell: '🔔',
}

interface BattleLogProps {
  events: BattleEvent[]
}

export function BattleLog({ events }: BattleLogProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [events.length])

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '--:--:--'
    }
  }

  return (
    <aside className="rpg-battle-log">
      <div className="rpg-battle-log__header">
        {'📜'} 전투 로그
      </div>
      <div className="rpg-battle-log__list" ref={listRef}>
        {events.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <div className="empty-state__icon">{'📜'}</div>
            <div className="empty-state__text">전투 기록이 없습니다</div>
            <div className="empty-state__sub">Claude가 작업을 시작하면 여기에 로그가 표시됩니다</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map(event => (
              <motion.div
                key={event.id}
                className={`log-entry log-entry--${event.rpgIcon || 'question'}`}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <div className="log-entry__time">{formatTime(event.timestamp)}</div>
                <div>
                  <span className="log-entry__icon">
                    {ICON_MAP[event.rpgIcon] || '❓'}
                  </span>
                  <span className="log-entry__message">{event.rpgMessage}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </aside>
  )
}
