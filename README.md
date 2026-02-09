# ⚔️ Claude RPG

> Claude Code의 설정 시스템을 RPG 게임 UI로 시각화하는 로컬 웹 앱

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio)

## 컨셉

Claude Code의 설정 요소들을 RPG 게임 세계관으로 매핑합니다.

| Claude Code | RPG 세계관 | 설명 |
|---|---|---|
| `~/.claude/skills/` | 📕 패시브 스킬 | 자동 적용되는 마크다운 룰 |
| `~/.claude/commands/` | ⚔️ 액티브 스킬 | `/slash` 커맨드로 발동 |
| `~/.claude/agents/` | 🐲 소환수 | SubAgent 도감 & 활성 상태 |
| `settings.json` hooks | 🔮 인챈트 | 이벤트 트리거 룬 시스템 |
| 프로젝트 폴더 | 🏰 게임 서버 | 폴더 = 서버, 프로젝트 = 캐릭터 |

## 주요 기능

- **캐릭터 선택 시스템** — 폴더(서버) 선택 → 프로젝트(캐릭터) 선택, `.claude/` 폴더가 있는 프로젝트 자동 인식
- **파일 탐색기** — 서버 사이드 디렉토리 브라우저로 게임 서버(폴더) 등록
- **즐겨찾기** — 자주 사용하는 캐릭터를 ⭐ 즐겨찾기로 빠른 접근
- **패시브 스킬 관리** — Skills 디렉토리의 마크다운 파일 CRUD
- **액티브 스킬 관리** — Commands 디렉토리의 슬래시 커맨드 생성/편집/삭제
- **소환수 도감** — 내장 + 커스텀 SubAgent 타입 열람, 활성 Task 실시간 모니터링
- **인챈트 시스템** — Hook 이벤트 타입별 룬(규칙) 추가/삭제
- **실시간 전투 로그** — Socket.IO를 통한 Claude Code 이벤트 실시간 수신
- **퀵슬롯 바** — 상위 8개 커맨드 바로가기

## 스크린샷

```
🏰 게임 서버 선택  →  ⚔️ 캐릭터 선택  →  📕📜🐲🔮 탭 전환
```

## 설치 & 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (프론트 + 백엔드 동시 실행)
npm run dev
```

- **프론트엔드**: http://localhost:5173
- **백엔드 API**: http://localhost:3333

## 프로젝트 구조

```
├── server/                  # Express 백엔드
│   ├── index.ts             # 서버 엔트리 (Express + Socket.IO)
│   ├── routes/
│   │   ├── skills.ts        # 패시브 스킬 CRUD
│   │   ├── commands.ts      # 액티브 스킬 CRUD
│   │   ├── hooks.ts         # 인챈트(Hook) 관리
│   │   ├── agents.ts        # 소환수(SubAgent) 조회
│   │   ├── characters.ts    # 캐릭터/서버/즐겨찾기 관리
│   │   ├── filesystem.ts    # 디렉토리 탐색 API
│   │   └── events.ts        # 실시간 이벤트 수신
│   ├── utils/
│   │   ├── parsers.ts       # 마크다운 frontmatter 파서
│   │   └── paths.ts         # Claude 디렉토리 경로 유틸
│   └── watchers/
│       ├── fileWatcher.ts   # 파일 변경 감지 (chokidar)
│       └── taskWatcher.ts   # Task 상태 감시
│
├── src/                     # React 프론트엔드
│   ├── main.tsx             # 엔트리
│   ├── App.tsx              # 메인 레이아웃
│   ├── components/
│   │   ├── CharacterSelect.tsx   # 서버/캐릭터 선택 + 즐겨찾기
│   │   ├── FileBrowser.tsx       # 폴더 탐색기
│   │   ├── PassiveSkills.tsx     # 패시브 스킬 탭
│   │   ├── ActiveSkills.tsx      # 액티브 스킬 탭
│   │   ├── Summons.tsx           # 소환수 탭
│   │   ├── Enchants.tsx          # 인챈트 탭
│   │   ├── BattleLog.tsx         # 실시간 전투 로그
│   │   ├── QuickSlotBar.tsx      # 퀵슬롯 바
│   │   ├── TabNav.tsx            # 탭 네비게이션
│   │   └── CharCard.tsx          # 캐릭터 카드
│   ├── hooks/
│   │   ├── useApi.ts        # API 호출 훅
│   │   └── useSocket.ts     # Socket.IO 연결 훅
│   ├── styles/
│   │   └── rpg-theme.css    # RPG 다크 테마 스타일
│   └── types/
│       └── index.ts         # TypeScript 타입 정의
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React 19, TypeScript, Vite 7 |
| 애니메이션 | Framer Motion |
| 실시간 통신 | Socket.IO |
| 백엔드 | Express 5, tsx |
| 파일 감시 | chokidar |
| 마크다운 파싱 | gray-matter |
| 파일 시스템 | fs-extra |

## 전투 로그 연결

캐릭터(프로젝트) 선택 후 **"⚡ 전투 로그 연결"** 버튼을 클릭하면, 해당 프로젝트의 `.claude/settings.local.json`에 Hook이 자동 등록됩니다. 이후 Claude Code를 사용하면 실시간으로 전투 로그에 이벤트가 표시됩니다.

## 설정 파일

- `~/.claude/rpg-config.json` — 등록된 게임 서버(폴더) 목록 및 즐겨찾기
- `~/.claude/settings.json` — 글로벌 Claude Code 설정
- `프로젝트/.claude/settings.local.json` — 프로젝트별 설정

## 라이선스

MIT
