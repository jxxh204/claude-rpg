import { Router } from 'express'
import { LibraryService } from '../services/libraryService.js'

export const libraryRouter = Router()
const library = new LibraryService()

// 전체 카탈로그 (공식 + 로컬, 설치 상태 포함)
libraryRouter.get('/', async (_req, res) => {
  try {
    const catalog = await library.getCatalog()
    res.json(catalog)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 설치된 레시피만
libraryRouter.get('/installed', async (_req, res) => {
  try {
    const installed = await library.getInstalled()
    res.json(installed)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 단일 레시피 상세
libraryRouter.get('/:id', async (req, res) => {
  try {
    const recipe = await library.getRecipe(req.params.id)
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
    res.json(recipe)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 레시피 설치
libraryRouter.post('/install/:id', async (req, res) => {
  try {
    const result = await library.installRecipe(req.params.id)
    const io = req.app.get('io')
    if (result.success && io) {
      io.emit('rpg:config_change', {
        type: 'library_install',
        rpgMessage: `새로운 레시피 설치 완료!`,
        rpgIcon: 'config',
      })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 레시피 제거
libraryRouter.post('/uninstall/:id', async (req, res) => {
  try {
    const result = await library.uninstallRecipe(req.params.id)
    const io = req.app.get('io')
    if (result.success && io) {
      io.emit('rpg:config_change', {
        type: 'library_uninstall',
        rpgMessage: `레시피 제거 완료`,
        rpgIcon: 'config',
      })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 로컬 레시피 저장
libraryRouter.post('/recipes', async (req, res) => {
  try {
    const recipe = await library.saveLocalRecipe(req.body)
    res.json(recipe)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 로컬 레시피 삭제
libraryRouter.delete('/recipes/:id', async (req, res) => {
  try {
    const success = await library.deleteLocalRecipe(req.params.id)
    if (!success) return res.status(404).json({ error: 'Recipe not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
