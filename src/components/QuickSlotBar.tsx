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
          {'⚔️'} 액티브 스킬을 습득하면 퀵슬롯에 등록됩니다
        </div>
      )}
    </div>
  )
}
