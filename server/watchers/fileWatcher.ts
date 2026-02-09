import { watch } from 'chokidar'
import type { Server } from 'socket.io'
import { SKILLS_DIR, COMMANDS_DIR, AGENTS_DIR, SETTINGS_FILE } from '../utils/paths.js'

export function setupFileWatcher(io: Server) {
  const watchPaths = [
    SKILLS_DIR,
    COMMANDS_DIR,
    AGENTS_DIR,
    SETTINGS_FILE,
  ]

  const watcher = watch(watchPaths, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 300 },
  })

  watcher.on('all', (event, filePath) => {
    let category = 'unknown'
    if (filePath.includes('/skills/')) category = 'passive_skill'
    else if (filePath.includes('/commands/')) category = 'active_skill'
    else if (filePath.includes('/agents/')) category = 'agent'
    else if (filePath.includes('settings')) category = 'enchant'

    const rpgEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: 'config_change',
      fileEvent: event,
      filePath,
      category,
      rpgMessage: getConfigChangeMessage(event, category),
      rpgIcon: 'config',
    }

    io.emit('rpg:config_change', rpgEvent)
    io.emit('rpg:event', rpgEvent)
  })

  console.log('[RPG] 파일 감시 시작됨')
}

function getConfigChangeMessage(event: string, category: string): string {
  const categoryNames: Record<string, string> = {
    passive_skill: '패시브 스킬',
    active_skill: '액티브 스킬',
    agent: '소환수',
    enchant: '인챈트',
  }
  const name = categoryNames[category] || '알 수 없는 설정'

  switch (event) {
    case 'add': return `새로운 ${name} 습득!`
    case 'change': return `${name} 강화 완료!`
    case 'unlink': return `${name} 분해됨...`
    default: return `${name} 변경 감지`
  }
}
