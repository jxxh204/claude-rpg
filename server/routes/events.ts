import { Router } from 'express'
import type { Server } from 'socket.io'

export const eventsRouter = Router()

// Hook에서 전송하는 실시간 이벤트 수신
eventsRouter.post('/', (req, res) => {
  const io: Server = req.app.get('io')
  const event = req.body

  const timestamp = new Date().toISOString()
  const rpgEvent = {
    ...event,
    timestamp,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }

  // RPG 스타일 메시지 변환
  switch (event.type) {
    case 'pre_tool':
      rpgEvent.rpgMessage = `인챈트 [PreToolUse] 발동! ${event.tool || ''}`
      rpgEvent.rpgIcon = 'shield'
      break
    case 'post_tool':
      rpgEvent.rpgMessage = `[${event.tool || 'Unknown'}] 스킬 적중!`
      rpgEvent.rpgIcon = 'sword'
      break
    case 'stop':
      rpgEvent.rpgMessage = '전투 종료! 경험치 획득'
      rpgEvent.rpgIcon = 'skull'
      break
    case 'user_prompt':
      rpgEvent.rpgMessage = '모험자의 명령 수신!'
      rpgEvent.rpgIcon = 'lightning'
      break
    case 'subagent_start':
      rpgEvent.rpgMessage = `소환수 [${event.agentType || 'Unknown'}] 소환!`
      rpgEvent.rpgIcon = 'summon'
      break
    case 'subagent_end':
      rpgEvent.rpgMessage = `소환수 [${event.agentType || 'Unknown'}] 임무 완료. 소멸`
      rpgEvent.rpgIcon = 'vanish'
      break
    default:
      rpgEvent.rpgMessage = `알 수 없는 이벤트: ${event.type}`
      rpgEvent.rpgIcon = 'question'
  }

  // WebSocket으로 브로드캐스트
  io.emit('rpg:event', rpgEvent)

  res.json({ received: true })
})
