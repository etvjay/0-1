# 0-1 Binance Interfaces

```ts
function compileMandate(
  workflow: OpportunityWorkflow,
  thesis: TradeThesis,
  policy: ExecutionPolicy,
  anchor: StateEnvelope<LiveMarketState>,
  now?: number,
): ExecutionMandate;

interface MandateStore {
  issue(mandate: ExecutionMandate): Promise<void>;
  getActive(key: AuthorityKey): ExecutionMandate | null;
  supersede(oldMandateId: string, replacement: ExecutionMandate): Promise<void>;
  consumeForSubmission(mandateId: string, clientOrderId: string): Promise<void>;
  runtime(mandateId: string): MandateRuntime | null;
}

function evaluateMandate(
  workflow: OpportunityWorkflow,
  mandate: ExecutionMandate,
  market: StateEnvelope<LiveMarketState>,
  account: StateEnvelope<LiveAccountState>,
  policy: ExecutionPolicy,
  now?: number,
): ExecutionIntent | ExecutionRefusal;
```

`evaluateMandate()` contract: **no network I/O, no model I/O, deterministic for identical input**.

```ts
interface MarketStateAdapter {
  connect(): Promise<void>;
  close(): Promise<void>;
  snapshot(symbol: string): StateEnvelope<LiveMarketState> | null;
  onUpdate(handler: (state: StateEnvelope<LiveMarketState>) => void): () => void;
}

interface AccountStateAdapter {
  connect(): Promise<void>;
  close(): Promise<void>;
  snapshot(): StateEnvelope<LiveAccountState> | null;
  onUpdate(handler: (state: StateEnvelope<LiveAccountState>) => void): () => void;
}

interface OrderWriter {
  submit(intent: ExecutionIntent): Promise<OrderSubmissionResult>;
  cancel(request: CancelIntent): Promise<CancelResult>;
  reconcile(clientOrderId: string): Promise<OrderReceipt>;
}
```

Only `OrderWriter` may possess exchange write credentials/authority.
