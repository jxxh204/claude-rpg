// === 패시브 스킬 (Skills) ===
export interface PassiveSkill {
  name: string
  description: string
  allowedTools: string[]
  content: string
  filePath: string
}

// === 액티브 스킬 (Commands) ===
export interface ActiveSkill {
  name: string
  description: string
  version: string
  content: string
  filePath: string
  scope: 'global' | 'project'
}

// === 소환수 (SubAgents) ===
export interface SummonType {
  name: string
  description: string
  tools: string[]
  model: string
  icon: string
  scope: 'builtin' | 'global' | 'project'
}

export interface ActiveSummon {
  id: string
  taskId: string
  subject: string
  status: 'in_progress' | 'pending' | 'completed'
  activeForm: string
}

// === 인챈트 (Hooks) ===
export interface HookEntry {
  type: string
  command: string
  timeout?: number
}

export interface HookRule {
  matcher: string
  hooks: HookEntry[]
}

export type HooksData = Record<string, HookRule[]>

// Hook 이벤트 타입과 RPG 매핑
export const HOOK_EVENT_TYPES = {
  PreToolUse: { rpgName: '공격 전 발동', icon: 'shield', color: '#ff6b6b' },
  PostToolUse: { rpgName: '공격 후 발동', icon: 'sword', color: '#4ecdc4' },
  Stop: { rpgName: '전투 종료 시', icon: 'skull', color: '#95a5a6' },
  Notification: { rpgName: '알림 이벤트', icon: 'bell', color: '#f39c12' },
  UserPromptSubmit: { rpgName: '명령 입력 시', icon: 'scroll', color: '#9b59b6' },
  SubagentStart: { rpgName: '소환 시', icon: 'summon', color: '#3498db' },
} as const

// === 전투 로그 ===
export interface BattleEvent {
  id: string
  timestamp: string
  type: string
  rpgMessage: string
  rpgIcon: string
  tool?: string
  agentType?: string
  fileEvent?: string
  category?: string
}

// === 탭 ===
export type TabId = 'status' | 'passive' | 'active' | 'summons' | 'enchants'
