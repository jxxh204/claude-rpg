import { useApi } from '../hooks/useApi'
import type { ActiveSkill } from '../types'

export function QuickSlotBar() {
  const { data: commands } = useApi<ActiveSkill[]>('/api/commands')

  return (
    <div className="quickslot-bar">
      {commands?.slice(0, 8).map((cmd, i) => (
        <button key={cmd.name} className="quickslot">
          <span className="quickslot__key">{i + 1}</span>
          <span className="quickslot__name">/{cmd.name}</span>
        </button>
      ))}
      {(!commands || commands.length === 0) && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          {'⚔️'} Command를 등록하면 퀵슬롯에 추가됩니다
        </div>
      )}
    </div>
  )
}
