import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import { HOOK_EVENT_TYPES } from '../types'
import type { HooksData } from '../types'

const EVENT_ICONS: Record<string, string> = {
  PreToolUse: '⚔️',
  PostToolUse: '🛡️',
  Stop: '💀',
  Notification: '📨',
  UserPromptSubmit: '📝',
  SubagentStart: '🐲',
  SessionStart: '🌅',
  PermissionRequest: '🔐',
}

const EVENT_COLORS: Record<string, string> = {
  PreToolUse: '#ff6b6b',
  PostToolUse: '#4ecdc4',
  Stop: '#95a5a6',
  Notification: '#f39c12',
  UserPromptSubmit: '#9b59b6',
  SubagentStart: '#3498db',
  SessionStart: '#e67e22',
  PermissionRequest: '#e74c3c',
}

export function Enchants() {
  const { data: hooks, loading, refetch } = useApi<HooksData>('/api/hooks')
  const [showCreate, setShowCreate] = useState<string | null>(null)

  // 모든 이벤트 타입 (설정된 것 + 가능한 것)
  const allEventTypes = new Set([
    ...Object.keys(HOOK_EVENT_TYPES),
    ...Object.keys(hooks || {}),
  ])

  const handleDelete = async (eventType: string, index: number) => {
    if (!confirm('이 Hook을 해제하시겠습니까?')) return
    await fetch(`/api/hooks/${eventType}/${index}`, { method: 'DELETE' })
    refetch()
  }

  return (
    <div>
      <div className="panel-title">{'🔮'} 인챈트 Hooks</div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'⏳'}</div>
          <div className="empty-state__text">로딩 중...</div>
        </div>
      ) : (
        <>
        {Array.from(allEventTypes).map((eventType, idx) => {
          const rules = hooks?.[eventType] || []
          const icon = EVENT_ICONS[eventType] || '🔮'
          const color = EVENT_COLORS[eventType] || '#9b59b6'
          const info = HOOK_EVENT_TYPES[eventType as keyof typeof HOOK_EVENT_TYPES]

          return (
            <motion.div
              key={eventType}
              className="enchant-slot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="enchant-slot__header">
                <span className="enchant-slot__icon">{icon}</span>
                <span className="enchant-slot__name">{eventType}</span>
                <span className="enchant-slot__desc">
                  {info?.rpgName || '이벤트 트리거'}
                </span>
                <button
                  className="rpg-btn rpg-btn--primary"
                  style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 10px' }}
                  onClick={() => setShowCreate(eventType)}
                >
                  + Hook 등록
                </button>
              </div>

              {rules.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '8px 0' }}>
                  등록된 Hook이 없습니다
                </div>
              ) : (
                <AnimatePresence>
                  {rules.map((rule, idx) => (
                    <motion.div
                      key={idx}
                      className="enchant-rune"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                    >
                      <div className="enchant-rune__dot" style={{ background: color }} />
                      <span className="enchant-rune__matcher">
                        {rule.matcher || '*'}
                      </span>
                      <span className="enchant-rune__command">
                        {rule.hooks.map(h => h.command).join(' | ')}
                      </span>
                      <button
                        className="rpg-btn rpg-btn--danger"
                        style={{ fontSize: '10px', padding: '2px 8px' }}
                        onClick={() => handleDelete(eventType, idx)}
                      >
                        해제
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </motion.div>
          )
        })}
        </>
      )}

      {/* 룬 각인 모달 */}
      <AnimatePresence>
        {showCreate && (
          <EnchantModal
            eventType={showCreate}
            onClose={() => setShowCreate(null)}
            onSaved={refetch}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EnchantModal({
  eventType,
  onClose,
  onSaved,
}: {
  eventType: string
  onClose: () => void
  onSaved: () => void
}) {
  const [matcher, setMatcher] = useState('*')
  const [command, setCommand] = useState('')
  const [timeout, setTimeout_] = useState('10')

  const handleSubmit = async () => {
    await fetch(`/api/hooks/${eventType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matcher,
        command,
        timeout: parseInt(timeout, 10) || undefined,
      }),
    })
    onSaved()
    onClose()
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal__title">
          {EVENT_ICONS[eventType] || '🔮'} {eventType}에 Hook 등록
        </div>

        <div className="modal__field">
          <label className="modal__label">매처 (Matcher) - 정규표현식 필터</label>
          <input
            className="modal__input"
            value={matcher}
            onChange={e => setMatcher(e.target.value)}
            placeholder="* (전체) 또는 Edit|Write 등"
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">실행 명령어 (Command)</label>
          <textarea
            className="modal__textarea"
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="실행할 셸 명령어를 입력하세요"
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">타임아웃 (초)</label>
          <input
            className="modal__input"
            value={timeout}
            onChange={e => setTimeout_(e.target.value)}
            type="number"
            placeholder="10"
          />
        </div>

        <div className="modal__actions">
          <button className="rpg-btn" onClick={onClose}>취소</button>
          <button className="rpg-btn rpg-btn--primary" onClick={handleSubmit}>
            {'🔮'} Hook 등록
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
