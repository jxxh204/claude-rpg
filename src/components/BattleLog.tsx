import { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BattleEvent, Session } from '../types'

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
  fail: '❌',
  castle: '🏰',
  door: '🚪',
  combo: '🔗',
}

type FilterType = 'all' | 'tools' | 'agents' | 'session' | 'chains'

interface BattleLogProps {
  events: BattleEvent[]
  activeSession?: Session | null
}

export function BattleLog({ events, activeSession }: BattleLogProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [collapsedSessions, setCollapsedSessions] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [events.length])

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '--:--:--'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const sec = Math.floor(ms / 1000)
    if (sec < 60) return `${sec}s`
    const min = Math.floor(sec / 60)
    return `${min}m ${sec % 60}s`
  }

  // 필터링된 이벤트
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    return events.filter(e => {
      switch (filter) {
        case 'tools':
          return ['PreToolUse', 'PostToolUse', 'PostToolUseFailure'].includes(e.type)
        case 'agents':
          return ['SubagentStart', 'SubagentStop'].includes(e.type)
        case 'session':
          return ['UserPromptSubmit', 'Stop', 'SessionStart', 'SessionEnd'].includes(e.type)
        case 'chains':
          return e.type === 'ChainTrigger' || !!e.chainId
        default:
          return true
      }
    })
  }, [events, filter])

  // 세션 그룹핑: 연속된 이벤트를 세션 단위로 묶기
  const groupedEvents = useMemo(() => {
    const groups: { type: 'session' | 'event'; events: BattleEvent[]; sessionIndex?: number }[] = []
    let currentGroup: BattleEvent[] | null = null
    let sessionCounter = 0

    for (const event of filteredEvents) {
      if (event.isSessionStart) {
        // 새 세션 그룹 시작
        currentGroup = [event]
        sessionCounter++
      } else if (event.isSessionEnd && currentGroup) {
        // 세션 그룹 종료
        currentGroup.push(event)
        groups.push({ type: 'session', events: currentGroup, sessionIndex: sessionCounter })
        currentGroup = null
      } else if (currentGroup) {
        // 세션 내 이벤트
        currentGroup.push(event)
      } else {
        // 세션 밖 이벤트 (단독)
        groups.push({ type: 'event', events: [event] })
      }
    }

    // 아직 끝나지 않은 세션
    if (currentGroup && currentGroup.length > 0) {
      sessionCounter++
      groups.push({ type: 'session', events: currentGroup, sessionIndex: sessionCounter })
    }

    return groups
  }, [filteredEvents])

  const toggleSession = (idx: number) => {
    setCollapsedSessions(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <aside className="rpg-battle-log">
      <div className="rpg-battle-log__header">
        {'📜'} 활동 로그 Activity
      </div>

      {/* 활성 세션 배너 */}
      {activeSession && activeSession.status === 'active' && (
        <LiveSessionBanner session={activeSession} />
      )}

      {/* 필터 */}
      <div className="battle-log__filters">
        {([
          ['all', '전체'],
          ['tools', '⚔️도구'],
          ['agents', '🐲에이전트'],
          ['session', '⚡세션'],
          ['chains', '🔗체인'],
        ] as [FilterType, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`battle-log__filter ${filter === key ? 'battle-log__filter--active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 이벤트 목록 */}
      <div className="rpg-battle-log__list" ref={listRef}>
        {filteredEvents.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <div className="empty-state__icon">{'📜'}</div>
            <div className="empty-state__text">활동 기록이 없습니다</div>
            <div className="empty-state__sub">Claude가 작업을 시작하면 여기에 로그가 표시됩니다</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {groupedEvents.map((group, gi) => {
              if (group.type === 'session' && group.events.length > 2) {
                // 세션 그룹 렌더링
                const first = group.events[0]
                const last = group.events[group.events.length - 1]
                const isCollapsed = collapsedSessions.has(gi)
                const innerEvents = group.events.slice(1, -1)
                const toolCount = group.events.filter(e =>
                  e.type === 'PostToolUse' || e.type === 'PostToolUseFailure'
                ).length
                const agentCount = group.events.filter(e => e.type === 'SubagentStart').length
                const isActive = !last.isSessionEnd

                return (
                  <motion.div
                    key={`session-${gi}`}
                    className="log-session"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* 세션 헤더 */}
                    <div
                      className={`log-session__header ${isActive ? 'log-session__header--active' : ''}`}
                      onClick={() => toggleSession(gi)}
                    >
                      <span className="log-session__toggle">
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                      <span className="log-entry__icon">
                        {ICON_MAP[first.rpgIcon] || '⚡'}
                      </span>
                      <span className="log-session__title">
                        {first.prompt
                          ? `"${first.prompt.slice(0, 40)}${(first.prompt.length || 0) > 40 ? '...' : ''}"`
                          : first.rpgMessage}
                      </span>
                      <span className="log-session__meta">
                        {toolCount > 0 && `⚔️${toolCount}`}
                        {agentCount > 0 && ` 🐲${agentCount}`}
                        {last.sessionSummary?.durationMs && ` ${formatDuration(last.sessionSummary.durationMs)}`}
                      </span>
                    </div>

                    {/* 세션 내부 이벤트 */}
                    {!isCollapsed && (
                      <div className="log-session__body">
                        {innerEvents.map(event => (
                          <EventEntry key={event.id} event={event} formatTime={formatTime} />
                        ))}
                      </div>
                    )}

                    {/* 세션 종료 */}
                    {last.isSessionEnd && (
                      <div className="log-session__footer">
                        <span className="log-entry__icon">{ICON_MAP[last.rpgIcon] || '💀'}</span>
                        <span className="log-entry__message">
                          {last.rpgMessage}
                          {last.sessionSummary && (
                            <span className="log-session__summary">
                              {' '}(도구 {last.sessionSummary.toolCount}회
                              {last.sessionSummary.agentCount > 0 && `, 에이전트 ${last.sessionSummary.agentCount}회`}
                              , {formatDuration(last.sessionSummary.durationMs)})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )
              }

              // 단독 이벤트
              return group.events.map(event => (
                <EventEntry key={event.id} event={event} formatTime={formatTime} />
              ))
            })}
          </AnimatePresence>
        )}
      </div>
    </aside>
  )
}

// =============================
// 이벤트 항목
// =============================

function EventEntry({
  event,
  formatTime,
}: {
  event: BattleEvent
  formatTime: (ts: string) => string
}) {
  return (
    <motion.div
      key={event.id}
      className={`log-entry log-entry--${event.rpgIcon || 'question'}`}
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      transition={{ duration: 0.3 }}
    >
      <div className="log-entry__time">{formatTime(event.timestamp)}</div>
      <div className="log-entry__content">
        <span className="log-entry__icon">
          {ICON_MAP[event.rpgIcon] || '❓'}
        </span>
        <span className="log-entry__message">{event.rpgMessage}</span>
      </div>
      {event.toolInputSummary && (
        <div className="log-entry__detail">{event.toolInputSummary}</div>
      )}
    </motion.div>
  )
}

// =============================
// 활성 세션 배너
// =============================

function LiveSessionBanner({ session }: { session: Session }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(session.startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [session.startedAt])

  const toolCount = Object.values(session.toolUsage).reduce((a, b) => a + b, 0)

  const formatElapsed = (sec: number) => {
    if (sec < 60) return `${sec}s`
    const min = Math.floor(sec / 60)
    return `${min}m ${sec % 60}s`
  }

  return (
    <div className="battle-log__live-banner">
      <span className="battle-log__live-dot" />
      <span className="battle-log__live-text">
        LIVE — 도구 {toolCount}회
        {session.agentSpawns.length > 0 && `, 에이전트 ${session.agentSpawns.length}회`}
        , {formatElapsed(elapsed)}
      </span>
    </div>
  )
}
