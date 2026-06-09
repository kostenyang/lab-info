# CI/CD — Lab Automation Pipeline

Central documentation for the GitHub Actions CI/CD pipelines across the two lab repos.

## Repos & runners

| Repo | GitHub | Self-hosted runner |
|------|--------|--------------------|
| **rtolab** | [kostenyang/rtolab](https://github.com/kostenyang/rtolab) | `win-labhost` (SELAB-WIN2022-J, 172.16.10.32) |
| **vcf9.1-lab** | [kostenyang/vcf9.1-lab](https://github.com/kostenyang/vcf9.1-lab) | — (not yet registered) |
| **lab-info** | [kostenyang/lab-info](https://github.com/kostenyang/lab-info) | GitHub-hosted `ubuntu-latest` |

### Runner detail — win-labhost

| Item | Value |
|------|-------|
| Host | SELAB-WIN2022-J (`172.16.10.32`) |
| OS | Windows Server 2022 |
| Shell | pwsh 7.6.1 |
| Labels | `self-hosted`, `Windows`, `X64`, `pwsh`, `lab` |
| Startup | Task Scheduler → `GitHubActionsRunner-rtolab` → `C:\actions-runner\run.cmd` |
| Lab network | 192.168.114.x ✓, 172.16.10.x ✓ |
| PowerCLI | Not installed (install before Step 5 dry-run) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Developer                                                        │
│  ├── Claude Code  (interactive: write / refactor / debug)        │
│  ├── Codex CLI    (quick patch: codex "fix ...")                  │
│  └── Gemini       (large-context review / second opinion)        │
└──────────────────┬───────────────────────────────────────────────┘
                   │ git push / PR
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  GitHub (kostenyang/rtolab)                                       │
│                                                                   │
│  Every push ──► [lint.yml]          self-hosted: win-labhost     │
│                 ├── PSScriptAnalyzer (Error=block, Warning=info)  │
│                 ├── YAML validation                               │
│                 └── Secret scan                                   │
│                                                                   │
│  PR ──────────► [ai-review.yml]     self-hosted: win-labhost     │
│   (manual now) └── Claude API review → PR comment                │
│                                                                   │
│  Push main ───► [sync-lab-info.yml] (future: trigger lab-info)   │
└──────────────────────────────────────────────────────────────────┘
                   │ rtolab public API
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  GitHub (kostenyang/lab-info)                                     │
│                                                                   │
│  Daily 02:00 UTC ──► [sync-rtolab.yml]  ubuntu-latest            │
│                      └── update status/current.md                 │
│                          (last 10 commits + open PRs)             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Workflows

### rtolab — [`lint.yml`](https://github.com/kostenyang/rtolab/blob/main/.github/workflows/lint.yml)

| | |
|-|-|
| **Trigger** | Every push (all branches) + PR to main |
| **Runner** | `win-labhost` (self-hosted) |
| **Jobs** | PSScriptAnalyzer · YAML Validation · Secret Scan |

**PSScriptAnalyzer**
- Settings: [`.github/PSScriptAnalyzerSettings.psd1`](https://github.com/kostenyang/rtolab/blob/main/.github/PSScriptAnalyzerSettings.psd1)
- Severity Error = block PR. Severity Warning = display only.
- Excluded rules (intentional lab patterns):
  - `PSAvoidUsingPlainTextForPassword` — credentials come from sops, passed to PowerCLI
  - `PSAvoidUsingConvertToSecureStringWithPlainText` — standard PowerCLI pattern
  - `PSUseCompatibleSyntax` — repo targets pwsh 7 only, no need to check PS 3/4/5/6

**YAML Validation**
- Parses all `*.yaml`/`*.yml` except `.github/` with `powershell-yaml`
- sops-encrypted files are valid YAML and parse fine

**Secret Scan**
- Patterns: GitHub PAT (`github_pat_`), `ghp_`, Anthropic key (`sk-ant-`), AWS key, PEM private keys
- Excludes: `*.example.*`, `*.enc.*`

---

### rtolab — [`ai-review.yml`](https://github.com/kostenyang/rtolab/blob/main/.github/workflows/ai-review.yml)

| | |
|-|-|
| **Trigger** | `workflow_dispatch` (manual) — PR number as input |
| **Runner** | `win-labhost` (self-hosted) |
| **Script** | [`.github/scripts/Invoke-ClaudeReview.ps1`](https://github.com/kostenyang/rtolab/blob/main/.github/scripts/Invoke-ClaudeReview.ps1) |
| **Secret needed** | `ANTHROPIC_API_KEY` in rtolab repo secrets |
| **Model** | `claude-sonnet-4-6` with prompt caching on system context |

**What it does**
1. Fetches PR metadata + changed files from GitHub API
2. Fetches raw diff (filtered to `.ps1`/`.yaml`/`.yml`/`.md`, truncated at 18k chars)
3. Calls Claude API with lab-specific system prompt (sops/PowerCLI/vmx-19 conventions)
4. Posts review as PR comment; updates existing comment on re-run (no spam)

**Review criteria**
- ⛔ Blocking: hardcoded credentials, incorrect clone sequence, wrong vmx version
- ⚠️ Suggestions: missing idempotency, no error handling, wrong `-Hosts` invocation pattern
- ✅ Praise: correct sops usage, proper pwsh 7 syntax

**To activate auto-trigger on every PR:**
```powershell
# 1. Get Anthropic API key from console.anthropic.com
# 2. Set secret
gh secret set ANTHROPIC_API_KEY --repo kostenyang/rtolab

# 3. Edit ai-review.yml: uncomment pull_request block at top of file
```

---

### lab-info — [`sync-rtolab.yml`](https://github.com/kostenyang/lab-info/blob/main/.github/workflows/sync-rtolab.yml)

| | |
|-|-|
| **Trigger** | Daily `cron: '0 2 * * *'` (02:00 UTC) + `workflow_dispatch` |
| **Runner** | `ubuntu-latest` (GitHub-hosted) |
| **Secret needed** | None — reads rtolab public API, writes lab-info with `GITHUB_TOKEN` |

**What it does**
1. Reads rtolab's last 10 commits + open PRs via GitHub API
2. Replaces the `<!-- auto-sync-start/end -->` block in `status/current.md`
3. Commits + pushes only if content changed

**To trigger manually:**
```bash
gh workflow run sync-rtolab.yml --repo kostenyang/lab-info
```

---

### rtolab — [`dry-run.yml`](https://github.com/kostenyang/rtolab/blob/main/.github/workflows/dry-run.yml)

| | |
|-|-|
| **Trigger** | PR to main touching `layer1-nested/` `layer2-bringup/` `inventory/` + `workflow_dispatch` |
| **Runner** | `win-labhost` (self-hosted) — needs PowerCLI + lab network |
| **Script** | [`.github/scripts/Invoke-DryRun.ps1`](https://github.com/kostenyang/rtolab/blob/main/.github/scripts/Invoke-DryRun.ps1) |
| **Secret needed** | `ESXI_ROOT_PW` (optional — Layer 1 skipped if absent) |
| **Artifacts** | `bringup-specs-<run_id>` — generated JSON spec (7 days retention) |

**Layer 1 — vSAN/LSOM dry-run**
- Connects to 4 nested ESXi (192.168.114.14–17) via PowerCLI
- Reads current advanced settings, compares with desired values
- `DRY_RUN` mode — no writes made
- Requires `ESXI_ROOT_PW` secret; skipped with warning if absent

**Layer 2 — Bringup spec generation**
- Runs `Generate-BringupSpec.ps1 -LabMode -OutputFile <temp>`
- Validates output JSON is parseable
- Requires sops age key at `~/.config/sops/age/keys.txt`; skipped with warning if absent

**Graceful skip logic**

| Condition | Layer 1 | Layer 2 |
|-----------|---------|---------|
| `ESXI_ROOT_PW` not set | Skip ⚠️ | Run normally |
| `inventory/secrets/lab.yaml` missing | — | Skip ⚠️ |
| sops age key missing | — | Skip ⚠️ |

---

## Secrets reference

| Secret | Repo | Status | Purpose |
|--------|------|--------|---------|
| `ANTHROPIC_API_KEY` | rtolab | ⏳ Pending | Claude API for ai-review.yml |
| `ESXI_ROOT_PW` | rtolab | ✅ Set | Primary ESXi root password (VMware1!VMware1!) |
| `ESXI_ROOT_PW_PSO` | rtolab | ✅ Set | PSO ESXi root password (VMware1!PSO) — fallback per host |
| `LAB_INFO_PAT` | rtolab | — | Not needed (sync moved to lab-info side) |
| `GITHUB_TOKEN` | all | ✅ Auto | Built-in per-workflow token |

---

## AI tool roles

| Tool | Where | How to use |
|------|-------|-----------|
| **Claude Code** | Local (`C:\Users\Administrator\rtolab`) | Interactive: write, refactor, debug. `cd lab-info && claude` loads full context. |
| **Codex CLI** | Local terminal | Quick one-shot: `codex "fix error handling in Upgrade-NestedESXi91.ps1"` |
| **Gemini** | VS Code / web | Large-context review: paste entire layer for architecture review |
| **Claude API** (CI) | GitHub Actions | Automated PR review via ai-review.yml |

---

## Roadmap

| Step | Status | Description |
|------|--------|-------------|
| 1 — Self-hosted runner | ✅ Done | `win-labhost` online, PowerCLI 13.5 installed, lab network reachable |
| 2 — Lint | ✅ Done | PSScriptAnalyzer + YAML + secret scan on every push |
| 3 — AI review | ⏳ Key pending | Claude PR review; activate with `ANTHROPIC_API_KEY` |
| 4 — lab-info sync | ✅ Done | Daily auto-update of status/current.md |
| 5 — Dry-run | ✅ Done | Layer 1 vSAN settings check + Layer 2 bringup spec validation |
| — vcf9.1-lab | 🔲 Not started | Apply same lint + sync to vcf9.1-lab repo |
