import { useEffect, useState } from 'react'
import type { Session, TrackingData } from '../types'

interface CharCardProps {
  characterName?: string
  characterType?: 'global' | 'project'
  activeSession?: Session | null
}

export function CharCard({
  characterName = 'Claude',
  characterType = 'global',
  activeSession,
}: CharCardProps) {
  const [stats, setStats] = useState<TrackingData | null>(null)

  // 통계 로드
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
  }, [])

  // 세션 업데이트 시 통계도 갱신
  useEffect(() => {
    if (activeSession) {
      fetch('/api/stats')
        .then(r => r.json())
        .then(data => setStats(data))
        .catch(() => {})
    }
  }, [activeSession?.eventCount])

  // 레벨 계산: floor(sqrt(총 도구 사용수 / 10))
  const level = stats ? Math.max(1, Math.floor(Math.sqrt(stats.totalToolUses / 10))) : 1

  // 현재 세션 도구 수
  const sessionToolCount = activeSession
    ? Object.values(activeSession.toolUsage).reduce((a, b) => a + b, 0)
    : 0

  // 오늘 세션 수
  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = stats?.dailyActivity.find(d => d.date === today)?.sessions || 0

  // HP: 오늘 세션 수 / 10 (최대 100%)
  const hpPercent = Math.min(100, todaySessions * 10)

  // MP: 현재 세션 도구 사용수 (50에서 100%)
  const mpPercent = activeSession ? Math.min(100, (sessionToolCount / 50) * 100) : 0

  // EXP: 현재 레벨 진행도
  const currentLevelStart = level * level * 10
  const nextLevelStart = (level + 1) * (level + 1) * 10
  const totalTools = stats?.totalToolUses || 0
  const expPercent = ((totalTools - currentLevelStart) / (nextLevelStart - currentLevelStart)) * 100

  return (
    <div className="char-card">
      <div className="char-card__avatar">
        {characterType === 'global' ? '🌍' : '⚔️'}
      </div>
      <div className="char-card__name">{characterName}</div>
      <div className="char-card__title">
        Lv.{level} {characterType === 'global' ? 'Global Agent' : 'Project Agent'}
      </div>

      {/* HP — 오늘 활동 */}
      <div className="stat-bar">
        <div className="stat-bar__label">
          <span className="stat-bar__label-name">HP</span>
          <span className="stat-bar__label-value">
            Today {todaySessions}/{10}
          </span>
        </div>
        <div className="stat-bar__track">
          <div
            className="stat-bar__fill stat-bar__fill--hp"
            style={{ width: `${Math.max(5, hpPercent)}%`, transition: 'width 0.5s ease' }}
          />
        </div>
      </div>

      {/* MP — 현재 세션 */}
      <div className="stat-bar">
        <div className="stat-bar__label">
          <span className="stat-bar__label-name">MP</span>
          <span className="stat-bar__label-value">
            {activeSession ? `Session ⚔️${sessionToolCount}` : 'Idle'}
          </span>
        </div>
        <div className="stat-bar__track stat-bar__track--mp">
          <div
            className="stat-bar__fill stat-bar__fill--mp"
            style={{ width: `${Math.max(activeSession ? 5 : 0, mpPercent)}%`, transition: 'width 0.3s ease' }}
          />
        </div>
      </div>

      {/* EXP — 레벨 진행도 */}
      <div className="stat-bar">
        <div className="stat-bar__label">
          <span className="stat-bar__label-name">EXP</span>
          <span className="stat-bar__label-value">
            {totalTools} / {nextLevelStart}
          </span>
        </div>
        <div className="stat-bar__track stat-bar__track--exp">
          <div
            className="stat-bar__fill stat-bar__fill--exp"
            style={{ width: `${Math.max(3, Math.min(100, expPercent))}%`, transition: 'width 0.5s ease' }}
          />
        </div>
      </div>

      {/* 누적 스탯 */}
      {stats && stats.totalSessions > 0 && (
        <div className="char-card__mini-stats">
          <span title="총 세션">🗡️ {stats.totalSessions}</span>
          <span title="총 도구 (Tool Uses)">⚔️ {stats.totalToolUses}</span>
          <span title="총 에이전트 (Spawns)">🐲 {stats.totalAgentSpawns}</span>
          {(stats as any).totalChainTriggers > 0 && (
            <span title="총 체인 (Triggers)">🔗 {(stats as any).totalChainTriggers}</span>
          )}
        </div>
      )}
    </div>
  )
}
