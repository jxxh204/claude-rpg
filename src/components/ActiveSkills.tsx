import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import type { ActiveSkill } from '../types'

export function ActiveSkills() {
  const { data: commands, loading, refetch } = useApi<ActiveSkill[]>('/api/commands')
  const [showCreate, setShowCreate] = useState(false)
  const [editCmd, setEditCmd] = useState<ActiveSkill | null>(null)
  const [casting, setCasting] = useState<string | null>(null)

  const handleDelete = async (name: string) => {
    if (!confirm(`액티브 스킬 "/${name}"을(를) 분해하시겠습니까?`)) return
    await fetch(`/api/commands/${name}`, { method: 'DELETE' })
    refetch()
  }

  const handleCast = (name: string) => {
    setCasting(name)
    setTimeout(() => setCasting(null), 2000)
  }

  return (
    <div>
      <div className="panel-title">
        {'⚔️'} 액티브 스킬
        <button className="rpg-btn rpg-btn--primary" onClick={() => setShowCreate(true)}>
          + 새 스킬 습득
        </button>
      </div>

      {/* 퀵슬롯 미리보기 */}
      <div className="section-divider">{'🎯'} 퀵슬롯</div>
      <div className="slot-grid">
        {commands?.slice(0, 8).map((cmd, i) => (
          <motion.div
            key={cmd.name}
            className={`slot slot--filled ${casting === cmd.name ? 'slot--equipped' : ''}`}
            initial={{ scale: 0 }}
            animate={{ scale: casting === cmd.name ? [1, 1.2, 1] : 1 }}
            transition={{ delay: i * 0.05 }}
            title={`/${cmd.name}`}
            onClick={() => handleCast(cmd.name)}
          >
            {'⚔️'}
            <span className="slot__level">{i + 1}</span>
          </motion.div>
        ))}
      </div>

      {/* 스킬 목록 */}
      <div className="section-divider">{'📜'} 전역 스킬 (~/.claude/commands/)</div>
      {loading ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'⏳'}</div>
          <div className="empty-state__text">로딩 중...</div>
        </div>
      ) : !commands?.length ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'⚔️'}</div>
          <div className="empty-state__text">습득한 액티브 스킬이 없습니다</div>
          <div className="empty-state__sub">~/.claude/commands/ 에 커맨드를 추가하세요</div>
        </div>
      ) : (
        <div className="card-grid">
          <AnimatePresence>
            {commands.map((cmd, i) => (
              <motion.div
                key={cmd.name}
                className={`item-card ${casting === cmd.name ? 'item-card--active' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="item-card__header">
                  <div className="item-card__icon item-card__icon--active">{'⚔️'}</div>
                  <div>
                    <div className="item-card__name">/{cmd.name}</div>
                    <div className="item-card__scope">v{cmd.version} / {cmd.scope.toUpperCase()}</div>
                  </div>
                </div>
                <div className="item-card__desc">{cmd.description}</div>
                <div className="item-card__actions">
                  <button
                    className="rpg-btn rpg-btn--cast"
                    onClick={() => handleCast(cmd.name)}
                  >
                    {'🎯'} 발동
                  </button>
                  <button className="rpg-btn" onClick={() => setEditCmd(cmd)}>편집</button>
                  <button className="rpg-btn rpg-btn--danger" onClick={() => handleDelete(cmd.name)}>분해</button>
                </div>

                {/* 시전 이펙트 */}
                <AnimatePresence>
                  {casting === cmd.name && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(231, 76, 60, 0.15)',
                        borderRadius: '8px',
                        fontSize: '32px',
                        pointerEvents: 'none',
                      }}
                    >
                      {'💥'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 생성/편집 모달 */}
      <AnimatePresence>
        {(showCreate || editCmd) && (
          <CommandModal
            command={editCmd}
            onClose={() => { setShowCreate(false); setEditCmd(null) }}
            onSaved={refetch}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CommandModal({
  command,
  onClose,
  onSaved,
}: {
  command: ActiveSkill | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(command?.name ?? '')
  const [description, setDescription] = useState(command?.description ?? '')
  const [version, setVersion] = useState(command?.version ?? '1.0.0')
  const [content, setContent] = useState(command?.content ?? '')
  const isEdit = !!command

  const handleSubmit = async () => {
    const body = { name, description, version, content }
    const url = isEdit ? `/api/commands/${command.name}` : '/api/commands'
    const method = isEdit ? 'PUT' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
          {isEdit ? '액티브 스킬 강화' : '새 액티브 스킬 습득'}
        </div>

        <div className="modal__field">
          <label className="modal__label">커맨드 이름 (슬래시 뒤에 올 이름)</label>
          <input
            className="modal__input"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isEdit}
            placeholder="my-command"
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">설명</label>
          <input
            className="modal__input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="이 커맨드의 역할을 설명하세요"
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">버전</label>
          <input
            className="modal__input"
            value={version}
            onChange={e => setVersion(e.target.value)}
            placeholder="1.0.0"
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">커맨드 내용 (마크다운)</label>
          <textarea
            className="modal__textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="# 사용법&#10;&#10;이 커맨드는..."
          />
        </div>

        <div className="modal__actions">
          <button className="rpg-btn" onClick={onClose}>취소</button>
          <button className="rpg-btn rpg-btn--primary" onClick={handleSubmit}>
            {isEdit ? '강화 완료' : '스킬 습득'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
