import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import type { Chain, ChainStep, ChainStepType } from '../types'
import { HOOK_EVENT_TYPES } from '../types'

// 단계 타입 메타 — 아이콘, 라벨, 색상, 설명(툴팁)
const STEP_TYPE_META: Record<ChainStepType, {
  icon: string; label: string; color: string; description: string
}> = {
  hook_trigger: {
    icon: '⚡', label: '트리거', color: '#f1c40f',
    description: 'Claude Code 이벤트(도구 사용, 세션 시작 등)를 감지하여 콤보를 시작합니다. 반드시 첫 번째 단계여야 합니다.',
  },
  command: {
    icon: '⚔️', label: '커맨드', color: '#e74c3c',
    description: '슬래시 커맨드(/lint, /test 등)를 실행합니다. ~/.claude/commands/ 에 정의된 커맨드를 사용합니다.',
  },
  skill_ref: {
    icon: '📕', label: '스킬', color: '#9b59b6',
    description: '스킬(SKILL.md)을 참조합니다. ~/.claude/skills/ 에 설치된 스킬을 연결합니다.',
  },
  agent_spawn: {
    icon: '🐲', label: '소환', color: '#1abc9c',
    description: '서브에이전트(Bash, Explore 등)를 소환합니다. 자동화된 작업 수행에 활용됩니다.',
  },
  condition: {
    icon: '🔷', label: '조건', color: '#3498db',
    description: '조건 분기입니다. 도구 매칭, 파일 패턴 매칭 등을 판별하여 이후 단계 실행 여부를 결정합니다.',
  },
}

// 아이콘 드롭다운 옵션 — 카테고리별 정리
const ICON_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: '🔗', label: '🔗 체인' },
  { emoji: '⚡', label: '⚡ 번개' },
  { emoji: '🔥', label: '🔥 화염' },
  { emoji: '💫', label: '💫 마법' },
  { emoji: '🌀', label: '🌀 소용돌이' },
  { emoji: '🗡️', label: '🗡️ 검' },
  { emoji: '🛡️', label: '🛡️ 방패' },
  { emoji: '💎', label: '💎 보석' },
  { emoji: '🌟', label: '🌟 별' },
  { emoji: '🎯', label: '🎯 과녁' },
  { emoji: '🎪', label: '🎪 서커스' },
  { emoji: '🔮', label: '🔮 수정구' },
  { emoji: '⚔️', label: '⚔️ 교차검' },
  { emoji: '🏹', label: '🏹 활' },
  { emoji: '🧪', label: '🧪 실험' },
  { emoji: '📜', label: '📜 두루마리' },
]

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

  const moveStep = (idx: number, direction: -1 | 1) => {
    const target = idx + direction
    if (target < 0 || target >= steps.length) return
    setSteps(prev => {
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
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
          <div className="modal__field" style={{ flex: '0 0 auto' }}>
            <label className="modal__label">아이콘</label>
            <select
              className="chain-icon-select"
              value={icon}
              onChange={e => setIcon(e.target.value)}
            >
              {ICON_OPTIONS.map(opt => (
                <option key={opt.emoji} value={opt.emoji}>
                  {opt.label}
                </option>
              ))}
            </select>
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
          <textarea
            className="modal__input chain-desc-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="이 콤보가 하는 일을 설명하세요 (예: 코드 수정 후 자동으로 린트 → 테스트 → 리뷰를 실행합니다)"
            rows={2}
          />
        </div>

        {/* 단계 빌더 */}
        <div className="section-divider">{'⚙️'} 단계 구성</div>
        <p className="chain-steps-guide">
          트리거(이벤트 감지) → 동작(커맨드/스킬/소환) 순으로 단계를 구성하세요. 각 단계 위에 마우스를 올리면 설명을 볼 수 있습니다.
        </p>
        <div className="chain-steps-builder">
          {steps.map((step, idx) => (
            <StepEditor
              key={step.id}
              step={step}
              index={idx}
              total={steps.length}
              onUpdate={updates => updateStep(idx, updates)}
              onUpdateConfig={config => updateStepConfig(idx, config)}
              onRemove={() => removeStep(idx)}
              onMoveUp={() => moveStep(idx, -1)}
              onMoveDown={() => moveStep(idx, 1)}
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

// 타입별 필드 안내 문구
const STEP_FIELD_HINTS: Record<ChainStepType, string> = {
  hook_trigger: '어떤 이벤트에 반응할지 선택하고, 필요시 매처 패턴을 지정하세요.',
  command: '실행할 슬래시 커맨드 이름을 입력하세요. (~/.claude/commands/ 디렉토리 참조)',
  skill_ref: '참조할 스킬 디렉토리 이름을 입력하세요. (~/.claude/skills/ 디렉토리 참조)',
  agent_spawn: '소환할 에이전트 타입을 입력하세요. (Bash, Explore, Plan 등)',
  condition: '조건을 설정하여 이후 단계의 실행 여부를 제어합니다.',
}

function StepEditor({
  step,
  index,
  total,
  onUpdate,
  onUpdateConfig,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ChainStep
  index: number
  total: number
  onUpdate: (updates: Partial<ChainStep>) => void
  onUpdateConfig: (config: Record<string, string>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const meta = STEP_TYPE_META[step.type]
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="step-editor" style={{ borderLeftColor: meta.color }}>
      {/* 단계 간 연결 화살표 (첫 번째 아닌 경우) */}
      {index > 0 && (
        <div className="step-editor__connector">
          <span className="step-editor__connector-arrow">↓</span>
        </div>
      )}

      <div className="step-editor__header">
        <span className="step-editor__num" style={{ color: meta.color }}>#{index + 1}</span>

        {/* 타입 선택 드롭다운 */}
        <select
          className="step-editor__type-select"
          value={step.type}
          onChange={e => onUpdate({ type: e.target.value as ChainStepType, config: {} })}
        >
          {Object.entries(STEP_TYPE_META).map(([key, m]) => (
            <option key={key} value={key}>{m.icon} {m.label}</option>
          ))}
        </select>

        {/* 툴팁 토글 */}
        <span
          className="step-editor__tooltip-trigger"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          ❓
          {showTooltip && (
            <div className="step-editor__tooltip">
              <div className="step-editor__tooltip-title">{meta.icon} {meta.label}</div>
              <div className="step-editor__tooltip-desc">{meta.description}</div>
            </div>
          )}
        </span>

        {/* 순서 이동 버튼 */}
        <div className="step-editor__order-btns">
          <button
            className="step-editor__order-btn"
            onClick={onMoveUp}
            disabled={index === 0}
            title="위로 이동"
          >▲</button>
          <button
            className="step-editor__order-btn"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="아래로 이동"
          >▼</button>
        </div>

        <button className="rpg-btn rpg-btn--danger step-editor__remove" onClick={onRemove}>✕</button>
      </div>

      {/* 필드 안내 문구 */}
      <div className="step-editor__hint">{STEP_FIELD_HINTS[step.type]}</div>

      <div className="step-editor__fields">
        {step.type === 'hook_trigger' && (
          <>
            <div className="step-editor__field-group">
              <label className="step-editor__field-label">이벤트 타입</label>
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
            </div>
            <div className="step-editor__field-group">
              <label className="step-editor__field-label">매처 패턴 <span className="step-editor__optional">(선택)</span></label>
              <input
                className="step-editor__input"
                value={step.config.matcher || ''}
                onChange={e => onUpdateConfig({ matcher: e.target.value })}
                placeholder="예: Edit|Write (정규식, 비우면 모든 이벤트)"
              />
            </div>
          </>
        )}
        {step.type === 'command' && (
          <div className="step-editor__field-group">
            <label className="step-editor__field-label">커맨드 이름</label>
            <input
              className="step-editor__input"
              value={step.config.commandName || ''}
              onChange={e => onUpdateConfig({ commandName: e.target.value })}
              placeholder="예: lint, test, review"
            />
          </div>
        )}
        {step.type === 'skill_ref' && (
          <div className="step-editor__field-group">
            <label className="step-editor__field-label">스킬 이름</label>
            <input
              className="step-editor__input"
              value={step.config.skillName || ''}
              onChange={e => onUpdateConfig({ skillName: e.target.value })}
              placeholder="예: pdf, code-review, frontend-design"
            />
          </div>
        )}
        {step.type === 'agent_spawn' && (
          <div className="step-editor__field-group">
            <label className="step-editor__field-label">에이전트 타입</label>
            <input
              className="step-editor__input"
              value={step.config.agentType || ''}
              onChange={e => onUpdateConfig({ agentType: e.target.value })}
              placeholder="예: Bash, Explore, Plan"
            />
          </div>
        )}
        {step.type === 'condition' && (
          <>
            <div className="step-editor__field-group">
              <label className="step-editor__field-label">조건 타입</label>
              <select
                className="step-editor__input"
                value={step.config.conditionType || ''}
                onChange={e => onUpdateConfig({ conditionType: e.target.value })}
              >
                <option value="">조건 타입 선택...</option>
                <option value="tool_match">도구 매칭 — 특정 도구 사용 시</option>
                <option value="file_match">파일 매칭 — 파일 패턴 일치 시</option>
                <option value="always">항상 실행 — 무조건 통과</option>
              </select>
            </div>
            {step.config.conditionType && step.config.conditionType !== 'always' && (
              <div className="step-editor__field-group">
                <label className="step-editor__field-label">매칭 패턴</label>
                <input
                  className="step-editor__input"
                  value={step.config.conditionValue || ''}
                  onChange={e => onUpdateConfig({ conditionValue: e.target.value })}
                  placeholder={step.config.conditionType === 'tool_match' ? '예: Edit|Write' : '예: *.test.*, src/**/*.tsx'}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
