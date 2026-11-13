# Graph Report - C:\Users\Regondi Calidad\Desktop\QM\TalentTrack  (2026-11-13)

## Corpus Check
- 43 files · ~102,090 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 262 nodes · 623 edges · 13 communities (8 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12

## God Nodes (most connected - your core abstractions)
1. `Store` - 59 edges
2. `AppController` - 38 edges
3. `Sanitizer` - 28 edges
4. `runUnitTests()` - 13 edges
5. `LeaveEngine` - 12 edges
6. `keywords` - 11 edges
7. `Exporter` - 10 edges
8. `DigitalSignaturePad` - 10 edges
9. `runE2ETests()` - 10 edges
10. `runComponentTests()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `runUnitTests()` --references--> `LeaveEngine`  [EXTRACTED]
  tests/unit.test.js → src/modules/leaves/leaveEngine.js
- `runUnitTests()` --references--> `LsdExporter`  [EXTRACTED]
  tests/unit.test.js → src/modules/payroll/lsdExporter.js
- `runUnitTests()` --references--> `PayrollEngine`  [EXTRACTED]
  tests/unit.test.js → src/modules/payroll/payrollEngine.js
- `runUnitTests()` --references--> `ImageUploadService`  [EXTRACTED]
  tests/unit.test.js → src/utils/imageUploadService.js
- `runSecurityTests()` --references--> `Sanitizer`  [EXTRACTED]
  tests/security.test.js → src/utils/sanitizer.js

## Import Cycles
- None detected.

## Communities (13 total, 5 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (26): app, CREDENTIAL_TYPES, ExpirationEngine, STATUS_LEVELS, EppEngine, LEAVE_STATUS, LEAVE_TYPES, LeaveEngine (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (10): RFC-4180, AlertDispatcher, Exporter, SKILL_CATEGORIES, SKILL_LEVELS, SkillsEngine, STANDARD_SKILLS, TRAINING_CATEGORIES (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (25): author, description, keywords, license, name, private, scripts, build (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (8): runIntegrationTests(), main(), TestHarness, __dirname, __filename, projectRoot, runSecurityTests(), runUnitTests()

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (11): __dirname, __filename, indexPath, packageJsonPath, parts, pkg, projectRoot, publicDir (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): __dirname, __filename, pkg, projectRoot, publicDir, versionData

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (5): __dirname, __filename, MIME_TYPES, root, server

## Knowledge Gaps
- **61 isolated node(s):** `name`, `short_name`, `description`, `start_url`, `display` (+56 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.