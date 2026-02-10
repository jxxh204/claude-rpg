import fs from 'fs-extra'
import path from 'path'
import {
  SKILLS_DIR,
  COMMANDS_DIR,
  AGENTS_DIR,
  SETTINGS_FILE,
  RECIPES_DIR,
} from '../utils/paths.js'

// 공식 스킬 카탈로그 로드 (번들된 JSON)
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OFFICIAL_CATALOG_PATH = path.join(__dirname, '..', 'data', 'official-skills.json')
const INSTALLED_MANIFEST = path.join(RECIPES_DIR, '.installed.json')

// ===== 타입 =====

interface RecipeComponent {
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

interface Recipe {
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

interface InstalledManifest {
  [recipeId: string]: {
    installedAt: string
    components: { type: string; path?: string; eventType?: string; index?: number }[]
  }
}

// ===== 서비스 =====

export class LibraryService {
  // 공식 + 로컬 카탈로그 병합
  async getCatalog(): Promise<Recipe[]> {
    const official = await this.getOfficialCatalog()
    const local = await this.getLocalRecipes()
    const manifest = await this.getInstalledManifest()

    const all = [...official, ...local]

    // 설치 상태 체크
    for (const recipe of all) {
      if (manifest[recipe.id]) {
        recipe.installedAt = manifest[recipe.id].installedAt
      }
    }

    return all
  }

  // 단일 레시피 조회
  async getRecipe(id: string): Promise<Recipe | null> {
    const catalog = await this.getCatalog()
    return catalog.find(r => r.id === id) || null
  }

  // 설치된 레시피만
  async getInstalled(): Promise<Recipe[]> {
    const catalog = await this.getCatalog()
    return catalog.filter(r => r.installedAt)
  }

  // 레시피 설치
  async installRecipe(id: string): Promise<{ success: boolean; installed: string[]; conflicts: string[] }> {
    const recipe = await this.getRecipe(id)
    if (!recipe) return { success: false, installed: [], conflicts: ['Recipe not found'] }

    const manifest = await this.getInstalledManifest()
    if (manifest[id]) return { success: false, installed: [], conflicts: ['Already installed'] }

    const installed: string[] = []
    const manifestEntry: InstalledManifest[string] = {
      installedAt: new Date().toISOString(),
      components: [],
    }

    for (const comp of recipe.components) {
      switch (comp.type) {
        case 'skill': {
          const skillDir = path.join(SKILLS_DIR, comp.name)
          await fs.ensureDir(skillDir)
          const toolsStr = (comp.allowedTools || []).join(', ')
          const md = `---
name: ${comp.name}
description: ${comp.description || recipe.description}
${toolsStr ? `allowed-tools: ${toolsStr}` : ''}
---

${comp.content || `# ${comp.name}\n\n${recipe.description}`}`
          await fs.writeFile(path.join(skillDir, 'SKILL.md'), md, 'utf-8')
          installed.push(`skill: ${comp.name}`)
          manifestEntry.components.push({ type: 'skill', path: skillDir })
          break
        }

        case 'command': {
          await fs.ensureDir(COMMANDS_DIR)
          const md = `---
name: ${comp.name}
description: ${comp.description || recipe.description}
version: ${comp.version || recipe.version}
---

${comp.content || `# ${comp.name}\n\n${recipe.description}`}`
          const filePath = path.join(COMMANDS_DIR, `${comp.name}.md`)
          await fs.writeFile(filePath, md, 'utf-8')
          installed.push(`command: ${comp.name}`)
          manifestEntry.components.push({ type: 'command', path: filePath })
          break
        }

        case 'agent': {
          await fs.ensureDir(AGENTS_DIR)
          const md = `---
name: ${comp.name}
description: ${comp.description || recipe.description}
---

${comp.content || `# ${comp.name}\n\n${recipe.description}`}`
          const filePath = path.join(AGENTS_DIR, `${comp.name}.md`)
          await fs.writeFile(filePath, md, 'utf-8')
          installed.push(`agent: ${comp.name}`)
          manifestEntry.components.push({ type: 'agent', path: filePath })
          break
        }

        case 'hook': {
          if (comp.hookConfig) {
            const settings = await this.readSettings()
            if (!settings.hooks) settings.hooks = {}
            if (!settings.hooks[comp.hookConfig.eventType]) {
              settings.hooks[comp.hookConfig.eventType] = []
            }
            const arr = settings.hooks[comp.hookConfig.eventType]
            arr.push({
              matcher: comp.hookConfig.matcher || '',
              hooks: [{
                type: 'command',
                command: comp.hookConfig.command,
                ...(comp.hookConfig.timeout ? { timeout: comp.hookConfig.timeout } : {}),
              }],
            })
            await this.writeSettings(settings)
            installed.push(`hook: ${comp.hookConfig.eventType}`)
            manifestEntry.components.push({
              type: 'hook',
              eventType: comp.hookConfig.eventType,
              index: arr.length - 1,
            })
          }
          break
        }
      }
    }

    manifest[id] = manifestEntry
    await this.saveInstalledManifest(manifest)

    return { success: true, installed, conflicts: [] }
  }

  // 레시피 제거
  async uninstallRecipe(id: string): Promise<{ success: boolean; removed: string[] }> {
    const manifest = await this.getInstalledManifest()
    if (!manifest[id]) return { success: false, removed: [] }

    const removed: string[] = []
    const entry = manifest[id]

    for (const comp of entry.components) {
      switch (comp.type) {
        case 'skill':
        case 'command':
        case 'agent':
          if (comp.path && await fs.pathExists(comp.path)) {
            await fs.remove(comp.path)
            removed.push(`${comp.type}: ${path.basename(comp.path)}`)
          }
          break

        case 'hook':
          // 훅은 인덱스가 변할 수 있으므로 주의
          // 간단히 처리: settings에서 해당 eventType의 마지막 항목 제거
          try {
            const settings = await this.readSettings()
            if (settings.hooks?.[comp.eventType!]) {
              const arr = settings.hooks[comp.eventType!]
              if (typeof comp.index === 'number' && comp.index < arr.length) {
                arr.splice(comp.index, 1)
                if (arr.length === 0) delete settings.hooks[comp.eventType!]
                await this.writeSettings(settings)
                removed.push(`hook: ${comp.eventType}`)
              }
            }
          } catch {
            // 훅 제거 실패 시 무시
          }
          break
      }
    }

    delete manifest[id]
    await this.saveInstalledManifest(manifest)

    return { success: true, removed }
  }

  // 로컬 레시피 저장
  async saveLocalRecipe(recipe: Recipe): Promise<Recipe> {
    await fs.ensureDir(RECIPES_DIR)
    recipe.source = 'local'
    recipe.author = recipe.author || 'user'
    const filePath = path.join(RECIPES_DIR, `${recipe.id}.json`)
    await fs.writeJSON(filePath, recipe, { spaces: 2 })
    return recipe
  }

  // 로컬 레시피 삭제
  async deleteLocalRecipe(id: string): Promise<boolean> {
    const filePath = path.join(RECIPES_DIR, `${id}.json`)
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath)
      return true
    }
    return false
  }

  // ===== Private =====

  private async getOfficialCatalog(): Promise<Recipe[]> {
    try {
      if (await fs.pathExists(OFFICIAL_CATALOG_PATH)) {
        return fs.readJSON(OFFICIAL_CATALOG_PATH)
      }
    } catch { /* */ }
    return []
  }

  private async getLocalRecipes(): Promise<Recipe[]> {
    try {
      await fs.ensureDir(RECIPES_DIR)
      const files = await fs.readdir(RECIPES_DIR)
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.'))
      const recipes: Recipe[] = []
      for (const file of jsonFiles) {
        try {
          const recipe = await fs.readJSON(path.join(RECIPES_DIR, file))
          recipes.push(recipe)
        } catch { /* skip invalid */ }
      }
      return recipes
    } catch {
      return []
    }
  }

  private async getInstalledManifest(): Promise<InstalledManifest> {
    try {
      await fs.ensureDir(RECIPES_DIR)
      if (await fs.pathExists(INSTALLED_MANIFEST)) {
        return fs.readJSON(INSTALLED_MANIFEST)
      }
    } catch { /* */ }
    return {}
  }

  private async saveInstalledManifest(manifest: InstalledManifest): Promise<void> {
    await fs.ensureDir(RECIPES_DIR)
    await fs.writeJSON(INSTALLED_MANIFEST, manifest, { spaces: 2 })
  }

  private async readSettings(): Promise<Record<string, any>> {
    if (!await fs.pathExists(SETTINGS_FILE)) return {}
    return fs.readJSON(SETTINGS_FILE)
  }

  private async writeSettings(settings: Record<string, any>): Promise<void> {
    await fs.writeJSON(SETTINGS_FILE, settings, { spaces: 2 })
  }
}
