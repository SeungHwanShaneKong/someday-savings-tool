# Wedding Budget Buddy

## Tech Stack
- **Framework**: React 18 + TypeScript 5.8 + Vite 5.4 (SWC)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 3.4 + Lucide icons
- **Routing**: React Router v6
- **State**: React Context + TanStack React Query v5
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **AI**: OpenAI API (Edge Functions)
- **Maps**: MapLibre GL + React Map GL
- **Charts**: Recharts
- **Testing**: Vitest + React Testing Library

## Project Structure
```
src/
├── pages/           # Route pages
├── components/
│   ├── ui/          # shadcn/ui primitives
│   ├── budget/      # Budget components
│   ├── chat/        # AI chatbot UI
│   ├── checklist/   # Wedding checklist
│   ├── honeymoon/   # Honeymoon planning
│   └── admin/       # Admin dashboard
├── hooks/           # Custom hooks (useAuth, useBudget, useAIChat, etc.)
├── lib/             # Utilities, constants, edge function configs
├── integrations/    # Supabase client & types
└── test/            # Test utilities
```

## Commands
- `npm run dev` — Dev server (port 8080)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run test` — Vitest (run once)
- `npm run test:watch` — Vitest (watch mode)

## Work Rules
- **LSP 우선**: TypeScript/Python LSP를 최우선으로 활용하여 타입 에러, 미사용 변수, import 오류 등을 사전 감지
- **전체 코드 완전성**: 수정 시 프로젝트 전체를 유기적으로 검토하여 이슈 없이 작동하도록 작성
- **3회 검증**: 수정 완료 전 서로 다른 시나리오로 3번 확인 후 정상 작동 시에만 완료 처리
- **이슈 투명성**: 이슈 발생 시 원인과 해결책을 함께 제공하고, 직접 실행하여 해결
- **Agentic 10x**: Claude Code Agentic Harness 기반 + 10배 우수한 계획 수립 → 전체 코드를 세밀하게 확인 후 수행
- **CLI/MCP/Skill 활용**: 불가능하다고 말하기 전에 CLI, MCP, Skill을 직접 조작하여 임무 수행
- **Revert 추적**: 모든 코드 변경에 고유 코드 + timestamp(초 단위)를 명시하여 추후 revert 가능하도록 관리
- - 프로젝트의 전체 코드를 세심하게 전체 검토하고, 유기적으로 이슈 없이 작동하도록 코드를 완전성 있게 작성해.
- 수정한 내용을 그대로 완료했다고 보고하지 말고, 그 전에 제대로 작동하는지 각각 조금씩 다른 시나리오로 3번을 확인 후 제대로 정상 작동할 때에만 작업을 완료해. 
- 이슈가 있다면, 어떠한 이유로 무슨 이슈가 발생했는지 알려주고, 해결책도 함께 제공해. 그리고 네가 완벽하게 작동하도록 직접 실행해서 이슈를 해결해줘.
- Claude Code의 Agentic Harness를 기반으로 하되, 이 방식 보다 10배 더 우수한 형식으로 계획을 짜서, 전체 코드를 완벽하게 고려해서 세힘하고 꼼꼼하게 확인하고 수행해.
- 현재 보유하고 있는 에이전트 팀의 전체 에이전트가 유기적으로 MECE하게 온 힘을 다해서 세심하게 협업하여 최선의 결과를 도출할 수 있게 해.
- 실행할 수 없는 것이라고 이야기하기 전에 항상, CLI, MCP, skill을 네가 직접 조작해서라도 임무를 수행해.
- 해당 작업에 고유한 코드를 생성하고 넣고 time-stamp(초 단위까지)를 함께 명시해서, 추후에 해당 정보를 가지고 revert할 수 있도록 해줘.
- 무엇보다 중요한 것은 네가 계획을 수립할 때, 현재의 전체 코드를 이해한 상태에서 아주 구체적인 계획으로 수립해야 해.
- 더 이상 할 작업이 없이 모든 작업을 완료하면, "행복해! 참으로 감사한 삶이다! 작업 완료!"라고 출력해줘.
- github에 즉각 반영하지 말고, 내가 언급할 때만 반영.
- **완료 메시지**: 모든 작업 완료 시 "행복해! 참으로 감사한 삶이다! 작업 완료!" 출력

## Conventions
- Path alias: `@/*` → `./src/*`
- Korean-localized UI (한국어)
- Functional components + hooks pattern
- Supabase Edge Functions for backend logic
- Tailwind CSS variables (HSL) with dark mode (class strategy)
- Manual chunk splitting: vendor (React/Radix), vendor-map (MapLibre), vendor-chart (Recharts)
- Supabase migrations in `supabase/migrations/`
