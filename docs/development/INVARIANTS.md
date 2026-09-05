# 0-1 Binance Invariants

```text
INV-P01 OPINION ≠ TRADE
INV-P02 FORECAST EDGE ≠ EXECUTABLE EDGE
INV-P03 REFUSAL is a valid outcome
INV-P04 transaction receipt ≠ profitable outcome

INV-R01 Research may not send orders
INV-R02 Query intent is not evidence stance
INV-R03 OPPOSE cannot be omitted from decisive research
INV-R04 Council refusal cannot be bypassed downstream

INV-M01 Mandates are immutable
INV-M02 Mandate cannot broaden thesis venue/symbol/direction
INV-M03 Mandate has explicit expiry
INV-M04 MVP mandate is single-use
INV-M05 Superseded/expired/revoked/used mandate cannot execute

INV-H01 Hot path calls no LLM
INV-H02 Hot path performs no research retrieval
INV-H03 Stale market state fails closed
INV-H04 Stale account state fails closed
INV-H05 Executable edge must satisfy mandate floor
INV-H06 Current exposure must satisfy mandate bounds
INV-H07 Order price must remain inside mandate bounds

INV-E01 Only OrderWriter owns exchange writes
INV-E02 Mandate is consumed/persisted before outbound I/O
INV-E03 Every order has deterministic client identity bound to mandate
INV-E04 UNKNOWN submission does not trigger blind retry
INV-E05 Reconciliation observes exchange truth before retry/correction

INV-D01 Builder cannot self-approve
INV-D02 Implementation does not automatically change Ground Truth
INV-D03 Ground Truth requires tests + negative tests + review + evidence
INV-D04 Parallel coding requires bounded write surfaces or explicit sequencing
INV-D05 Chat memory is not canonical project truth
```
