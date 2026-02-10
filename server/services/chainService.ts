import fs from 'fs-extra'
import path from 'path'
import { CHAINS_FILE, CHAIN_SCRIPTS_DIR, SETTINGS_FILE } from '../utils/paths.js'

// ===== 타입 =====

type ChainStepType = 'hook_trigger' | 'command' | 'skill_ref' | 'agent_spawn' | 'condition'

interface ChainStep {
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

interface Chain {
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

interface ChainsData {
  version: string
  chains: Chain[]
}

// ===== 서비스 =====

export class ChainService {
  private data: ChainsData = { version: '1.0', chains: [] }

  async load(): Promise<void> {
    try {
      if (await fs.pathExists(CHAINS_FILE)) {
        this.data = await fs.readJSON(CHAINS_FILE)
      }
    } catch {
      this.data = { version: '1.0', chains: [] }
    }
  }

  private async save(): Promise<void> {
    await fs.writeJSON(CHAINS_FILE, this.data, { spaces: 2 })
  }

  // CRUD
  getAll(): Chain[] {
    return this.data.chains
  }

  getById(id: string): Chain | undefined {
    return this.data.chains.find(c => c.id === id)
  }

  async create(chain: Omit<Chain, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'>): Promise<Chain> {
    const newChain: Chain = {
      ...chain,
      createdAt: new Date().toISOString(),
      triggerCount: 0,
    }
    this.data.chains.push(newChain)
    await this.save()
    return newChain
  }

  async update(id: string, updates: Partial<Chain>): Promise<Chain | null> {
    const idx = this.data.chains.findIndex(c => c.id === id)
    if (idx === -1) return null
    this.data.chains[idx] = { ...this.data.chains[idx], ...updates }
    await this.save()
    return this.data.chains[idx]
  }

  async remove(id: string): Promise<boolean> {
    const idx = this.data.chains.findIndex(c => c.id === id)
    if (idx === -1) return false

    // 활성화되어 있으면 먼저 비활성화
    if (this.data.chains[idx].enabled) {
      await this.deactivate(id)
    }

    this.data.chains.splice(idx, 1)
    await this.save()
    return true
  }

  // 체인 컴파일 → settings.json 훅으로 변환
  async activate(id: string): Promise<{ success: boolean; error?: string }> {
    const chain = this.getById(id)
    if (!chain) return { success: false, error: 'Chain not found' }

    // 트리거 step 찾기
    const triggerStep = chain.steps.find(s => s.type === 'hook_trigger')
    if (!triggerStep || !triggerStep.config.eventType) {
      return { success: false, error: 'No hook_trigger step found' }
    }

    // 체인 스크립트 생성
    await fs.ensureDir(CHAIN_SCRIPTS_DIR)
    const scriptPath = path.join(CHAIN_SCRIPTS_DIR, `${id}.sh`)
    const scriptContent = this.generateScript(chain)
    await fs.writeFile(scriptPath, scriptContent, 'utf-8')
    await fs.chmod(scriptPath, 0o755)

    // settings.json에 훅 추가
    const settings = await this.readSettings()
    if (!settings.hooks) settings.hooks = {}
    const eventType = triggerStep.config.eventType
    if (!settings.hooks[eventType]) settings.hooks[eventType] = []

    // 기존 동일 체인 훅 제거 후 추가
    settings.hooks[eventType] = settings.hooks[eventType].filter(
      (rule: any) => !rule.hooks?.some((h: any) => h.command?.includes(`# rpg-chain:${id}`))
    )

    settings.hooks[eventType].push({
      matcher: triggerStep.config.matcher || '',
      hooks: [{
        type: 'command',
        command: `${scriptPath} # rpg-chain:${id}`,
        timeout: 10,
      }],
    })

    await this.writeSettings(settings)

    // 체인 활성화 상태 저장
    chain.enabled = true
    await this.save()

    return { success: true }
  }

  async deactivate(id: string): Promise<{ success: boolean }> {
    const chain = this.getById(id)
    if (!chain) return { success: false }

    // settings.json에서 체인 훅 제거
    const settings = await this.readSettings()
    if (settings.hooks) {
      for (const eventType of Object.keys(settings.hooks)) {
        settings.hooks[eventType] = settings.hooks[eventType].filter(
          (rule: any) => !rule.hooks?.some((h: any) => h.command?.includes(`# rpg-chain:${id}`))
        )
        if (settings.hooks[eventType].length === 0) {
          delete settings.hooks[eventType]
        }
      }
      await this.writeSettings(settings)
    }

    // 스크립트 삭제
    const scriptPath = path.join(CHAIN_SCRIPTS_DIR, `${id}.sh`)
    if (await fs.pathExists(scriptPath)) {
      await fs.remove(scriptPath)
    }

    chain.enabled = false
    await this.save()

    return { success: true }
  }

  // 체인 발동 기록
  async recordTrigger(id: string): Promise<void> {
    const chain = this.getById(id)
    if (chain) {
      chain.triggerCount++
      chain.lastTriggeredAt = new Date().toISOString()
      await this.save()
    }
  }

  // 기본 콤보 템플릿
  getTemplates(): Partial<Chain>[] {
    return [
      {
        id: 'code-review-combo',
        name: '코드 리뷰 콤보',
        description: 'Edit 후 자동으로 린트 실행 + 리뷰 에이전트 소환',
        icon: '🔍',
        steps: [
          { id: 's1', type: 'hook_trigger', config: { eventType: 'PostToolUse', matcher: 'Edit' } },
          { id: 's2', type: 'command', config: { commandName: 'lint' } },
          { id: 's3', type: 'agent_spawn', config: { agentType: 'coderabbit:code-reviewer' } },
        ],
      },
      {
        id: 'pr-magic',
        name: 'PR 마법',
        description: '세션 종료 시 PR 요약 자동 생성',
        icon: '✨',
        steps: [
          { id: 's1', type: 'hook_trigger', config: { eventType: 'Stop' } },
          { id: 's2', type: 'command', config: { commandName: 'pr-summary' } },
          { id: 's3', type: 'skill_ref', config: { skillName: 'code-review' } },
        ],
      },
      {
        id: 'test-shield',
        name: '테스트 방패',
        description: '테스트 파일 작성 시 테스트 러너 자동 실행',
        icon: '🛡️',
        steps: [
          { id: 's1', type: 'hook_trigger', config: { eventType: 'PostToolUse', matcher: 'Write' } },
          { id: 's2', type: 'condition', config: { conditionType: 'file_match', conditionValue: '*.test.*|*.spec.*' } },
          { id: 's3', type: 'agent_spawn', config: { agentType: 'Bash' } },
        ],
      },
    ]
  }

  // ===== Private =====

  private generateScript(chain: Chain): string {
    const lines = [
      '#!/bin/bash',
      `# Chain: ${chain.id} - ${chain.name} (auto-generated)`,
      'INPUT=$(cat)',
      '',
      '# RPG 서버에 이벤트 전달',
      'echo "$INPUT" | curl -s http://localhost:3333/api/events \\',
      '  -X POST -H \'Content-Type: application/json\' \\',
      '  --data-binary @- 2>/dev/null',
      '',
      '# 체인 발동 기록',
      `curl -s http://localhost:3333/api/chains/trigger/${chain.id} \\`,
      '  -X POST -H \'Content-Type: application/json\' \\',
      `  -d '{"timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' 2>/dev/null`,
      '',
      'exit 0',
    ]
    return lines.join('\n')
  }

  private async readSettings(): Promise<Record<string, any>> {
    if (!await fs.pathExists(SETTINGS_FILE)) return {}
    return fs.readJSON(SETTINGS_FILE)
  }

  private async writeSettings(settings: Record<string, any>): Promise<void> {
    await fs.writeJSON(SETTINGS_FILE, settings, { spaces: 2 })
  }
}
