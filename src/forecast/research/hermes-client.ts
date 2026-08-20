interface HermesChatPayload {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

const HERMES_REASONING_EFFORTS = new Set([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
]);

const configuredReasoningEffort = (): string => {
  const value = (process.env.ZERO_ONE_HERMES_REASONING_EFFORT ?? "low").trim().toLowerCase();
  return HERMES_REASONING_EFFORTS.has(value) ? value : "low";
};

export const extractHermesText = (payload: HermesChatPayload): string => {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content.map((item) => item.text ?? "").join("\n").trim();
    if (text) return text;
  }
  throw new Error("Hermes response contained no assistant content");
};

export const parseHermesJson = <T>(text: string): T => {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unfenced) as T;
};

export class HermesClient {
  private readonly endpoint: string;

  constructor(
    private readonly apiKey = process.env.HERMES_API_KEY ?? "",
    baseUrl = process.env.HERMES_BASE_URL ?? "http://127.0.0.1:8642/v1",
    private readonly model = process.env.HERMES_MODEL ?? "hermes-agent",
  ) {
    if (!apiKey) throw new Error("HERMES_API_KEY is required for the local Hermes research provider");
    this.endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  async chat(system: string, user: string, timeoutMs = 120_000): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        model_options: {
          reasoning_effort: configuredReasoningEffort(),
        },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Hermes request failed: ${response.status} ${await response.text()}`);
    return extractHermesText(await response.json() as HermesChatPayload);
  }
}
