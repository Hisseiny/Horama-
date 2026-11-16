const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
export const TIMEOUT_MS = 45_000;

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// One call to the router. `content` is set only when the model answered; otherwise `error` says why.
export interface ModelCall {
  model: string;
  ms: number;
  status: number | null; // HTTP code, null when no response came (timeout, network)
  content?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  body?: unknown; // raw response of the router
  rejections?: string[]; // why the code refused the answer, filled by proposerTests
}

// Never throws and never prints a header: a failed call is returned with the HTTP code and the message of the service.
export async function callModel(model: string, messages: Message[]): Promise<ModelCall> {
  const start = Date.now();
  let status: number | null = null;
  let body: unknown;
  let error: string;
  try {
    const response = await fetch(ROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    status = response.status;
    const text = await response.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 300);
    }
    const { choices, usage, error: failure } = (typeof body === "object" && body ? body : {}) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: unknown;
    };
    const content = choices?.[0]?.message?.content;
    if (response.ok && typeof content === "string" && content.trim()) {
      return { model, ms: Date.now() - start, status, content, inputTokens: usage?.prompt_tokens, outputTokens: usage?.completion_tokens, body };
    }
    const message = (failure as { message?: unknown } | undefined)?.message ?? failure ?? body;
    error = response.ok ? "réponse sans contenu" : `HTTP ${status} : ${typeof message === "string" ? message : JSON.stringify(message)}`.slice(0, 300);
  } catch (thrown) {
    const { name, message } = thrown as Error;
    error = name === "TimeoutError" ? `délai de ${TIMEOUT_MS / 1000} s dépassé` : `appel impossible (${message})`;
  }
  return { model, ms: Date.now() - start, status, error, body };
}
