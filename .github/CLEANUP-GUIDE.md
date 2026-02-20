# Documentation Cleanup Guide for AI Agents

## Status

✅ **ROADMAP.md** - Cleaned (no durations, no narrative, specs only)

## Remaining Files to Clean

### PHASE1-ARCHITECTURE.md
**Remove:**
- "Why Prisma?" explanations
- "Why this approach?" commentary
- Human-focused "Benefits of X" sections
- Recommendation sentences like "Use Prisma. It's modern..."

**Keep:**
- Code examples
- Schema definitions
- API endpoint specs
- Docker Compose configuration
- Environment variables
- Technical decisions (what to use)

### PHASE2-MULTICOLOR.md
**Remove:**
- "What This Means" explanatory paragraphs
- "Example Quote" narrative
- "Why multi-color second" reasoning

**Keep:**
- Data models
- Implementation checklist
- Cost calculation formulas
- API specifications
- File modifications list

### PHASE3-LASER-EMBROIDERY.md
**Remove:**
- Phase overview narratives
- "Why laser/embroidery third" explanations
- Use case descriptions

**Keep:**
- 4 print type definitions
- Calculator formulas
- File parser specs
- Database schema changes
- Component list

### README-IMPLEMENTATION.md
**Remove:**
- Day-by-day narrative descriptions
- "Week X focus" explanations
- Executive summaries
- "Common pitfalls" discussion paragraphs

**Keep:**
- Day-by-day checklist
- Git commands
- File structure
- Code snippets
- Configuration steps

### copilot-instructions.md
**Remove:**
- "Key Patterns" narrative sections
- "When to use" explanations for concepts
- Human-focused "Important Conventions" intro text
- Testing section explanations

**Keep:**
- Code examples
- File references
- Interface definitions
- Quick reference tables
- Technical specifications

### CALCULATIONS.md, PARSING.md, STATEMANAGEMENT.md, STORAGE.md, COMPONENTS.md
**Remove:**
- Intro paragraphs explaining purpose
- "Why this matters" text
- Use case narratives

**Keep:**
- Code examples
- Specifications
- Data structures
- Implementation patterns
- File references

---

## Automated Cleanup Pattern

For each file, identify and remove:
1. Paragraphs starting with: "Why", "This ensures", "This allows", "Benefits"
2. "Goal:" sections
3. Explanatory intro paragraphs before specs
4. Recommendation text
5. Duration/timeline information
6. Human-focused success criteria phrasing

Keep:
1. Code blocks
2. Specifications (interfaces, schemas)
3. Checklist items
4. Step-by-step procedures
5. Technical details
6. File paths
7. Data structures
8. API definitions
