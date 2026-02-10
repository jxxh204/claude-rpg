import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { chmodSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { skillsRouter } from './routes/skills.js'
import { commandsRouter } from './routes/commands.js'
import { hooksRouter } from './routes/hooks.js'
import { agentsRouter } from './routes/agents.js'
import { eventsRouter } from './routes/events.js'
import { charactersRouter } from './routes/characters.js'
import { filesystemRouter } from './routes/filesystem.js'
import { statsRouter } from './routes/stats.js'
import { libraryRouter } from './routes/library.js'
import { chainsRouter } from './routes/chains.js'
import { setupFileWatcher } from './watchers/fileWatcher.js'
import { setupTaskWatcher } from './watchers/taskWatcher.js'
import { TrackingService } from './services/trackingService.js'

// =============================
// Hook 스크립트 실행 권한 확인
// =============================
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const hookScript = path.join(__dirname, 'hooks', 'rpg-hook.sh')
if (existsSync(hookScript)) {
  try {
    chmodSync(hookScript, 0o755)
    console.log('[RPG] Hook 스크립트 준비:', hookScript)
  } catch { /* skip */ }
}

// =============================
// 추적 서비스 초기화
// =============================
const tracking = new TrackingService()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

app.use(cors())
app.use(express.json())

// Socket.IO 인스턴스를 라우터에서 사용할 수 있도록
app.set('io', io)
app.set('tracking', tracking)

// API Routes
app.use('/api/skills', skillsRouter)
app.use('/api/commands', commandsRouter)
app.use('/api/hooks', hooksRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/characters', charactersRouter)
app.use('/api/fs', filesystemRouter)
app.use('/api/stats', statsRouter)
app.use('/api/library', libraryRouter)
app.use('/api/chains', chainsRouter)

// 상태 체크
app.get('/api/status', (_req, res) => {
  res.json({
    name: 'Claude',
    title: 'Autonomous Agent',
    level: '??',
    status: 'active',
  })
})

// Socket.IO 연결
io.on('connection', (socket) => {
  console.log('[RPG] 모험자 접속:', socket.id)

  // 접속 시 현재 활성 세션 전송
  const activeSession = tracking.getActiveSession()
  if (activeSession) {
    socket.emit('rpg:session_update', activeSession)
  }

  socket.on('disconnect', () => {
    console.log('[RPG] 모험자 퇴장:', socket.id)
  })
})

// 파일 감시 시작
setupFileWatcher(io)
setupTaskWatcher(io)

// =============================
// 서버 시작
// =============================

const PORT = 3333

async function start() {
  // 추적 데이터 로드
  await tracking.load()

  httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║     ⚔️  Claude RPG Server  ⚔️        ║
║     http://localhost:${PORT}           ║
╚══════════════════════════════════════╝
    `)
  })
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[RPG] 서버 종료 중...')
  await tracking.shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await tracking.shutdown()
  process.exit(0)
})

start()
