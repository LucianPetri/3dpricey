# Phase 1 Implementation

## Days 1-3: Rebranding
- package.json: productName → "3DPricey", version → "2.0.0"
- index.html: <title> → "3DPricey", favicon update
- src/lib/constants.ts: APP_NAME, APP_VERSION, COMPANY_NAME
- All .ts/.tsx files: search/replace 3DPricey → 3DPricey
- All .md files: project name update
- vite.config.ts: app name in config
- Git commit: "Rebrand: 3DPricey → 3DPricey"

## Days 4-6: Backend Scaffold
```bash
mkdir backend && cd backend
npm init -y
npm install express typescript ts-node @prisma/client prisma dotenv bcrypt jsonwebtoken cors
npm install -D @types/node @types/express @types/bcrypt
npx tsc --init
mkdir -p src/{controllers,routes,middleware,services}
```

Create backend/src/index.ts:
```typescript
import express from 'express';
import authRoutes from './routes/auth';
import quotesRoutes from './routes/quotes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);

app.listen(3001, () => console.log('API running on :3001'));
```

## Days 7-9: Prisma Setup
```bash
cd backend
npx prisma init
```

Edit backend/.env:
```
DATABASE_URL="postgresql://user:password@localhost:5432/3dpricey"
```

Create backend/prisma/schema.prisma (use PHASE1-COMPACT.md)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Days 10-12: Authentication
backend/src/middleware/auth.middleware.ts:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).userId = payload.id;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}
```

backend/src/controllers/auth.controller.ts:
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function register(req: any, res: any) {
  const { email, password, name } = req.body;
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashed, name }
  });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.status(201).json({ user, token });
}

export async function login(req: any, res: any) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ user, token });
}
```

## Days 13-15: API Endpoints
backend/src/routes/quotes.ts:
```typescript
import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', authMiddleware, async (req: any, res) => {
  const quotes = await prisma.quote.findMany({
    where: { userId: req.userId },
    take: 20
  });
  res.json(quotes);
});

router.post('/', authMiddleware, async (req: any, res) => {
  const quote = await prisma.quote.create({
    data: { ...req.body, userId: req.userId, companyId: 'default' }
  });
  res.status(201).json(quote);
});

router.put('/:id', authMiddleware, async (req: any, res) => {
  const quote = await prisma.quote.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(quote);
});

router.delete('/:id', authMiddleware, async (req: any, res) => {
  await prisma.quote.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
```

## Days 16-18: Docker Compose
Copy docker-compose.yml from PHASE1-COMPACT.md to root

Create .env:
```
DB_USER=3dpricey_user
DB_PASSWORD=secure_pwd
JWT_SECRET=your_jwt_secret
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

```bash
docker-compose up -d
```

## Days 19-21: Frontend API Client
src/lib/api.ts:
```typescript
const API_URL = import.meta.env.VITE_API_URL;

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function getQuotes() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/quotes`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function createQuote(data: any) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return res.json();
}
```

## Days 22-24: Background Sync
src/lib/sync.ts:
```typescript
export async function syncToServer() {
  const pending = JSON.parse(localStorage.getItem('pending') || '[]');
  if (!pending.length) return;

  try {
    const res = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      body: JSON.stringify({ changes: pending }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });

    if (res.status === 409) {
      const conflicts = await res.json();
      showConflictModal(conflicts);
    } else {
      localStorage.removeItem('pending');
    }
  } catch (e) {
    // offline, keep pending
  }
}

// Every 5 minutes
setInterval(syncToServer, 5 * 60 * 1000);
window.addEventListener('online', syncToServer);
```

## Days 25-27: Conflict Resolution Modal
src/components/ConflictResolutionModal.tsx:
```typescript
export function ConflictResolutionModal({ conflicts, onResolve }) {
  const [choices, setChoices] = useState({});

  return (
    <dialog open>
      <h2>Sync Conflict</h2>
      <p>Another user modified these fields. Choose which to keep.</p>

      {conflicts.map(c => (
        <div key={`${c.id}:${c.field}`}>
          <label>
            <input
              type="radio"
              name={`${c.id}:${c.field}`}
              value="local"
              defaultChecked
              onChange={() => setChoices({...choices, [`${c.id}:${c.field}`]: 'local'})}
            />
            Local: {c.localValue}
          </label>
          <label>
            <input
              type="radio"
              name={`${c.id}:${c.field}`}
              value="server"
              onChange={() => setChoices({...choices, [`${c.id}:${c.field}`]: 'server'})}
            />
            Server: {c.serverValue} (by {c.serverUpdatedBy})
          </label>
        </div>
      ))}

      <button onClick={() => onResolve(choices)}>Keep Selected</button>
    </dialog>
  );
}
```

## Days 28-30: Migration & Testing
Create migration script:
```typescript
// backend/scripts/migrate.ts
const localData = localStorage.getItem('quotes');
const quotes = JSON.parse(localData || '[]');

for (const quote of quotes) {
  await prisma.quote.create({
    data: { ...quote, userId, companyId }
  });
}
```

Test:
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] GET /api/quotes (returns user's quotes)
- [ ] POST /api/quotes (creates quote)
- [ ] PUT /api/quotes/:id
- [ ] DELETE /api/quotes/:id
- [ ] POST /api/sync (detects conflicts)
- [ ] POST /api/sync/resolve
- [ ] Docker containers run
- [ ] Frontend can login and see quotes

## Git Workflow
```bash
git checkout -b phase-1-infrastructure
# ... make changes ...
git add .
git commit -m "Phase 1: Add backend, auth, PostgreSQL

Impl:
- Express.js API with JWT auth
- Prisma schema (13 tables)
- Docker Compose (postgres + redis + minio)
- PWA background sync
- Conflict resolution
- Frontend API integration

Docs updated:
- PHASE1-ARCHITECTURE.md
- PHASE1-COMPACT.md"

git push origin phase-1-infrastructure
# Create PR, review, merge
```
