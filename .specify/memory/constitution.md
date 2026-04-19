<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template Principle 1 -> I. Documentation-Backed Change
- Template Principle 2 -> II. Offline-First Source of Truth
- Template Principle 3 -> III. Domain Calculation and Parsing Integrity
- Template Principle 4 -> IV. Split-Stack Boundary Discipline
- Template Principle 5 -> V. Explicit Validation and Deployment Safety
Added sections:
- Engineering Constraints
- Delivery Workflow
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/constitution-template.md remains compatible; no changes required
- ⚠ pending: .specify/templates/commands/*.md (directory not present in repository)
Follow-up TODOs:
- None
-->

# 3DPricey Constitution

## Core Principles

### I. Documentation-Backed Change
Every production change to application code MUST update the corresponding guidance in
.github/ during the same change set. Quote logic changes MUST update CALCULATIONS.md,
parser changes MUST update PARSING.md, state or hook changes MUST update
STATEMANAGEMENT.md, storage changes MUST update STORAGE.md, component changes MUST
update COMPONENTS.md, and architecture or build-flow changes MUST update
copilot-instructions.md or adjacent operational documentation. This is mandatory because
repository guidance is treated as working system documentation for humans and agents.

### II. Offline-First Source of Truth
Features MUST preserve the product's offline-first behavior unless a change explicitly
redefines the storage model and migration path. Browser localStorage remains a valid
operational source of truth for frontend workflows, while backend persistence, sync, and
API integration MUST be introduced without breaking local-only usage, data recovery, or
existing storage keys without an explicit migration plan. Any feature that touches saved
quotes, stock, materials, machines, or session data MUST state how local and remote
state interact.

### III. Domain Calculation and Parsing Integrity
Quote math, file parsing, and production data flows MUST favor correctness over
convenience. Cost formulas, quantity handling, tool and material mappings, machine power
calculations, and parser fallbacks MUST remain explicit, reviewable, and documented.
Changes affecting FDM, Resin, stock creation, or uploaded-file extraction MUST identify
the user-visible business rule being preserved or changed, and MUST include validation
evidence sufficient to show that no silent pricing or data regression was introduced.

### IV. Split-Stack Boundary Discipline
3DPricey is a split-stack system with distinct frontend and backend responsibilities.
Frontend code MUST keep UI, local persistence, and client-side workflow logic inside
frontend/, while backend code MUST own authenticated API, database access, and service
integration inside backend/. Shared concepts may evolve together, but cross-stack
changes MUST specify the contract boundary, configuration impact, and deployment order.
No feature may hide a backend dependency inside frontend-only behavior or bypass API
security guarantees through convenience shortcuts.

### V. Explicit Validation and Deployment Safety
No substantial change is complete without explicit validation appropriate to the touched
surface. At minimum, engineers MUST run relevant lint, build, or test commands for the
affected package when feasible, and MUST record manual validation steps for workflows
that lack automated coverage. Changes affecting authentication, environment variables,
Docker, deployment blueprints, storage schema, or sync behavior MUST additionally
document rollout assumptions, secret handling, and failure modes before they are treated
as releasable.

## Engineering Constraints

The canonical product stack is React 18 + TypeScript + Vite in frontend/ and Express +
TypeScript + Prisma in backend/, with PostgreSQL, Redis, MinIO, and Docker Compose for
infrastructure. New work MUST align with this baseline unless an amendment explicitly
approves deviation.

The application MUST continue supporting both FDM and Resin quoting paths. Changes that
support only one print technology are acceptable only when they are isolated and do not
break shared quote, stock, or persistence behavior.

Hash-based routing, local development on Node.js 20+, and deployability through the
existing Docker Compose and environment-file model are required constraints. Proposed
changes that alter these assumptions MUST include migration steps and operator-facing
documentation.

## Delivery Workflow

Feature work MUST begin from a concrete specification that identifies affected user
flows, data entities, validation strategy, and documentation impact. Plans and tasks
MUST explicitly call out frontend/backend ownership, offline-storage implications,
calculation or parser risk, and the verification needed to ship safely.

Implementations MUST prefer minimal, auditable changes over broad rewrites. Where the
repository lacks automated tests, authors MUST define manual verification steps tied to
the changed workflows, such as quote calculation scenarios, parser uploads, auth flows,
or Docker startup checks. Work is incomplete if those checks are omitted.

## Governance

This constitution supersedes conflicting local process notes for feature planning,
implementation, and review. Every plan, task list, review, and release decision MUST be
checked against these principles.

Amendments MUST be made in the same change set as any dependent template or workflow
updates required to keep Speckit artifacts aligned. A constitutional amendment requires:
1. a clear statement of the rule being added, removed, or redefined,
2. a justification grounded in repository reality,
3. updates to affected templates and guidance files, and
4. a semantic version bump recorded below.

Versioning policy is mandatory: MAJOR for incompatible governance changes or principle
removal, MINOR for new principles or materially expanded requirements, and PATCH for
clarifications that do not change expected behavior.

Compliance review is required on every meaningful change. Reviewers MUST verify
documentation synchronization, offline and storage impact, stack-boundary correctness,
and validation evidence before accepting work as complete.

**Version**: 1.0.0 | **Ratified**: 2026-03-31 | **Last Amended**: 2026-03-31
