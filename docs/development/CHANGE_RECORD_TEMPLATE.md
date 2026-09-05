# Change Record Template

```yaml
change_id:
title:
created_at:
objective:
canonical_component:
owner_role:
status:
problem:
scope:
requirements: []
invariants: []
dependencies: []
risks: []
allowed_files: []
forbidden_files: []
implementation_plan: []
tests_required: []
negative_tests_required: []
evidence_required: []
evidence_produced: []
review_verdict:
ground_truth_before:
ground_truth_after_candidate:
blockers: []
open_questions: []
```

A coding agent receives one Change Record as its authority envelope. It may not expand the write surface, weaken invariants, or redefine canonical behavior without a new reviewed Change Record.
