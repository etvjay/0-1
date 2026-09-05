# 0-1 Binance Product Schema

## Object graph

```text
OpportunityWorkflow
├── OpportunityCandidate
├── EvidenceBundle
│   ├── EvidenceItem[]
│   ├── AdvocateOpinion
│   └── OpposeOpinion
├── CouncilDecision
│   └── TradeThesis
│       └── ExecutionMandate
│           ├── MandateRuntime
│           ├── ExecutionAssessment
│           └── ExecutionIntent
│               └── OrderReceipt
└── OutcomeRecord
```

```ts
type Direction = "LONG" | "SHORT" | "FLAT";

interface OpportunityWorkflow {
  workflowId: string;
  venue: "BINANCE";
  accountRef: string;
  symbol: string;
  strategy: string;
  status: "DISCOVERED" | "RESEARCHING" | "COUNCIL_REVIEW" | "THESIS_ACCEPTED" | "THESIS_REFUSED" | "MANDATE_ISSUED" | "MANDATE_ARMED" | "EXECUTING" | "FILLED" | "REFUSED" | "INVALIDATED" | "EXPIRED" | "FAILED";
  activeThesisId?: string;
  activeMandateId?: string;
  createdAt: number;
  updatedAt: number;
}

interface TradeThesis {
  thesisId: string;
  venue: "BINANCE";
  instrument: "SPOT" | "USD_M_FUTURES";
  symbol: string;
  direction: Direction;
  horizonMs: number;
  confidence: number;
  expectedMove: { bps: number; lowerBps: number; upperBps: number };
  reasoning: { method: string; advocateRef: string; opposeRef: string; marketAnalysisRef: string; evidenceBundleHash: string; councilDecisionHash: string };
  invalidationConditions: ThesisInvalidation[];
  createdAt: number;
  expiresAt: number;
}

interface ExecutionMandate {
  mandateId: string;
  version: number;
  thesisId: string;
  thesisHash: string;
  evidenceBundleHash: string;
  councilDecisionHash: string;
  venue: "BINANCE";
  accountRef: string;
  instrument: "SPOT" | "USD_M_FUTURES";
  symbol: string;
  side: "BUY" | "SELL";
  issuedAt: number;
  validFrom: number;
  expiresAt: number;
  maxUses: 1;
  anchor: { markPrice: number; bestBid: number; bestAsk: number; fundingRate?: number; observedAt: number; stateVersion: bigint };
  entry: { minPrice?: number; maxPrice?: number; trigger: "IMMEDIATE" | "PRICE_TOUCH" | "EDGE_THRESHOLD" };
  economics: { expectedMoveBps: number; minExecutableEdgeBps: number; maxSpreadBps: number; maxSlippageBps: number; maxFeeBps: number; maxFundingCostBps: number; maxTotalExecutionCostBps: number };
  risk: { maxNotionalUsd: number; maxPositionUsd: number; maxPortfolioExposureUsd: number; maxLeverage?: number; maxLossUsd?: number };
  invalidation: { maxAnchorDriftBps: number; maxMarketStateAgeMs: number; maxAccountStateAgeMs: number; maxVolatility?: number; maxFundingRate?: number; thesisExpiresAt: number; conditions: RuntimeInvalidation[] };
  execution: { orderType: "LIMIT" | "MARKETABLE_LIMIT"; timeInForce: "GTC" | "IOC"; maxRetries: number; maxOrderLifetimeMs: number; allowPartialFill: boolean; minFillFraction?: number };
}

interface StateEnvelope<T> { version: bigint; observedAt: number; receivedAt: number; value: T }

interface LiveMarketState { symbol: string; bestBid: number; bestAsk: number; markPrice: number; bids: DepthLevel[]; asks: DepthLevel[]; spreadBps: number; fundingRate?: number; volatility?: number; exchangeEventTime?: number }

interface LiveAccountState { accountRef: string; availableBalanceUsd: number; portfolioExposureUsd: number; positions: PositionState[]; openOrders: OpenOrderState[]; drawdownBps?: number }

interface ExecutionIntent { intentId: string; workflowId: string; mandateId: string; venue: "BINANCE"; accountRef: string; symbol: string; side: "BUY" | "SELL"; orderType: "LIMIT"; timeInForce: "GTC" | "IOC"; quantity: number; limitPrice: number; clientOrderId: string; marketStateVersion: bigint; accountStateVersion: bigint; createdAt: number }
```

Rules: one active thesis per workflow, one active mandate per `{account,symbol,strategy}` authority lane, immutable mandates, one initial intent per mandate in MVP, and full lineage from receipt back to workflow/thesis/mandate.
