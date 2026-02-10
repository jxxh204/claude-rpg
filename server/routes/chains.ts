import { Router, Request, Response } from 'express'
import { ChainService } from '../services/chainService.js'

const chainService = new ChainService()
chainService.load()

export const chainsRouter = Router()

// 전체 체인 목록
chainsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(chainService.getAll())
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 콤보 템플릿
chainsRouter.get('/templates', async (_req: Request, res: Response) => {
  try {
    res.json(chainService.getTemplates())
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 단일 체인
chainsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const chain = chainService.getById(id)
    if (!chain) return res.status(404).json({ error: 'Chain not found' })
    res.json(chain)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 체인 생성
chainsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const chain = await chainService.create(req.body)
    const io = req.app.get('io')
    if (io) io.emit('rpg:config_change', { type: 'chains' })
    res.json(chain)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 체인 수정
chainsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const chain = await chainService.update(id, req.body)
    if (!chain) return res.status(404).json({ error: 'Chain not found' })
    const io = req.app.get('io')
    if (io) io.emit('rpg:config_change', { type: 'chains' })
    res.json(chain)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 체인 삭제
chainsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const ok = await chainService.remove(id)
    if (!ok) return res.status(404).json({ error: 'Chain not found' })
    const io = req.app.get('io')
    if (io) io.emit('rpg:config_change', { type: 'chains' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 활성화 (settings.json에 훅 쓰기)
chainsRouter.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const result = await chainService.activate(id)
    if (result.success) {
      const io = req.app.get('io')
      if (io) io.emit('rpg:config_change', { type: 'chains' })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 비활성화 (훅 제거)
chainsRouter.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const result = await chainService.deactivate(id)
    if (result.success) {
      const io = req.app.get('io')
      if (io) io.emit('rpg:config_change', { type: 'chains' })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 발동 기록 (훅 스크립트가 호출)
chainsRouter.post('/trigger/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    await chainService.recordTrigger(id)
    const chain = chainService.getById(id)

    // 전투 로그로 콤보 발동 이벤트 전송
    if (chain) {
      const io = req.app.get('io')
      if (io) {
        io.emit('rpg:event', {
          id: `chain-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'ChainTrigger',
          rpgMessage: `🔗 콤보 발동: ${chain.name} (${chain.triggerCount}회째)`,
          rpgIcon: 'combo',
          chainId: chain.id,
          chainName: chain.name,
        })
      }
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
