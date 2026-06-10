# ATS System Architecture

## Overview

This diagram describes the ATS application architecture and its main runtime flow.

- Browser UI: recruiter-facing pages in `app/`
- Auth: NextAuth credentials with JWT sessions and route protection via `middleware.ts`
- API: Next.js App Router route handlers under `app/api/`
- Business services: `lib/` modules for database access, LLM parsing, automation, and audit
- Data: PostgreSQL through Prisma
- External services: Gemini for resume parsing and Resend for emails
- Automation: workflow engine and cron endpoint

## Architecture Diagram

```mermaid
flowchart LR
  subgraph Browser
    Browser[Recruiter Browser]
  end

  subgraph Nextjs[Next.js App (app router)]
    UI[Pages /app/*]
    AuthRoute[API: /api/auth/*]
    ParseResume[/api/parse-resume]
    Candidates[/api/candidates]
    CandidateDetail[/api/candidates/[id]]
    Jobs[/api/jobs]
    Dashboard[/api/dashboard]
    Pipeline[/api/pipeline]
    AuditRoute[/api/audit]
    ProjectMatches[/api/project-matches]
    AutomationsRules[/api/automations/rules]
    AutomationsMessages[/api/automations/messages]
    AutomationsRun[/api/automations/run]
    CronWorkflows[/api/cron/workflows]
  end

  subgraph AuthLayer[Authentication]
    NextAuth[NextAuth Credentials + JWT]
    AuthLib[lib/auth.ts]
    SessionLib[lib/session.ts]
    Middleware[middleware.ts]
  end

  subgraph Business[Application Services]
    DbLib[lib/db.ts]
    CandidateRepo[lib/candidate-repository.ts]
    ApplicationRepo[lib/application-repository.ts]
    JobRepo[lib/job-repository.ts]
    DashboardMetrics[lib/dashboard-metrics.ts]
    WorkflowEngine[lib/workflow-engine.ts]
    AuditLog[lib/audit-log.ts]
    LlmParser[lib/llm-parser.ts]
    TextExtraction[lib/text-extraction.ts]
    Credibility[lib/credibility.ts]
    FlattenResume[lib/flatten-resume.ts]
    Email[lib/email.ts]
  end

  subgraph Data[Database]
    Prisma[Prisma Client]
    Postgres[PostgreSQL Database]
  end

  subgraph External[External Services]
    Gemini[Google Gemini API]
    Resend[Resend Email API]
  end

  Browser -->|GET / POST| UI
  Browser -->|API requests| ParseResume
  Browser -->|API requests| Candidates
  Browser -->|API requests| CandidateDetail
  Browser -->|API requests| Jobs
  Browser -->|API requests| Dashboard
  Browser -->|API requests| Pipeline
  Browser -->|API requests| AuditRoute
  Browser -->|API requests| ProjectMatches
  Browser -->|API requests| AutomationsRules
  Browser -->|API requests| AutomationsMessages
  Browser -->|API requests| AutomationsRun
  Browser -->|API requests| CronWorkflows

  Browser -->|login POST| AuthRoute
  AuthRoute -->|credentials| AuthLib
  AuthLib -->|user lookup| Prisma
  AuthLib -->|session callback| SessionLib
  Middleware -->|protect routes| UI
  Middleware -->|protect routes| ParseResume
  Middleware -->|protect routes| Candidates
  Middleware -->|protect routes| CandidateDetail
  Middleware -->|protect routes| Jobs
  Middleware -->|protect routes| Dashboard
  Middleware -->|protect routes| Pipeline
  Middleware -->|protect routes| AuditRoute
  Middleware -->|protect routes| ProjectMatches
  Middleware -->|protect routes| AutomationsRules
  Middleware -->|protect routes| AutomationsMessages
  Middleware -->|protect routes| AutomationsRun

  ParseResume -->|parse text| LlmParser
  ParseResume -->|extract text| TextExtraction
  ParseResume -->|save candidate| CandidateRepo
  ParseResume -->|create application| ApplicationRepo
  ParseResume -->|compute credibility| Credibility
  ParseResume -->|audit event| AuditLog
  ParseResume -->|flatten resume| FlattenResume
  ParseResume -->|maybe email| Email
  ParseResume -->|workflow hook| WorkflowEngine

  Jobs -->|save / list jobs| JobRepo
  Jobs -->|run match| JobRepo
  Dashboard -->|metrics| DashboardMetrics
  Pipeline -->|application updates| ApplicationRepo
  ProjectMatches -->|peer matching| CandidateRepo
  AutomationsRules -->|rule state| WorkflowEngine
  AutomationsMessages -->|templates| WorkflowEngine
  AutomationsRun -->|execute rules| WorkflowEngine
  CronWorkflows -->|scheduled task| WorkflowEngine

  CandidateRepo -->|ORM| Prisma
  ApplicationRepo -->|ORM| Prisma
  JobRepo -->|ORM| Prisma
  DashboardMetrics -->|ORM| Prisma
  WorkflowEngine -->|ORM| Prisma
  AuditLog -->|ORM| Prisma
  TextExtraction -->|file text| Browser

  Prisma -->|database operations| Postgres
  LlmParser -->|HTTP request| Gemini
  Email -->|HTTP request| Resend
  WorkflowEngine -->|audits| AuditLog

  Cron[Scheduler / Cron Caller] -->|POST /api/cron/workflows| CronWorkflows

  classDef service fill:#f8f9fa,stroke:#4a5568,stroke-width:1px;
  classDef database fill:#edf2f7,stroke:#2d3748,stroke-width:1px;
  classDef external fill:#e2e8f0,stroke:#1a202c,stroke-width:1px;
  class Browser,Nextjs,AuthLayer,Business,Data,External,ParseResume,Candidates,CandidateDetail,Jobs,Dashboard,Pipeline,AuditRoute,ProjectMatches,AutomationsRules,AutomationsMessages,AutomationsRun,CronWorkflows,DbLib,CandidateRepo,ApplicationRepo,JobRepo,DashboardMetrics,WorkflowEngine,AuditLog,LlmParser,TextExtraction,Credibility,FlattenResume,Email,Prisma,Postgres,Gemini,Resend service;
```


## Notes

- `middleware.ts` secures all app routes except `/login`, `/api/auth/*`, static assets, and images.
- `app/api/parse-resume/route.ts` is the central resume ingestion flow.
- `lib/llm-parser.ts` handles Gemini model failover and strict JSON validation.
- `lib/db.ts` provides Prisma client retry handling for transient PostgreSQL errors.
- Workflow rules and automation are triggered through `lib/workflow-engine.ts` and can also be invoked by `app/api/cron/workflows/route.ts`.
- Audit events are written via `lib/audit-log.ts` into PostgreSQL.

## Rendering

Use a Mermaid renderer in VS Code or any Mermaid-compatible viewer to visualize the diagram.
