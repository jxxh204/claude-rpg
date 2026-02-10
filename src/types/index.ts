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
  PostToolUseFailure: { rpgName: '공격 실패 시', icon: 'fail', color: '#e74c3c' },
  Stop: { rpgName: '전투 종료 시', icon: 'skull', color: '#95a5a6' },
  Notification: { rpgName: '알림 이벤트', icon: 'bell', color: '#f39c12' },
  UserPromptSubmit: { rpgName: '명령 입력 시', icon: 'scroll', color: '#9b59b6' },
  SubagentStart: { rpgName: '소환 시', icon: 'summon', color: '#3498db' },
  SubagentStop: { rpgName: '소환 해제 시', icon: 'vanish', color: '#2980b9' },
  SessionStart: { rpgName: '세션 시작', icon: 'castle', color: '#27ae60' },
  SessionEnd: { rpgName: '세션 종료', icon: 'door', color: '#7f8c8d' },
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
  agentId?: string
  fileEvent?: string
  category?: string
  // 추적 필드
  sessionId?: string
  toolInputSummary?: string
  prompt?: string
  error?: string
  duration?: number
  isSessionStart?: boolean
  isSessionEnd?: boolean
  sessionSummary?: {
    toolCount: number
    agentCount: number
    durationMs: number
  }
  // 체이닝
  chainId?: string
  chainName?: string
}

// === 세션 추적 ===
export interface AgentSpawn {
  agentId: string
  agentType: string
  startedAt: string
  endedAt?: string
  durationMs?: number
}

export interface Session {
  id: string
  startedAt: string
  endedAt?: string
  durationMs?: number
  prompt?: string
  cwd?: string
  toolUsage: Record<string, number>
  agentSpawns: AgentSpawn[]
  eventCount: number
  status: 'active' | 'completed'
}

export interface TrackingData {
  totalSessions: number
  totalToolUses: number
  totalAgentSpawns: number
  totalDurationMs: number
  toolRanking: Record<string, number>
  agentRanking: Record<string, number>
  dailyActivity: { date: string; sessions: number; tools: number }[]
  recentSessions: Session[]
}

// === 스킬 라이브러리 (Library) ===
export interface RecipeComponent {
  type: 'skill' | 'command' | 'hook' | 'agent'
  name: string
  content?: string
  description?: string
  allowedTools?: string[]
  version?: string
  hookConfig?: {
    eventType: string
    matcher: string
    command: string
    timeout?: number
  }
}

export interface Recipe {
  id: string
  name: string
  description: string
  author: string
  version: string
  tags: string[]
  components: RecipeComponent[]
  source: 'official' | 'community' | 'local'
  githubUrl?: string
  installedAt?: string
  icon: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

// === 체이닝 시스템 (Chains) ===
export type ChainStepType = 'hook_trigger' | 'command' | 'skill_ref' | 'agent_spawn' | 'condition'

export interface ChainStep {
  id: string
  type: ChainStepType
  config: {
    eventType?: string
    matcher?: string
    commandName?: string
    skillName?: string
    agentType?: string
    conditionType?: 'tool_match' | 'file_match' | 'always'
    conditionValue?: string
  }
}

export interface Chain {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  steps: ChainStep[]
  createdAt: string
  lastTriggeredAt?: string
  triggerCount: number
}

// === 탭 ===
export type TabId = 'status' | 'passive' | 'active' | 'summons' | 'enchants' | 'library' | 'chains'
