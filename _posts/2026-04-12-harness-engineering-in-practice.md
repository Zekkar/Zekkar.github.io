---
title: "Harness Engineering in Practice: Building a Self-Improving AI Development System"
date: 2026-04-12
categories:
  - Tech
tags:
  - AI
  - Claude Code
  - Harness Engineering
  - DevOps
  - Workflow Automation
excerpt: "How I engineered a 5-layer harness around Claude Code for a production financial system — with 700+ sessions of real-world friction data proving what works. Agent = Model + Harness."
toc: true
toc_sticky: true
---

## Preface

The AI development community has converged on a powerful insight: **Agent = Model + Harness**. The harness is everything except the model itself — orchestration, tools, permissions, memory, context management, and workflow automation.

Even a frontier model running in a loop across multiple context windows will underperform without a well-designed harness. The model tends to do too much at once or declares the job done prematurely; the harness imposes structure on that tendency.

This article documents my journey building a production-grade harness over **700+ Claude Code sessions across 21 days**, operating a financial trading system with 36+ Docker containers. I'll share the architecture, the friction data, and the self-improvement loop that makes the harness get better over time.

> The next frontier isn't better models — it's better harnesses.

---

## The 5-Layer Harness Architecture

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" style="width:100%;height:auto;max-width:100%;" font-family="'Segoe UI','Noto Sans TC',sans-serif">
  <defs>
    <filter id="s"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <linearGradient id="h1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#667eea"/><stop offset="100%" stop-color="#764ba2"/></linearGradient>
    <linearGradient id="h2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f093fb"/><stop offset="100%" stop-color="#f5576c"/></linearGradient>
    <linearGradient id="h3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4facfe"/><stop offset="100%" stop-color="#00f2fe"/></linearGradient>
    <linearGradient id="h4" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#43e97b"/><stop offset="100%" stop-color="#38f9d7"/></linearGradient>
    <linearGradient id="h5" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fa709a"/><stop offset="100%" stop-color="#fee140"/></linearGradient>
  </defs>
  <rect width="800" height="420" rx="12" fill="#1e1e2e"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#e0e0e0">5-Layer Harness Architecture</text>
  <text x="400" y="50" text-anchor="middle" font-size="12" fill="#999">Agent = Model + Harness</text>

  <g filter="url(#s)"><rect x="40" y="70" width="720" height="56" rx="10" fill="url(#h5)"/><text x="70" y="96" font-size="13" font-weight="bold" fill="white">Layer 5</text><text x="140" y="96" font-size="14" font-weight="bold" fill="white">Self-Improvement Loop</text><text x="460" y="96" font-size="12" fill="rgba(255,255,255,0.8)">Insights -> Wiki Baseline -> PDCA -> Harness Update</text></g>

  <g filter="url(#s)"><rect x="40" y="136" width="720" height="56" rx="10" fill="url(#h4)"/><text x="70" y="162" font-size="13" font-weight="bold" fill="#1a1a2e">Layer 4</text><text x="140" y="162" font-size="14" font-weight="bold" fill="#1a1a2e">Knowledge Persistence</text><text x="460" y="162" font-size="12" fill="rgba(0,0,0,0.5)">Cross-session Memory | Wiki (MCP) | Dev Diary</text></g>

  <g filter="url(#s)"><rect x="40" y="202" width="720" height="56" rx="10" fill="url(#h3)"/><text x="70" y="228" font-size="13" font-weight="bold" fill="white">Layer 3</text><text x="140" y="228" font-size="14" font-weight="bold" fill="white">Workflow Templates (Skills)</text><text x="460" y="228" font-size="12" fill="rgba(255,255,255,0.8)">/sbe | /deploy | /devdiary | /health-check</text></g>

  <g filter="url(#s)"><rect x="40" y="268" width="720" height="56" rx="10" fill="url(#h2)"/><text x="70" y="294" font-size="13" font-weight="bold" fill="white">Layer 2</text><text x="140" y="294" font-size="14" font-weight="bold" fill="white">Automated Guardrails (Hooks)</text><text x="460" y="294" font-size="12" fill="rgba(255,255,255,0.8)">Syntax Validator | Commit Guard | Cost Tracker</text></g>

  <g filter="url(#s)"><rect x="40" y="334" width="720" height="56" rx="10" fill="url(#h1)"/><text x="70" y="360" font-size="13" font-weight="bold" fill="white">Layer 1</text><text x="140" y="360" font-size="14" font-weight="bold" fill="white">Behavior Specification (CLAUDE.md)</text><text x="460" y="360" font-size="12" fill="rgba(255,255,255,0.8)">Architecture Rules | Bug Prevention | Permissions</text></g>
</svg>

Each layer addresses a different failure mode. Let me walk through them bottom-up.

---

## Layer 1: Behavior Specification (CLAUDE.md)

**Problem it solves**: The model proposes approaches that violate architectural decisions or repeat past mistakes.

CLAUDE.md is the "constitution" of your AI agent. Mine evolved from a simple style guide into a **200+ line operational manual** containing:

### Architecture Principles (Non-Negotiable)

```markdown
## Architecture Principles
- Event-driven first, polling forbidden: All state changes must be 
  driven by events/callbacks/TTL expiry. Never use polling.
- Prefer Pub/Sub, Callback, Cache TTL expiry over periodic checking.
- When designing new features, if polling seems needed, propose an 
  event-driven alternative first.
```

This rule exists because the model proposed polling-based solutions **twice** before I corrected it. The correction led to a **98.8% CPU reduction** across services. Without the rule in CLAUDE.md, every new session risks the same mistake.

### Bug Prevention Rules (Learned from Incidents)

After a deployment introduced 3 simultaneous production bugs, I distilled **8 defensive rules**:

```markdown
### 1. Shared state writes must filter by source
- Before updating store, MUST check symbol === currentSymbol

### 2. Multi-leg trade parameters must be explicit
- lots, contract_multiplier MUST NOT rely on defaults

### 3. Background tasks need triple guards
All scheduled tasks MUST verify:
1. Trading hours: is_trading_time()
2. Data freshness: is_tick_stale(symbol, 120)
3. Quote completeness: both legs have price + BidAsk
```

### Why CLAUDE.md Alone Isn't Enough

The uncomfortable truth from my data: **CLAUDE.md covered ~90% of friction scenarios, yet "wrong approach" still occurred 31 times.**

Rules exist ≠ rules are followed. This is why we need the remaining 4 layers.

---

## Layer 2: Automated Guardrails (Hooks)

**Problem it solves**: Syntax errors and security issues slip through despite written rules.

Hooks are shell commands that execute at lifecycle events — before/after tool calls, on session stop. They provide **automated enforcement** that doesn't rely on the model remembering to check.

### My Hook Architecture

| Hook | Trigger | Function |
|------|---------|----------|
| `syntax-validator` | PostToolUse (Edit/Write) | `.py` py_compile + `.json` json.load after every edit |
| `commit-guard` | PreToolUse (git commit) | Scans staged files for hardcoded secrets and debug statements |
| `wiki-auto-commit` | PostToolUse (Edit/Write) | Auto-commits knowledge base changes |
| `cost-tracker` | Stop | Records session cost metrics |

### The Syntax Validator Pattern

```python
# PostToolUse hook: validates syntax after every file edit
def validate_python(filepath):
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", filepath],
        capture_output=True, text=True
    )
    return result.returncode == 0, result.stderr.strip()

def validate_json(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read().strip()
        if not content:
            return True, "skip (empty)"
        json.loads(content)
        return True, "JSON OK"
    except json.JSONDecodeError as e:
        return False, f"line {e.lineno} col {e.colno}: {e.msg}"

# Route by extension
validators = { ".py": validate_python, ".json": validate_json }
```

### Hook Timing Subtlety

PostToolUse fires **after** the tool executes — `block` tells the model the operation failed, but the file is already on disk. This is the correct trade-off:

- **PostToolUse**: Can inspect results, can't prevent the write
- **PreToolUse**: Can prevent execution, can't see results

For syntax validation, PostToolUse is ideal — immediate feedback with exact error message, forcing the model to fix before proceeding.

---

## Layer 3: Workflow Templates (Skills)

**Problem it solves**: Multi-step processes get steps skipped under time pressure.

Skills are reusable prompt workflows triggered by `/commands`. They encode institutional knowledge about **how** to perform complex operations.

### The Deploy Skill

My deploy workflow has **8 mandatory steps**. Before encoding it as a skill, I frequently skipped health checks and notifications:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" style="width:100%;height:auto;max-width:100%;" font-family="'Segoe UI','Noto Sans TC',sans-serif">
  <defs>
    <filter id="sd"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#bbb"/></marker>
  </defs>
  <rect width="800" height="200" rx="12" fill="#1e1e2e"/>
  <text x="400" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#e0e0e0">/deploy — Verification-First Workflow</text>

  <g filter="url(#sd)">
    <rect x="15" y="50" width="85" height="50" rx="8" fill="#667eea"/><text x="57" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 1</text><text x="57" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">Scope Scan</text>
  </g>
  <line x1="100" y1="75" x2="112" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#arr)"/>
  <g filter="url(#sd)">
    <rect x="117" y="50" width="85" height="50" rx="8" fill="#667eea"/><text x="159" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 2</text><text x="159" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">Syntax Check</text>
  </g>
  <line x1="202" y1="75" x2="214" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#arr)"/>
  <g filter="url(#sd)">
    <rect x="219" y="50" width="85" height="50" rx="8" fill="#4facfe"/><text x="261" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 3</text><text x="261" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">Git Push</text>
  </g>
  <line x1="304" y1="75" x2="316" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#arr)"/>
  <g filter="url(#sd)">
    <rect x="321" y="50" width="85" height="50" rx="8" fill="#4facfe"/><text x="363" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 4</text><text x="363" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">SSH Deploy</text>
  </g>
  <line x1="406" y1="75" x2="418" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#arr)"/>
  <g filter="url(#sd)">
    <rect x="423" y="45" width="95" height="60" rx="8" fill="#43e97b" stroke="#2d8a56" stroke-width="2"/><text x="470" y="70" text-anchor="middle" font-size="10" font-weight="bold" fill="#1a1a2e">Step 5</text><text x="470" y="86" text-anchor="middle" font-size="10" font-weight="bold" fill="#1a1a2e">Health Check</text><text x="470" y="98" text-anchor="middle" font-size="8" fill="#2d8a56">CRITICAL</text>
  </g>
  <line x1="518" y1="75" x2="530" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#arr)"/>
  <g filter="url(#sd)">
    <rect x="535" y="50" width="85" height="50" rx="8" fill="#f5576c"/><text x="577" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 6</text><text x="577" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">Notify</text>
  </g>
  <line x1="620" y1="75" x2="632" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#arr)"/>
  <g filter="url(#sd)">
    <rect x="637" y="50" width="85" height="50" rx="8" fill="#fa709a"/><text x="679" y="72" text-anchor="middle" font-size="10" font-weight="bold" fill="white">Step 7</text><text x="679" y="88" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)">Dev Diary</text>
  </g>
  <line x1="722" y1="75" x2="734" y2="75" stroke="#bbb" stroke-width="1.5" marker-end="url(#arr)"/>
  <g filter="url(#sd)">
    <rect x="739" y="55" width="45" height="40" rx="8" fill="#43e97b"/><text x="761" y="80" text-anchor="middle" font-size="18" fill="white">&#10004;</text>
  </g>

  <rect x="15" y="125" width="769" height="60" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
  <text x="30" y="148" font-size="11" font-weight="bold" fill="#f5576c">Key Insight:</text>
  <text x="130" y="148" font-size="11" fill="#ccc">Before the skill, Steps 5-7 were frequently skipped.</text>
  <text x="30" y="170" font-size="11" fill="#ccc">After encoding as /deploy, the complete workflow is enforced every time — the skill won't let you stop early.</text>
</svg>

Skills can reference each other, creating a workflow graph:

```
User Request -> /deploy
                  |-- Step 5 calls /health-check
                  |-- Step 7 calls /devdiary
                                     |-- Writes to knowledge base
```

### The SBE Skill: Specification by Example as Development Entry Point

Traditional TDD has a fundamental flaw in the agentic era: **the AI writes both the test and the implementation, grading its own homework.** The test becomes a self-fulfilling prophecy rather than a genuine specification.

I solved this by creating a `/spec-by-example` (SBE) skill that serves as the **mandatory entry point** for all new feature development:

```
Old workflow: Requirement → Impact Analysis → BDD Generation → Implement
New workflow: Requirement → /sbe (Knowledge + Examples + Human Gate) → Implement
```

The skill runs 6 steps:

1. **Requirement Parsing** — AI restates the requirement in its own words, exposing misunderstandings early
2. **Knowledge Exploration** — Queries wiki MCP + greps codebase to map system boundaries
3. **Example Mapping** — Generates concrete Given/When/Then examples in 3 categories:
   - Happy path (normal behavior)
   - Edge cases (boundary conditions)
   - Error paths (failure handling)
4. **Human Confirmation Gate** — Presents all examples to the user. **Cannot be skipped.** The user validates, corrects, or adds examples before any code is written
5. **Spec Persistence** — Writes confirmed spec to `specs/sbe/` as the single source of acceptance criteria
6. **Transition to Development** — Converts confirmed examples into test skeletons, then implements

The key insight: **in the agentic era, the specification IS the human's contribution.** The AI generates examples to make its understanding explicit; the human confirms or corrects. Only then does the AI code — against specifications it doesn't own.

This eliminated the "misunderstood request" friction category entirely: the misunderstanding surfaces in Step 3-4, not after deployment.

---

## Layer 4: Knowledge Persistence

**Problem it solves**: Each new session starts from zero, repeating past mistakes.

I built a **3-tier knowledge system**:

### Tier 1: Session Memory (MEMORY.md)

Cross-session memories organized by type:
- **User profile**: Role, preferences, expertise
- **Feedback**: Corrections (positive AND negative)
- **Project state**: Current initiatives, decisions
- **References**: Pointers to external systems

```
memory/
├── MEMORY.md                              # Index (always loaded)
├── user_profile.md                        # Who the user is
├── feedback_no_polling.md                 # "Never propose polling"
├── feedback_verify_all_code_paths.md      # "grep ALL occurrences"
├── project_regime_redesign.md             # Current project status
└── ... (40+ memory files)
```

### Tier 2: Knowledge Wiki (MCP Integration)

A structured wiki following the [Karpathy LLM Wiki](https://gist.github.com/karpathy) architecture:

```
Schema Layer (CLAUDE.md) — defines structure
         |
raw/ — Immutable source (LLM reads only)
         |
wiki/ — LLM-compiled knowledge (LLM owns completely)
```

Exposed via **MCP** with 3 tools: `search()`, `get_concept()`, `related()`.

### Tier 3: Dev Diary

Every task gets a structured entry: Problem → Analysis → Decision → Implementation → Pitfalls → Insights. This creates searchable institutional memory.

---

## Layer 5: Self-Improvement Loop

**Problem it solves**: The harness itself has blind spots that only surface after hundreds of sessions.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 220" style="width:100%;height:auto;max-width:100%;" font-family="'Segoe UI','Noto Sans TC',sans-serif">
  <defs>
    <filter id="sp"><feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.1"/></filter>
    <marker id="arp" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#bbb"/></marker>
  </defs>
  <rect width="800" height="220" rx="12" fill="#1e1e2e"/>
  <text x="400" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#e0e0e0">PDCA Self-Improvement Cycle</text>

  <g filter="url(#sp)">
    <rect x="50" y="60" width="150" height="70" rx="12" fill="#667eea"/><text x="125" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="white">Plan</text><text x="125" y="108" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Analyze /insights</text><text x="125" y="122" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Identify friction</text>
  </g>
  <line x1="200" y1="95" x2="230" y2="95" stroke="#bbb" stroke-width="2" marker-end="url(#arp)"/>
  <g filter="url(#sp)">
    <rect x="235" y="60" width="150" height="70" rx="12" fill="#4facfe"/><text x="310" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="white">Do</text><text x="310" y="108" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Add hooks, skills,</text><text x="310" y="122" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">rules, memory</text>
  </g>
  <line x1="385" y1="95" x2="415" y2="95" stroke="#bbb" stroke-width="2" marker-end="url(#arp)"/>
  <g filter="url(#sp)">
    <rect x="420" y="60" width="150" height="70" rx="12" fill="#43e97b"/><text x="495" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a1a2e">Check</text><text x="495" y="108" text-anchor="middle" font-size="10" fill="rgba(0,0,0,0.5)">Next /insights vs</text><text x="495" y="122" text-anchor="middle" font-size="10" fill="rgba(0,0,0,0.5)">wiki baseline</text>
  </g>
  <line x1="570" y1="95" x2="600" y2="95" stroke="#bbb" stroke-width="2" marker-end="url(#arp)"/>
  <g filter="url(#sp)">
    <rect x="605" y="60" width="150" height="70" rx="12" fill="#fa709a"/><text x="680" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="white">Act</text><text x="680" y="108" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Promote effective,</text><text x="680" y="122" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">remove ineffective</text>
  </g>

  <path d="M680,130 C680,180 125,180 125,130" stroke="#fee140" stroke-width="2" fill="none" stroke-dasharray="6,4"/>
  <text x="400" y="178" text-anchor="middle" font-size="11" fill="#fee140">Continuous improvement cycle</text>

  <rect x="50" y="195" width="700" height="20" rx="4" fill="rgba(255,255,255,0.05)"/>
  <text x="400" y="210" text-anchor="middle" font-size="10" fill="#999">The harness that measures itself is the harness that improves.</text>
</svg>

### Baseline Tracking

After analyzing 702 sessions, I created a wiki page tracking friction metrics:

| Friction Type | Baseline | Target |
|--------------|----------|--------|
| Wrong Approach | 31 | &le; 10 |
| Buggy Code | 20 | &le; 8 |
| Full Achievement Rate | 62% | &ge; 75% |
| Command Failed | 196 | &le; 100 |

### What the Data Revealed

The most surprising finding: **the bottleneck wasn't missing rules — it was inconsistent enforcement.**

This shifted my investment from "write more rules" (Layer 1) to "build automated guardrails" (Layer 2). The syntax validator catches errors at edit-time. The deploy skill enforces verification steps that were previously skipped.

---

## Real-World Metrics

After 21 days and 702 analyzed sessions:

| Metric | Value |
|--------|-------|
| Total sessions | 1,195 (702 analyzed) |
| Messages | 10,276 (467/day) |
| Full achievement rate | 62% |
| Files touched | 541 |
| Code changes | +31,011 / -2,349 lines |
| Commits | 159 |
| Top tool | Bash (2,810 calls) |
| Remote operations | 620 messaging calls |

### What Helped Most

| Capability | Sessions |
|-----------|---------|
| Multi-file changes | 41 |
| Good debugging | 39 |
| Good explanations | 36 |
| Proactive help | 17 |

### Primary Friction Sources

| Type | Count | Root Cause |
|------|-------|-----------|
| Wrong Approach | 31 | Model defaults to simpler patterns |
| Buggy Code | 20 | Syntax errors, wrong parameters |
| Misunderstood Request | 4 | Ambiguous terse commands |

---

## Lessons Learned

### 1. Rules Exist ≠ Rules Are Followed

CLAUDE.md covered 90% of friction scenarios. The model still made those mistakes 31 times. **Automated enforcement (hooks) is worth 10x more than written rules.**

### 2. Match the Harness to Your Interaction Style

I operate via short mobile commands expecting end-to-end autonomous execution. My harness is optimized for this: skills encode complete workflows, memory preserves cross-session context, hooks catch errors that brief commands can't prevent.

Pair-programming style needs a different harness — more explanation, less autonomy.

### 3. Measure the Harness, Not Just the Output

Before Layer 5, I had no idea "wrong approach" was my #1 friction at 31 instances. I thought it was buggy code. **Measuring changed my investment priorities.**

### 4. Event-Driven Thinking Applies to the Harness

- **Hooks** are event-driven (triggered by tool use) — effective
- **Rules** are passive (model must remember) — weaker
- **Skills** are command-driven (explicit invocation) — effective

The most effective harness components are reactive, not declarative.

### 5. Knowledge Systems Need Separation of Concerns

- **Memory**: Cross-session context (who, what, preferences)
- **Wiki**: Structured evolving knowledge (concepts, architecture)
- **Dev Diary**: Immutable learning records (what happened, why)

Mixing these creates a mess. Separating lets each serve its purpose.

---

## Getting Started

Start with these layers in order:

1. **CLAUDE.md** — Your top 5 non-negotiable rules. Add as you discover friction.
2. **One hook** — A syntax validator for your primary language. Immediate ROI.
3. **One skill** — Your most repeated multi-step workflow.
4. **Memory** — Start recording corrections. Even 10 feedback memories improve consistency.
5. **Measurement** — Run `/insights` after 50+ sessions. Let data guide investment.

The harness doesn't need to be perfect on day one. The key is to **start measuring early**.

---

## Conclusion

Harness Engineering is the discipline of building the operating system around an AI agent. The model is the engine; the harness is the chassis, steering, brakes, and navigation.

After 700+ sessions, my harness evolved from a simple CLAUDE.md into a 5-layer system with automated guardrails, reusable workflows, persistent knowledge, and a self-improvement loop.

**The harness that measures itself is the harness that improves.**

---

*Built with [Claude Code](https://claude.ai/code). Measured with `/insights`. Improved through PDCA.*

**References:**
- [Anthropic - Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic - Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Martin Fowler - Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html)
- [TechTalks - The Art of AI Harness Engineering](https://bdtechtalks.substack.com/p/the-art-of-ai-harness-engineering)
