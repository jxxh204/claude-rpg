import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from './hooks/useRouter'
import { useSocket } from './hooks/useSocket'
import { useApi } from './hooks/useApi'
import { CharacterSelect } from './components/CharacterSelect'
import { CharCard } from './components/CharCard'
import { TabNav } from './components/TabNav'
import { PassiveSkills } from './components/PassiveSkills'
import { ActiveSkills } from './components/ActiveSkills'
import { Summons } from './components/Summons'
import { Enchants } from './components/Enchants'
import { BattleLog } from './components/BattleLog'
import { QuickSlotBar } from './components/QuickSlotBar'
import { SkillLibrary } from './components/SkillLibrary'
import { ChainEditor } from './components/ChainEditor'
import type { TabId } from './types'

interface CharacterData {
  id: string
  name: string
  type: 'global' | 'project'
  path: string
}

export default function App() {
  const { route, navigate } = useRouter()

  // 서버 선택 페이지
  if (route.page === 'server-select') {
    return <CharacterSelect navigate={navigate} />
  }

  // 캐릭터 선택 페이지
  if (route.page === 'character-select') {
    return <CharacterSelect serverId={route.serverId} navigate={navigate} />
  }

  // 캐릭터 상세 (게임 UI) 페이지
  return <PlayPage characterId={route.characterId} navigate={navigate} />
}

// =============================
// 게임 UI 페이지
// =============================

function PlayPage({
  characterId,
  navigate,
}: {
  characterId: string
  navigate: (path: string) => void
}) {
  const { data: character, loading } = useApi<CharacterData>(`/api/characters/${characterId}`)
  const [activeTab, setActiveTab] = useState<TabId>('passive')
  const { connected, events, activeSession } = useSocket()

  const renderContent = () => {
    switch (activeTab) {
      case 'passive': return <PassiveSkills />
      case 'active': return <ActiveSkills />
      case 'summons': return <Summons />
      case 'enchants': return <Enchants />
      case 'library': return <SkillLibrary />
      case 'chains': return <ChainEditor />
      default: return <PassiveSkills />
    }
  }

  // 로딩 중
  if (loading || !character) {
    return (
      <div className="character-select">
        <div className="character-select__bg" />
        <div className="character-select__content">
          <div className="character-select__loading">캐릭터 데이터 로딩 중...</div>
        </div>
      </div>
    )
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
              onClick={() => navigate('/')}
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
            <CharCard characterName={character.name} characterType={character.type} activeSession={activeSession} />
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </aside>

          {/* 중앙: 콘텐츠 */}
          <main className="rpg-content">
            {renderContent()}
          </main>

          {/* 오른쪽: 전투 로그 */}
          <BattleLog events={events} activeSession={activeSession} />
        </div>

        {/* 하단: 퀵슬롯 */}
        <QuickSlotBar />
      </motion.div>
    </AnimatePresence>
  )
}
