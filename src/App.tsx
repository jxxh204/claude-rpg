import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSocket } from './hooks/useSocket'
import { CharacterSelect } from './components/CharacterSelect'
import { CharCard } from './components/CharCard'
import { TabNav } from './components/TabNav'
import { PassiveSkills } from './components/PassiveSkills'
import { ActiveSkills } from './components/ActiveSkills'
import { Summons } from './components/Summons'
import { Enchants } from './components/Enchants'
import { BattleLog } from './components/BattleLog'
import { QuickSlotBar } from './components/QuickSlotBar'
import type { TabId } from './types'

interface SelectedCharacter {
  id: string
  name: string
  type: 'global' | 'project'
  path: string
}

export default function App() {
  const [character, setCharacter] = useState<SelectedCharacter | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('passive')
  const { connected, events } = useSocket()

  const renderContent = () => {
    switch (activeTab) {
      case 'passive': return <PassiveSkills />
      case 'active': return <ActiveSkills />
      case 'summons': return <Summons />
      case 'enchants': return <Enchants />
      default: return <PassiveSkills />
    }
  }

  // 캐릭터 미선택 → 선택 화면
  if (!character) {
    return <CharacterSelect onSelect={setCharacter} />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="rpg-app"
        key="main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 상단 헤더 */}
        <header className="rpg-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="rpg-btn"
              onClick={() => setCharacter(null)}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              {'◀'} 캐릭터 선택
            </button>
            <div className="rpg-header__title">
              {character.type === 'global' ? '🌍' : '⚔️'} {character.name}
            </div>
          </div>
          <div className="rpg-header__status">
            <div className={`rpg-header__dot ${connected ? '' : 'rpg-header__dot--off'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </header>

        {/* 메인 3단 레이아웃 */}
        <div className="rpg-main">
          {/* 왼쪽: 캐릭터 + 탭 */}
          <aside className="rpg-sidebar">
            <CharCard characterName={character.name} characterType={character.type} />
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </aside>

          {/* 중앙: 콘텐츠 */}
          <main className="rpg-content">
            {renderContent()}
          </main>

          {/* 오른쪽: 전투 로그 */}
          <BattleLog events={events} />
        </div>

        {/* 하단: 퀵슬롯 */}
        <QuickSlotBar />
      </motion.div>
    </AnimatePresence>
  )
}
