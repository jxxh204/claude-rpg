import { watch } from 'chokidar'
import fs from 'fs-extra'
import type { Server } from 'socket.io'
import { TASKS_DIR } from '../utils/paths.js'

export function setupTaskWatcher(io: Server) {
  const watcher = watch(TASKS_DIR, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 500 },
  })

  watcher.on('add', async (filePath) => {
    if (!filePath.endsWith('.json')) return
    try {
      const data = await fs.readJSON(filePath)
      io.emit('rpg:summon', {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: 'summon_appear',
        taskId: data.id,
        subject: data.subject || data.description || 'Unknown',
        status: data.status,
        rpgMessage: `소환수 등장! "${data.subject || 'Unknown'}"`,
        rpgIcon: 'summon',
      })
      io.emit('rpg:event', {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: 'subagent_start',
        rpgMessage: `소환수 등장! "${data.subject || 'Unknown'}"`,
        rpgIcon: 'summon',
      })
    } catch { /* skip */ }
  })

  watcher.on('change', async (filePath) => {
    if (!filePath.endsWith('.json')) return
    try {
      const data = await fs.readJSON(filePath)
      if (data.status === 'completed') {
        io.emit('rpg:summon', {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          type: 'summon_vanish',
          taskId: data.id,
          subject: data.subject || data.description || 'Unknown',
          status: 'completed',
          rpgMessage: `소환수 임무 완료! "${data.subject || 'Unknown'}" 소멸`,
          rpgIcon: 'vanish',
        })
        io.emit('rpg:event', {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          type: 'subagent_end',
          rpgMessage: `소환수 임무 완료! 소멸`,
          rpgIcon: 'vanish',
        })
      } else {
        io.emit('rpg:summon', {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          type: 'summon_update',
          taskId: data.id,
          subject: data.subject || data.description || 'Unknown',
          status: data.status,
          activeForm: data.activeForm || '',
        })
      }
    } catch { /* skip */ }
  })

  console.log('[RPG] 소환수 감시 시작됨')
}
