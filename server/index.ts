import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { skillsRouter } from './routes/skills.js'
import { commandsRouter } from './routes/commands.js'
import { hooksRouter } from './routes/hooks.js'
import { agentsRouter } from './routes/agents.js'
import { eventsRouter } from './routes/events.js'
import { charactersRouter } from './routes/characters.js'
import { filesystemRouter } from './routes/filesystem.js'
import { setupFileWatcher } from './watchers/fileWatcher.js'
import { setupTaskWatcher } from './watchers/taskWatcher.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

app.use(cors())
app.use(express.json())

// Socket.IO 인스턴스를 라우터에서 사용할 수 있도록
app.set('io', io)

// API Routes
app.use('/api/skills', skillsRouter)
app.use('/api/commands', commandsRouter)
app.use('/api/hooks', hooksRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/characters', charactersRouter)
app.use('/api/fs', filesystemRouter)

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

  socket.on('disconnect', () => {
    console.log('[RPG] 모험자 퇴장:', socket.id)
  })
})

// 파일 감시 시작
setupFileWatcher(io)
setupTaskWatcher(io)

const PORT = 3333
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║     ⚔️  Claude RPG Server  ⚔️        ║
║     http://localhost:${PORT}           ║
╚══════════════════════════════════════╝
  `)
})
