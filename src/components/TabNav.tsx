import { useApi } from '../hooks/useApi'
import type { TabId, PassiveSkill, ActiveSkill, HooksData, SummonType, Recipe, Chain } from '../types'

interface TabNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'passive', icon: '📕', label: '스킬북 Skills' },
  { id: 'active', icon: '⚔️', label: '커맨드 Commands' },
  { id: 'summons', icon: '🐲', label: '에이전트 Agents' },
  { id: 'enchants', icon: '🔮', label: '인챈트 Hooks' },
  { id: 'library', icon: '🏪', label: '상점 Library' },
  { id: 'chains', icon: '🔗', label: '체인 Chains' },
]

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const { data: skills } = useApi<PassiveSkill[]>('/api/skills')
  const { data: commands } = useApi<ActiveSkill[]>('/api/commands')
  const { data: agents } = useApi<SummonType[]>('/api/agents/types')
  const { data: hooks } = useApi<HooksData>('/api/hooks')
  const { data: recipes } = useApi<Recipe[]>('/api/library')
  const { data: chains } = useApi<Chain[]>('/api/chains')

  const getCounts = (id: TabId): number => {
    switch (id) {
      case 'passive': return skills?.length ?? 0
      case 'active': return commands?.length ?? 0
      case 'summons': return agents?.length ?? 0
      case 'enchants': return hooks ? Object.keys(hooks).length : 0
      case 'library': return recipes?.length ?? 0
      case 'chains': return chains?.length ?? 0
      default: return 0
    }
  }

  return (
    <nav className="rpg-tabs">
      <div className="rpg-tabs__list">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`rpg-tab ${activeTab === tab.id ? 'rpg-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="rpg-tab__icon">{tab.icon}</span>
            {tab.label}
            <span className="rpg-tab__count">{getCounts(tab.id)}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
