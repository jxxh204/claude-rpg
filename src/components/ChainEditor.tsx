import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import type { Chain, ChainStep, ChainStepType } from '../types'
import { HOOK_EVENT_TYPES } from '../types'

const STEP_TYPE_META: Record<ChainStepType, { icon: string; label: string; color: string }> = {
  hook_trigger: { icon: '⚡', label: '트리거', color: '#f1c40f' },
  command: { icon: '⚔️', label: '커맨드', color: '#e74c3c' },
  skill_ref: { icon: '📕', label: '스킬', color: '#9b59b6' },
  agent_spawn: { icon: '🐲', label: '소환', color: '#1abc9c' },
  condition: { icon: '🔷', label: '조건', color: '#3498db' },
}

const EMOJI_OPTIONS = ['🔗', '⚡', '🔥', '💫', '🌀', '🗡️', '🛡️', '💎', '🌟', '🎯', '🎪', '🔮']

export function ChainEditor() {
  const { data: chains, loading, refetch } = useApi<Chain[]>('/api/chains')
  const { data: templates } = useApi<Partial<Chain>[]>('/api/chains/templates')
  const [editingChain, setEditingChain] = useState<Partial<Chain> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const handleCreate = () => {
    setIsNew(true)
    setEditingChain({
      id: `chain-${Date.now()}`,
      name: '',
      description: '',
      icon: '🔗',
      enabled: false,
      steps: [
        { id: 's1', type: 'hook_trigger', config: { eventType: 'PostToolUse', matcher: '' } },
      ],
    })
  }

  const handleFromTemplate = (template: Partial<Chain>) => {
    setIsNew(true)
    setEditingChain({
      ...template,
      id: `${template.id}-${Date.now()}`,
      enabled: false,
    })
  }

  const handleEdit = (chain: Chain) => {
    setIsNew(false)
    setEditingChain({ ...chain })
  }

  const handleSave = async (chain: Partial<Chain>) => {
    if (isNew) {
      await fetch('/api/chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chain),
      })
    } else {
      await fetch(`/api/chains/${chain.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chain),
      })
    }
    setEditingChain(null)
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 콤보를 삭제하시겠습니까?')) return
    await fetch(`/api/chains/${id}`, { method: 'DELETE' })
    refetch()
  }

  const handleToggle = async (chain: Chain) => {
    const endpoint = chain.enabled ? 'deactivate' : 'activate'
    await fetch(`/api/chains/${chain.id}/${endpoint}`, { method: 'POST' })
    refetch()
  }

  const activeChains = chains?.filter(c => c.enabled) || []
  const inactiveChains = chains?.filter(c => !c.enabled) || []

  return (
    <div>
      <div className="panel-title">
        {'🔗'} 콤보 시스템
        <button className="rpg-btn rpg-btn--primary" onClick={handleCreate}>
          + 새 콤보
        </button>
      </div>

      {/* 콤보 템플릿 */}
      {templates && templates.length > 0 && (
        <>
          <div className="section-divider">{'📖'} 콤보 레시피</div>
          <div className="chain-templates">
            {templates.map((tpl, i) => (
              <motion.div
                key={tpl.id}
                className="chain-template"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleFromTemplate(tpl)}
              >
                <span className="chain-template__icon">{tpl.icon}</span>
                <div className="chain-template__info">
                  <div className="chain-template__name">{tpl.name}</div>
                  <div className="chain-template__desc">{tpl.description}</div>
                </div>
                <span className="chain-template__arrow">{'▶'}</span>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* 활성 콤보 */}
      {activeChains.length > 0 && (
        <>
          <div className="section-divider">{'⚡'} 활성 콤보</div>
          <div className="card-grid">
            {activeChains.map((chain, i) => (
              <ChainCard
                key={chain.id}
                chain={chain}
                index={i}
                onToggle={() => handleToggle(chain)}
                onEdit={() => handleEdit(chain)}
                onDelete={() => handleDelete(chain.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* 비활성/전체 콤보 */}
      <div className="section-divider">{'📜'} {activeChains.length > 0 ? '보유 콤보' : '전체 콤보'}</div>
      {loading ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'⏳'}</div>
          <div className="empty-state__text">로딩 중...</div>
        </div>
      ) : !chains?.length ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'🔗'}</div>
          <div className="empty-state__text">보유한 콤보가 없습니다</div>
          <div className="empty-state__sub">위 레시피에서 콤보를 생성하거나 새로 만드세요</div>
        </div>
      ) : (
        <div className="card-grid">
          <AnimatePresence>
            {(activeChains.length > 0 ? inactiveChains : chains).map((chain, i) => (
              <ChainCard
                key={chain.id}
                chain={chain}
                index={i}
                onToggle={() => handleToggle(chain)}
                onEdit={() => handleEdit(chain)}
                onDelete={() => handleDelete(chain.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 편집 모달 */}
      <AnimatePresence>
        {editingChain && (
          <ChainEditModal
            chain={editingChain}
            isNew={isNew}
            onSave={handleSave}
            onClose={() => setEditingChain(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================
// 체인 카드
// =============================

function ChainCard({
  chain,
  index,
  onToggle,
  onEdit,
  onDelete,
}: {
  chain: Chain
  index: number
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const formatTime = (ts?: string) => {
    if (!ts) return '-'
    try {
      return new Date(ts).toLocaleString('ko-KR', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '-' }
  }

  return (
    <motion.div
      className={`item-card chain-card ${chain.enabled ? 'chain-card--active' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="item-card__header">
        <div className="item-card__icon chain-card__icon">{chain.icon}</div>
        <div style={{ flex: 1 }}>
          <div className="item-card__name">{chain.name}</div>
          <div className="item-card__scope">
            {chain.enabled ? '🟢 활성' : '⚫ 비활성'}
            {chain.triggerCount > 0 && ` · 발동 ${chain.triggerCount}회`}
          </div>
        </div>
        {/* 토글 스위치 */}
        <div
          className={`chain-toggle ${chain.enabled ? 'chain-toggle--active' : ''}`}
          onClick={e => { e.stopPropagation(); onToggle() }}
        >
          <div className="chain-toggle__knob" />
        </div>
      </div>

      <div className="item-card__desc">{chain.description}</div>

      {/* 체인 플로우 시각화 */}
      <ChainFlow steps={chain.steps} />

      {/* 통계 */}
      <div className="chain-card__stats">
        {chain.lastTriggeredAt && (
          <span className="chain-card__stat">마지막 발동: {formatTime(chain.lastTriggeredAt)}</span>
        )}
      </div>

      <div className="item-card__actions">
        <button className="rpg-btn" onClick={onEdit}>편집</button>
        <button className="rpg-btn rpg-btn--danger" onClick={onDelete}>삭제</button>
      </div>
    </motion.div>
  )
}

// =============================
// 체인 플로우 시각화
// =============================

function ChainFlow({ steps }: { steps: ChainStep[] }) {
  return (
    <div className="chain-flow">
      {steps.map((step, i) => {
        const meta = STEP_TYPE_META[step.type]
        const label = getStepLabel(step)
        return (
          <span key={step.id} className="chain-flow__item">
            {i > 0 && <span className="chain-flow__arrow">→</span>}
            <span
              className={`chain-flow__step chain-flow__step--${step.type}`}
              style={{ borderColor: meta.color }}
              title={label}
            >
              {meta.icon} {label}
            </span>
          </span>
        )
      })}
    </div>
  )
}

function getStepLabel(step: ChainStep): string {
  switch (step.type) {
    case 'hook_trigger':
      return `${step.config.eventType || '?'}${step.config.matcher ? `:${step.config.matcher}` : ''}`
    case 'command':
      return step.config.commandName || '?'
    case 'skill_ref':
      return step.config.skillName || '?'
    case 'agent_spawn':
      return step.config.agentType || '?'
    case 'condition':
      return `${step.config.conditionType || '?'}${step.config.conditionValue ? `(${step.config.conditionValue})` : ''}`
    default:
      return '?'
  }
}

// =============================
// 체인 편집 모달
// =============================

function ChainEditModal({
  chain,
  isNew,
  onSave,
  onClose,
}: {
  chain: Partial<Chain>
  isNew: boolean
  onSave: (chain: Partial<Chain>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(chain.name || '')
  const [description, setDescription] = useState(chain.description || '')
  const [icon, setIcon] = useState(chain.icon || '🔗')
  const [steps, setSteps] = useState<ChainStep[]>(chain.steps || [])

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { id: `s${Date.now()}`, type: 'command', config: {} },
    ])
  }

  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx))
  }

  const updateStep = (idx: number, updates: Partial<ChainStep>) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s))
  }

  const updateStepConfig = (idx: number, configUpdates: Record<string, string>) => {
    setSteps(prev => prev.map((s, i) =>
      i === idx ? { ...s, config: { ...s.config, ...configUpdates } } : s
    ))
  }

  const handleSubmit = () => {
    if (!name.trim()) return alert('콤보 이름을 입력하세요')
    if (steps.length === 0) return alert('최소 1개의 단계가 필요합니다')

    onSave({
      ...chain,
      name,
      description,
      icon,
      steps,
    })
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
        className="modal chain-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal__title">
          {isNew ? '🔗 새 콤보 생성' : '🔗 콤보 편집'}
        </div>

        {/* 기본 정보 */}
        <div className="chain-modal__row">
          <div className="modal__field" style={{ flex: 0 }}>
            <label className="modal__label">아이콘</label>
            <div className="chain-icon-picker">
              {EMOJI_OPTIONS.map(emoji => (
                <span
                  key={emoji}
                  className={`chain-icon-option ${icon === emoji ? 'chain-icon-option--active' : ''}`}
                  onClick={() => setIcon(emoji)}
                >
                  {emoji}
                </span>
              ))}
            </div>
          </div>
          <div className="modal__field" style={{ flex: 1 }}>
            <label className="modal__label">콤보 이름</label>
            <input
              className="modal__input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="코드 리뷰 콤보"
            />
          </div>
        </div>

        <div className="modal__field">
          <label className="modal__label">설명</label>
          <input
            className="modal__input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="이 콤보가 하는 일을 설명하세요"
          />
        </div>

        {/* 단계 빌더 */}
        <div className="section-divider">{'⚙️'} 단계 구성</div>
        <div className="chain-steps-builder">
          {steps.map((step, idx) => (
            <StepEditor
              key={step.id}
              step={step}
              index={idx}
              onUpdate={updates => updateStep(idx, updates)}
              onUpdateConfig={config => updateStepConfig(idx, config)}
              onRemove={() => removeStep(idx)}
            />
          ))}
          <button className="rpg-btn chain-add-step" onClick={addStep}>
            + 단계 추가
          </button>
        </div>

        {/* 미리보기 */}
        {steps.length > 0 && (
          <>
            <div className="section-divider">{'👁️'} 플로우 미리보기</div>
            <ChainFlow steps={steps} />
          </>
        )}

        <div className="modal__actions">
          <button className="rpg-btn" onClick={onClose}>취소</button>
          <button className="rpg-btn rpg-btn--primary" onClick={handleSubmit}>
            {isNew ? '콤보 생성' : '저장'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// =============================
// 단계 에디터
// =============================

function StepEditor({
  step,
  index,
  onUpdate,
  onUpdateConfig,
  onRemove,
}: {
  step: ChainStep
  index: number
  onUpdate: (updates: Partial<ChainStep>) => void
  onUpdateConfig: (config: Record<string, string>) => void
  onRemove: () => void
}) {
  const meta = STEP_TYPE_META[step.type]

  return (
    <div className="step-editor" style={{ borderLeftColor: meta.color }}>
      <div className="step-editor__header">
        <span className="step-editor__num">#{index + 1}</span>
        <select
          className="step-editor__type-select"
          value={step.type}
          onChange={e => onUpdate({ type: e.target.value as ChainStepType, config: {} })}
        >
          {Object.entries(STEP_TYPE_META).map(([key, m]) => (
            <option key={key} value={key}>{m.icon} {m.label}</option>
          ))}
        </select>
        <button className="rpg-btn rpg-btn--danger step-editor__remove" onClick={onRemove}>✕</button>
      </div>

      <div className="step-editor__fields">
        {step.type === 'hook_trigger' && (
          <>
            <select
              className="step-editor__input"
              value={step.config.eventType || ''}
              onChange={e => onUpdateConfig({ eventType: e.target.value })}
            >
              <option value="">이벤트 선택...</option>
              {Object.keys(HOOK_EVENT_TYPES).map(key => (
                <option key={key} value={key}>
                  {(HOOK_EVENT_TYPES as Record<string, { rpgName: string }>)[key]?.rpgName || key} ({key})
                </option>
              ))}
            </select>
            <input
              className="step-editor__input"
              value={step.config.matcher || ''}
              onChange={e => onUpdateConfig({ matcher: e.target.value })}
              placeholder="매처 (예: Edit|Write)"
            />
          </>
        )}
        {step.type === 'command' && (
          <input
            className="step-editor__input"
            value={step.config.commandName || ''}
            onChange={e => onUpdateConfig({ commandName: e.target.value })}
            placeholder="커맨드 이름 (예: lint)"
          />
        )}
        {step.type === 'skill_ref' && (
          <input
            className="step-editor__input"
            value={step.config.skillName || ''}
            onChange={e => onUpdateConfig({ skillName: e.target.value })}
            placeholder="스킬 이름 (예: pdf)"
          />
        )}
        {step.type === 'agent_spawn' && (
          <input
            className="step-editor__input"
            value={step.config.agentType || ''}
            onChange={e => onUpdateConfig({ agentType: e.target.value })}
            placeholder="에이전트 타입 (예: Bash)"
          />
        )}
        {step.type === 'condition' && (
          <>
            <select
              className="step-editor__input"
              value={step.config.conditionType || ''}
              onChange={e => onUpdateConfig({ conditionType: e.target.value })}
            >
              <option value="">조건 타입...</option>
              <option value="tool_match">도구 매칭</option>
              <option value="file_match">파일 매칭</option>
              <option value="always">항상 실행</option>
            </select>
            {step.config.conditionType !== 'always' && (
              <input
                className="step-editor__input"
                value={step.config.conditionValue || ''}
                onChange={e => onUpdateConfig({ conditionValue: e.target.value })}
                placeholder="매칭 패턴 (예: *.test.*)"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
