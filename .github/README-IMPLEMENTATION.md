# Implementation Guide: 3DPricey Development

**Last Updated:** February 20, 2026  
**Project:** 3DPricey  
**Version:** 1.3.1 → 2.0.0 (Post Phase 1)  

---

## Executive Summary

This document guides AI agents through implementing the 3-phase roadmap:

1. **Phase 1 (4-6 weeks):** Infrastructure (Docker/PostgreSQL, rebranding, API)
2. **Phase 2 (2-3 weeks):** Multi-color filament support
3. **Phase 3 (5-7 weeks):** Laser & Embroidery print types

**Total:** ~12-16 weeks to complete all three phases

---

## Pre-Implementation Checklist

Before starting Phase 1, ensure:

- [ ] All planning documents reviewed (ROADMAP.md, PHASE1-ARCHITECTURE.md, etc.)
- [ ] Team has Node.js 18+ installed
- [ ] Docker & Docker Compose installed (for Phase 1)
- [ ] PostgreSQL 15+ knowledge on team
- [ ] Prisma ORM setup experience
- [ ] Backup of current codebase (git commit)
- [ ] Test environment ready (staging server)

---

## Documentation Update Workflow (Critical)

**EVERY implementation must follow this:**

```
1. Plan in planning docs (PHASE*.md)
2. Implement code change (src/, backend/)
3. Update corresponding guide:
   - CALCULATIONS.md if cost logic changed
   - PARSING.md if parsers changed
   - COMPONENTS.md if UI changed
   - STATEMANAGEMENT.md if state changed
   - PHASE*-ARCHITECTURE.md if architecture changed
4. Link code examples with line numbers
5. Add "New in Phase X" section to guide
6. Commit all docs + code together
7. NO code commits without doc updates
```

---

## Phase 1: Infrastructure & Rebranding

### Objectives
✅ PostgreSQL database + Docker setup  
✅ Express.js API framework  
✅ User authentication (JWT)  
✅ Remove localStorage dependency  
✅ Brand name: "3DPricey" → "3DPricey"  
✅ Kill printer connection feature (will re-add Phase 3)

### Step 1: Rebranding (Day 1)

**Search & Replace Across Codebase:**
```bash
# Find all references
grep -r "3DPricey" --include="*.ts" --include="*.tsx" --include="*.json" .

# Replace programmatically (Mac)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" \) \
  -exec sed -i '' 's/3DPricey/3DPricey/g' {} +

# Update branding constants
# Edit: src/lib/constants.ts
  APP_NAME = '3DPricey'
  APP_VERSION = '2.0.0'
  GITHUB_REPO = 'https://github.com/Printel/3DPricey'
```

**Files to Update:**
- [ ] package.json: productName → "3DPricey"
- [ ] index.html: <title>, meta tags
- [ ] vite.config.ts: If references branding
- [ ] All .md files in .github/
- [ ] README.md
- [ ] UI components (logo, colors, text)
- [ ] src/lib/constants.ts (new file if needed)

**Verification:**
```bash
grep -r "3DPricey" . --exclude-dir=node_modules # Should be 0 results
grep -r "3DPricey" . --exclude-dir=node_modules | wc -l # Should be >20
```

**Update .github/copilot-instructions.md:**
Change references from "3DPricey" to "3DPricey" in the main guide.

### Step 2: Backend Setup (Days 2-5)

**Create backend folder structure:**
```bash
mkdir backend
cd backend
npm init -y
npm install express @prisma/client prisma bcryptjs jsonwebtoken cors dotenv
npm install --save-dev typescript @types/node @types/express tsx ts-node
```

**Initialize Prisma:**
```bash
npx prisma init
# Update .env with DATABASE_URL
npx prisma generate
npx prisma db push --skip-generate
npx prisma migrate dev --name init
```

**File: backend/src/index.ts**

Start with basic Express server:
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: '3DPricey API' });
});

app.listen(PORT, () => {
  console.log(`3DPricey API listening on port ${PORT}`);
});
```

**Create route files:**
```
backend/src/routes/
├── auth.routes.ts
├── quotes.routes.ts
├── materials.routes.ts
├── machines.routes.ts
└── index.ts (combines all)
```

**Create controller files:**
```
backend/src/controllers/
├── auth.controller.ts
├── quotes.controller.ts
└── ... others
```

### Step 3: Authentication & Middleware (Days 6-8)

**Implement JWT authentication:**

`backend/src/middleware/auth.middleware.ts`
```typescript
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

**Implement register & login:**

`backend/src/controllers/auth.controller.ts`
```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const register = async (req, res) => {
  const { email, password, name } = req.body;
  
  const hashedPassword = await bcrypt.hash(password, 12);
  
  try {
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    });
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ id: user.id, email, name, token });
  } catch (error) {
    res.status(400).json({ error: 'User already exists' });
  }
};
```

### Step 4: Database Seeding (Days 9-10)

Create `backend/prisma/seed.ts` with default materials, machines, cost constants.

**Run seed:**
```bash
npx prisma db seed
```

### Step 5: Quote API Endpoints (Days 11-15)

Implement CRUD endpoints:
- `POST /api/quotes` – Create
- `GET /api/quotes` – List
- `GET /api/quotes/:id` – Get one
- `PUT /api/quotes/:id` – Update
- `DELETE /api/quotes/:id` – Delete

Reference: See PHASE1-ARCHITECTURE.md for complete endpoint specs.

### Step 6: Frontend API Integration (Days 16-20)

Create `frontend/src/lib/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function fetchQuotes() {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_URL}/quotes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function createQuote(data) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_URL}/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return res.json();
}
```

Update components to use API instead of localStorage:
```typescript
// Before
const quotes = sessionStorage.getSavedQuotes();

// After
const [quotes, setQuotes] = useState([]);
useEffect(() => {
  api.fetchQuotes().then(setQuotes);
}, []);
```

### Step 7: Docker Compose Setup (Days 21-25)

Create `docker-compose.yml` (see PHASE1-ARCHITECTURE.md)

Create `Dockerfile` files:
- `frontend/Dockerfile`
- `backend/Dockerfile`

Test locally:
```bash
docker-compose up --build
# Visit http://localhost:8080
```

### Step 8: Testing & Migration (Days 26-30)

Write tests:
- [ ] Unit tests: Auth, quote calculation
- [ ] Integration tests: API endpoints
- [ ] E2E tests: Full workflow

Create migration script:
- Validate old localStorage data
- Insert into PostgreSQL
- Verify integrity

### Phase 1 Completion Checklist
- [ ] All "3DPricey" → "3DPricey" rebranded
- [ ] Express API running
- [ ] PostgreSQL seeded with defaults
- [ ] User auth working (login/register)
- [ ] Quote CRUD endpoints complete
- [ ] Frontend pulls data from API
- [ ] Docker containers build & run
- [ ] Tests passing (>80% coverage)
- [ ] Documentation updated (CALCULATIONS.md, COMPONENTS.md, STATEMANAGEMENT.md)
- [ ] All docs reference new file locations
- [ ] No compiler errors or warnings

---

## Phase 2: Multi-Color Filament

### Quick Start
See: PHASE2-MULTICOLOR.md

### Key Tasks
1. Add `QuoteFilament` table to database
2. Enhance G-code parser to detect color changes
3. Create `FilamentCompositionForm` component
4. Update cost calculation for multiple filaments
5. Update API endpoints to handle filament arrays
6. Update PARSING.md & COMPONENTS.md

**Estimated Time:** 2-3 weeks

---

## Phase 3: Laser & Embroidery

### Quick Start
See: PHASE3-LASER-EMBROIDERY.md

### Key Tasks
1. Unify print types with 4-type system
2. Create Laser cost calculator
3. Create Embroidery cost calculator
4. Add SVG & PDF parsers (laser)
5. Add embroidery file parsers (.pes, .exp, .jef)
6. Create UI components for both types
7. Update database schema for type-specific data
8. Update CALCULATIONS.md with new formulas

**Estimated Time:** 5-7 weeks

---

## Git Workflow

**Before starting each phase:**
```bash
git checkout main
git pull origin main
git checkout -b phase-1-infrastructure
```

**During implementation:**
```bash
git add .
git commit -m "Phase 1: Add Docker/PostgreSQL backend

- Initialize Express.js API server
- Set up Prisma ORM with PostgreSQL
- Implement JWT authentication
- Add quote CRUD endpoints
- Update frontend API client
- Create docker-compose.yml

Docs updated:
- PHASE1-ARCHITECTURE.md: Database schema complete
- COMPONENTS.md: API integration patterns
- STATEMANAGEMENT.md: API + Context state flow"
```

**After phase completion:**
```bash
git push origin phase-1-infrastructure
# Create PR, review, merge to main
git checkout main
git pull origin main
# Start next phase branch
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting to Update Documentation
**Solution:** Make it part of the git workflow—docs are committed together with code.

### Pitfall 2: Breaking Backwards Compatibility
**Solution:** Multi-color feature must support legacy single-filament quotes. Test migration.

### Pitfall 3: API Performance Issues
**Solution:** Implement caching for materials/machines. Use pagination (limit/offset).

### Pitfall 4: Database Migration Failures
**Solution:** Always test migrations in staging first. Create rollback procedures.

### Pitfall 5: JWT Token Expiry
**Solution:** Implement refresh token endpoint. Store refresh token in httpOnly cookie.

---

## Deployment Checklist

### Phase 1 Deployment
- [ ] Staging environment: Docker containers running
- [ ] Database: Backed up, migrations tested
- [ ] API: Health checks passing
- [ ] Frontend: PWA service worker updated
- [ ] Security: CORS, rate limiting, input validation
- [ ] Monitoring: Logs, error tracking (Sentry optional)
- [ ] Load testing: Ensure scalability

### Phase 2 & 3
Similar to Phase 1, plus:
- [ ] Backwards compatibility verified
- [ ] New features E2E tested
- [ ] Performance baselines met
- [ ] Rollback plan documented

---

## Documentation Maintenance (Critical!)

**After every implementation:**

1. **Identify affected docs:**
   - Changed quote math? → CALCULATIONS.md
   - Added parser? → PARSING.md
   - New components? → COMPONENTS.md
   - New contexts/hooks? → STATEMANAGEMENT.md
   - Architecture changed? → copilot-instructions.md

2. **Update each doc with:**
   - New interface definitions (TypeScript)
   - Code examples with line numbers
   - Updated database schema (if applicable)
   - Links to new files

3. **Example update to CALCULATIONS.md:**
   ```markdown
   ## Phase 1: Cost Calculation Update (Added Feb 20, 2026)
   
   ### New Fields in QuoteData
   - `electricityCost`: Now calculated from machine.power_consumption_watts
   - `parameters`: Extended to store design dimensions (laser) and stitch count (embroidery)
   
   ### Code Example
   See: [src/lib/quoteCalculations.ts#L45](../src/lib/quoteCalculations.ts#L45)
   
   ```typescript
   export const calculateFDMQuote = ({ ... }) => {
     // Now supports multi-color filaments
     if (formData.filaments?.filaments.length > 0) {
       // Multi-color calculation
     }
   }
   ```
   ```

4. **Commit documentation with code:**
   ```
   git add .github/*.md src/lib/*.ts
   git commit -m "Update docs for Phase 1 completion"
   ```

---

## Success Metrics & KPIs

### Phase 1
- API response time: <200ms (p50)
- Database: 100% uptime
- Tests: >80% coverage
- Docs: 100% up-to-date

### Phase 2
- Multi-color quotes: 0 calculation errors
- G-code parser: 95%+ color change detection
- Performance: <500ms for quote calculation

### Phase 3
- All 4 print types operational
- Laser quotes: ±5% cost accuracy
- Embroidery quotes: ±10% time estimate
- Docs: Complete & current

---

## Support & Reference

**During implementation, refer to:**

| Need | Document |
|------|-----------|
| Planning overview | ROADMAP.md |
| Database design | PHASE1-ARCHITECTURE.md |
| Multi-color spec | PHASE2-MULTICOLOR.md |
| Laser/embroidery spec | PHASE3-LASER-EMBROIDERY.md |
| Quote math | CALCULATIONS.md |
| File parsing | PARSING.md |
| Components | COMPONENTS.md |
| State management | STATEMANAGEMENT.md |
| Data persistence | STORAGE.md (Phase 1 replaces this) |

**Quick links:**
- GitHub: https://github.com/Printel/3DPricey
- Dev server: http://localhost:8080 (Phase 0)
- API server: http://localhost:3001 (Phase 1+)

---

## Final Notes

**This is a professional, well-documented project.** Every change must be reflected in the docs to maintain long-term maintainability.

**Agents working on this project** should:
1. Read the relevant planning docs completely before coding
2. Update docs **during** implementation, not after
3. Use line number links in documentation
4. Test backwards compatibility carefully
5. Commit docs + code together

**Questions?** Refer to copilot-instructions.md or planning docs. If something isn't documented, **document it before you code it.**

---

**Happy building! 🚀 3DPricey v2.0+ will be revolutionary.**
