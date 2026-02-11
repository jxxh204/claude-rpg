import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import type { SummonType, ActiveSummon } from '../types'

const SUMMON_ICONS: Record<string, string> = {
  dragon: '🐲',
  eagle: '🦅',
  owl: '🦉',
  wolf: '🐺',
  crystal: '🔮',
  scroll: '📜',
}

export function Summons() {
  const { data: types } = useApi<SummonType[]>('/api/agents/types')
  const { data: active, refetch: refetchActive } = useApi<ActiveSummon[]>('/api/agents/active')
  const [selectedType, setSelectedType] = useState<SummonType | null>(null)

  // 소환수 이벤트 리스닝
  useEffect(() => {
    const handler = () => refetchActive()
    window.addEventListener('rpg:summon_update', handler)
    return () => window.removeEventListener('rpg:summon_update', handler)
  }, [refetchActive])

  return (
    <div>
      <div className="panel-title">{'🐲'} 에이전트 Agents</div>

      {/* 활성 소환수 */}
      <div className="section-divider">{'⚡'} 실행 중 (Running Tasks)</div>
      {!active?.length ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <div className="empty-state__text">현재 실행 중인 에이전트가 없습니다</div>
          <div className="empty-state__sub">Claude가 Task를 실행하면 여기에 나타납니다</div>
        </div>
      ) : (
        <AnimatePresence>
          {active.map(summon => (
            <motion.div
              key={summon.id + summon.taskId}
              className="summon-active"
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <div className="summon-active__header">
                <div className="summon-active__icon">
                  {summon.status === 'in_progress' ? '🐲' : '⏳'}
                </div>
                <div>
                  <div className="summon-active__name">{summon.subject}</div>
                  <div className="summon-active__status">
                    {summon.activeForm || summon.status}
                  </div>
                </div>
              </div>
              <div className="summon-hp">
                <motion.div
                  className="summon-hp__fill"
                  initial={{ width: '10%' }}
                  animate={{ width: summon.status === 'in_progress' ? '60%' : '20%' }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* 소환수 도감 */}
      <div className="section-divider">{'📖'} 에이전트 도감 (SubAgents)</div>
      <div className="bestiary-grid">
        {types?.map((type, i) => (
          <motion.div
            key={type.name}
            className="bestiary-entry"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedType(type)}
          >
            <div className="bestiary-entry__icon">
              {SUMMON_ICONS[type.icon] || '🐾'}
            </div>
            <div className="bestiary-entry__name">{type.name}</div>
          </motion.div>
        ))}
      </div>

      {/* 도감 상세 모달 */}
      <AnimatePresence>
        {selectedType && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedType(null)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal__title">
                {SUMMON_ICONS[selectedType.icon] || '🐾'} {selectedType.name}
              </div>

              <div className="item-card__desc" style={{ fontSize: '14px', marginBottom: '16px' }}>
                {selectedType.description}
              </div>

              <div className="modal__field">
                <label className="modal__label">사용 가능 도구</label>
                <div className="item-card__tags" style={{ marginTop: '4px' }}>
                  {selectedType.tools.map(tool => (
                    <span key={tool} className="item-card__tag">{tool}</span>
                  ))}
                </div>
              </div>

              <div className="modal__field">
                <label className="modal__label">모델</label>
                <div style={{ color: 'var(--text-blue)', fontSize: '13px' }}>
                  {selectedType.model}
                </div>
              </div>

              <div className="modal__field">
                <label className="modal__label">타입</label>
                <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                  {selectedType.scope === 'builtin' ? '내장 Agent (Built-in)' : '커스텀 Agent'}
                </div>
              </div>

              <div className="modal__actions">
                <button className="rpg-btn" onClick={() => setSelectedType(null)}>닫기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
