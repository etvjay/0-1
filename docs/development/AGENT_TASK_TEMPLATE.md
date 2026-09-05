# Coding Agent Task Manifest

```yaml
task_id:
change_id:
repo:
base_commit:
branch:
role: builder | tester | reviewer | integrator
objective:
read_first:
  - docs/canonical/GROUND_TRUTH.md
  - docs/canonical/PRODUCT_SPEC.md
  - docs/canonical/PRODUCT_SCHEMA.md
  - docs/canonical/ARCHITECTURE.md
  - docs/canonical/WORKFLOWS.md
  - docs/development/INVARIANTS.md
  - docs/development/INTERFACES.md
  - docs/development/AUTHORITY_MAP.md
  - docs/development/changes/<change>.md
requirements: []
invariants: []
allowed_files: []
forbidden_files: []
required_commands:
  - npm run check
  - npm test
tests_to_add: []
negative_mutations: []
deliverables:
  - exact files changed
  - commit SHA
  - command receipts
  - test receipts
  - unresolved risks
  - canonical handoff
must_not:
  - redefine product architecture
  - edit Ground Truth
  - add exchange write authority outside OrderWriter
  - weaken refusal/freshness/risk gates
  - claim live evidence without receipts
```
