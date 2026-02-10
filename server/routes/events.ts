import { Router } from 'express'
import type { Server } from 'socket.io'
import type { TrackingService } from '../services/trackingService.js'
import type { RpgEvent } from '../models/tracking.js'
import path from 'path'

export const eventsRouter = Router()

// =============================
// Hook에서 전송하는 실시간 이벤트 수신
// =============================

eventsRouter.post('/', (req, res) => {
  const io: Server = req.app.get('io')
  const tracking: TrackingService = req.app.get('tracking')
  const raw = req.body

  const timestamp = new Date().toISOString()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // 새 형식(stdin JSON, hook_event_name 포함) vs 레거시(curl, type 필드)
  const isNewFormat = !!raw.hook_event_name

  const rpgEvent: RpgEvent = isNewFormat
    ? mapNewFormatEvent(raw, id, timestamp)
    : mapLegacyEvent(raw, id, timestamp)

  // 추적 서비스에 기록
  if (tracking) {
    tracking.handleEvent(rpgEvent)
  }

  // WebSocket으로 브로드캐스트
  io.emit('rpg:event', rpgEvent)

  // 활성 세션 업데이트도 브로드캐스트
  if (tracking) {
    const activeSession = tracking.getActiveSession()
    if (activeSession) {
      io.emit('rpg:session_update', activeSession)
    }
  }

  res.json({ received: true })
})

// =============================
// 새 형식 이벤트 매핑 (stdin JSON)
// =============================

function mapNewFormatEvent(raw: Record<string, unknown>, id: string, timestamp: string): RpgEvent {
  const eventName = raw.hook_event_name as string
  const toolName = raw.tool_name as string | undefined
  const toolInput = raw.tool_input as Record<string, unknown> | undefined
  const toolResponse = raw.tool_response as Record<string, unknown> | undefined
  const sessionId = raw.session_id as string | undefined
  const agentType = raw.agent_type as string | undefined
  const agentId = raw.agent_id as string | undefined
  const cwd = raw.cwd as string | undefined
  const prompt = raw.prompt as string | undefined
  const error = raw.error as string | undefined

  const base: RpgEvent = {
    id,
    timestamp,
    type: eventName,
    rpgMessage: '',
    rpgIcon: 'question',
    tool: toolName,
    agentType,
    agentId,
    sessionId,
    cwd,
  }

  const inputSummary = toolInput ? summarizeToolInput(toolName, toolInput) : undefined
  if (inputSummary) base.toolInputSummary = inputSummary

  switch (eventName) {
    case 'PreToolUse':
      base.rpgMessage = `🛡️ [${toolName || '?'}] 시전 준비${inputSummary ? `... ${inputSummary}` : ''}`
      base.rpgIcon = 'shield'
      break

    case 'PostToolUse':
      base.rpgMessage = `⚔️ [${toolName || '?'}] 적중!${inputSummary ? ` ${inputSummary}` : ''}`
      base.rpgIcon = 'sword'
      break

    case 'PostToolUseFailure':
      base.rpgMessage = `❌ [${toolName || '?'}] 실패!${error ? ` ${truncate(error, 60)}` : ''}`
      base.rpgIcon = 'fail'
      base.error = error
      break

    case 'UserPromptSubmit':
      base.rpgMessage = `⚡ 모험자의 명령: "${truncate(prompt || '...', 50)}"`
      base.rpgIcon = 'lightning'
      base.prompt = prompt
      base.isSessionStart = true
      break

    case 'Stop':
      base.rpgMessage = '💀 전투 종료!'
      base.rpgIcon = 'skull'
      base.isSessionEnd = true
      break

    case 'SubagentStart':
      base.rpgMessage = `🐲 [${agentType || '?'}] 소환!`
      base.rpgIcon = 'summon'
      break

    case 'SubagentStop':
      base.rpgMessage = `💨 [${agentType || '?'}] 임무 완료`
      base.rpgIcon = 'vanish'
      break

    case 'Notification': {
      const msg = raw.message as string | undefined
      const notifType = raw.notification_type as string | undefined
      base.rpgMessage = `📨 알림${notifType ? ` [${notifType}]` : ''}: ${truncate(msg || '...', 50)}`
      base.rpgIcon = 'bell'
      break
    }

    case 'SessionStart': {
      const source = raw.source as string | undefined
      const model = raw.model as string | undefined
      const modelShort = model ? model.split('-').slice(0, 2).join('-') : '?'
      base.rpgMessage = `🏰 세션 시작 (${modelShort}${source ? `, ${source}` : ''})`
      base.rpgIcon = 'castle'
      break
    }

    case 'SessionEnd': {
      const reason = raw.reason as string | undefined
      base.rpgMessage = `🚪 세션 종료${reason ? ` (${reason})` : ''}`
      base.rpgIcon = 'door'
      base.isSessionEnd = true
      break
    }

    default:
      base.rpgMessage = `❓ 이벤트: ${eventName}`
      base.rpgIcon = 'question'
  }

  return base
}

// =============================
// 레거시 형식 이벤트 매핑 (curl)
// =============================

function mapLegacyEvent(raw: Record<string, unknown>, id: string, timestamp: string): RpgEvent {
  const type = raw.type as string
  const tool = raw.tool as string | undefined
  const agentType = raw.agentType as string | undefined

  const base: RpgEvent = {
    id,
    timestamp,
    type: mapLegacyType(type),
    rpgMessage: '',
    rpgIcon: 'question',
    tool,
    agentType,
  }

  switch (type) {
    case 'pre_tool':
      base.rpgMessage = `🛡️ [${tool || '?'}] 시전 준비`
      base.rpgIcon = 'shield'
      break
    case 'post_tool':
      base.rpgMessage = `⚔️ [${tool || '?'}] 적중!`
      base.rpgIcon = 'sword'
      break
    case 'stop':
      base.rpgMessage = '💀 전투 종료!'
      base.rpgIcon = 'skull'
      base.isSessionEnd = true
      break
    case 'user_prompt':
      base.rpgMessage = '⚡ 모험자의 명령 수신!'
      base.rpgIcon = 'lightning'
      base.isSessionStart = true
      break
    case 'subagent_start':
      base.rpgMessage = `🐲 [${agentType || '?'}] 소환!`
      base.rpgIcon = 'summon'
      break
    case 'subagent_end':
      base.rpgMessage = `💨 [${agentType || '?'}] 임무 완료`
      base.rpgIcon = 'vanish'
      break
    default:
      base.rpgMessage = `❓ 이벤트: ${type}`
      base.rpgIcon = 'question'
  }

  return base
}

// 레거시 type → 새 type 매핑
function mapLegacyType(type: string): string {
  const map: Record<string, string> = {
    'pre_tool': 'PreToolUse',
    'post_tool': 'PostToolUse',
    'stop': 'Stop',
    'user_prompt': 'UserPromptSubmit',
    'subagent_start': 'SubagentStart',
    'subagent_end': 'SubagentStop',
  }
  return map[type] || type
}

// =============================
// 도구 입력 요약
// =============================

function summarizeToolInput(toolName: string | undefined, input: Record<string, unknown>): string | undefined {
  if (!toolName) return undefined

  switch (toolName) {
    case 'Edit':
    case 'Write':
    case 'Read': {
      const fp = input.file_path as string | undefined
      return fp ? shortenPath(fp) : undefined
    }
    case 'Bash': {
      const cmd = input.command as string | undefined
      return cmd ? truncate(cmd, 40) : undefined
    }
    case 'Glob': {
      const pattern = input.pattern as string | undefined
      return pattern ? `"${pattern}"` : undefined
    }
    case 'Grep': {
      const pattern = input.pattern as string | undefined
      return pattern ? `/${truncate(pattern, 30)}/` : undefined
    }
    case 'WebFetch': {
      const url = input.url as string | undefined
      return url ? truncate(url, 40) : undefined
    }
    case 'WebSearch': {
      const query = input.query as string | undefined
      return query ? `"${truncate(query, 30)}"` : undefined
    }
    case 'Task': {
      const desc = input.description as string | undefined
      const subType = input.subagent_type as string | undefined
      return subType ? `[${subType}]${desc ? ` ${truncate(desc, 30)}` : ''}` : undefined
    }
    default:
      return undefined
  }
}

// =============================
// 유틸
// =============================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

function shortenPath(fullPath: string): string {
  // 프로젝트 내 상대 경로로 변환
  const parts = fullPath.split(path.sep)
  if (parts.length <= 3) return fullPath
  return parts.slice(-3).join('/')
}
