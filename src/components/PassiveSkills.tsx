import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import type { PassiveSkill } from '../types'

export function PassiveSkills() {
  const { data: skills, loading, refetch } = useApi<PassiveSkill[]>('/api/skills')
  const [showCreate, setShowCreate] = useState(false)
  const [editSkill, setEditSkill] = useState<PassiveSkill | null>(null)

  const handleDelete = async (name: string) => {
    if (!confirm(`패시브 스킬 "${name}"을(를) 분해하시겠습니까?`)) return
    await fetch(`/api/skills/${name}`, { method: 'DELETE' })
    refetch()
  }

  return (
    <div>
      <div className="panel-title">
        {'📕'} 패시브 스킬
        <button className="rpg-btn rpg-btn--primary" onClick={() => setShowCreate(true)}>
          + 새 스킬 습득
        </button>
      </div>

      {/* 장착 슬롯 */}
      <div className="section-divider">{'🔒'} 장착 슬롯</div>
      <div className="slot-grid">
        {skills?.slice(0, 6).map((skill, i) => (
          <motion.div
            key={skill.name}
            className="slot slot--equipped"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            title={skill.name}
            onClick={() => setEditSkill(skill)}
          >
            {'📕'}
            <span className="slot__level">{skill.allowedTools.length}</span>
          </motion.div>
        ))}
        {Array.from({ length: Math.max(0, 6 - (skills?.length ?? 0)) }).map((_, i) => (
          <div key={`empty-${i}`} className="slot" onClick={() => setShowCreate(true)}>
            +
          </div>
        ))}
      </div>

      {/* 보유 스킬 목록 */}
      <div className="section-divider">{'📜'} 보유 스킬 목록</div>
      {loading ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'⏳'}</div>
          <div className="empty-state__text">로딩 중...</div>
        </div>
      ) : !skills?.length ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'📕'}</div>
          <div className="empty-state__text">습득한 패시브 스킬이 없습니다</div>
          <div className="empty-state__sub">~/.claude/skills/ 에 스킬을 추가하세요</div>
        </div>
      ) : (
        <div className="card-grid">
          <AnimatePresence>
            {skills.map((skill, i) => (
              <motion.div
                key={skill.name}
                className="item-card item-card--active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="item-card__header">
                  <div className="item-card__icon item-card__icon--passive">{'📕'}</div>
                  <div>
                    <div className="item-card__name">{skill.name}</div>
                    <div className="item-card__scope">PASSIVE</div>
                  </div>
                </div>
                <div className="item-card__desc">{skill.description}</div>
                <div className="item-card__tags">
                  {skill.allowedTools.map(tool => (
                    <span key={tool} className="item-card__tag">{tool}</span>
                  ))}
                </div>
                <div className="item-card__actions">
                  <button className="rpg-btn" onClick={() => setEditSkill(skill)}>편집</button>
                  <button className="rpg-btn rpg-btn--danger" onClick={() => handleDelete(skill.name)}>분해</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 생성 모달 */}
      <AnimatePresence>
        {(showCreate || editSkill) && (
          <SkillModal
            skill={editSkill}
            onClose={() => { setShowCreate(false); setEditSkill(null) }}
            onSaved={refetch}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SkillModal({
  skill,
  onClose,
  onSaved,
}: {
  skill: PassiveSkill | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [tools, setTools] = useState(skill?.allowedTools.join(', ') ?? 'Read, Glob, Grep, Write, Edit, Bash')
  const [content, setContent] = useState(skill?.content ?? '')
  const isEdit = !!skill

  const handleSubmit = async () => {
    const body = {
      name,
      description,
      allowedTools: tools.split(',').map(s => s.trim()).filter(Boolean),
      content,
    }

    const url = isEdit ? `/api/skills/${skill.name}` : '/api/skills'
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
          {isEdit ? '패시브 스킬 강화' : '새 패시브 스킬 습득'}
        </div>

        <div className="modal__field">
          <label className="modal__label">스킬 이름</label>
          <input
            className="modal__input"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isEdit}
            placeholder="my-skill"
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">설명 (description)</label>
          <input
            className="modal__input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="이 스킬의 역할을 설명하세요"
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">허용 도구 (allowed-tools)</label>
          <input
            className="modal__input"
            value={tools}
            onChange={e => setTools(e.target.value)}
            placeholder="Read, Glob, Grep, Write, Edit, Bash"
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">스킬 내용 (SKILL.md 본문)</label>
          <textarea
            className="modal__textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="# 스킬 설명&#10;&#10;이 스킬이 활성화되면..."
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
