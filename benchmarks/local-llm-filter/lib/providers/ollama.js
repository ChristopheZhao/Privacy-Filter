const parseJsonContent = (content) => {
  const trimmed = content.trim();
  if (!trimmed) {
    return { findings: [] };
  }

  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    return JSON.parse(withoutFence);
  }

  return JSON.parse(trimmed);
};

export class OllamaProvider {
  constructor(runtime, promptSections, findingsSchema) {
    this.baseUrl = runtime.base_url ?? 'http://127.0.0.1:11434';
    this.temperature = runtime.temperature ?? 0;
    this.timeoutMs = runtime.timeout_ms ?? 30000;
    this.think = runtime.think ?? false;
    this.promptSections = promptSections;
    this.findingsSchema = findingsSchema;
  }

  async analyzeText(text, variant) {
    const startedAt = Date.now();
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/chat`;
    const timeoutMs = variant.timeout_ms ?? this.timeoutMs;
    const think = variant.think ?? this.think;
    const messages = [];

    if (this.promptSections.systemPrompt) {
      messages.push({ role: 'system', content: this.promptSections.systemPrompt });
    }

    messages.push({
      role: 'user',
      content: this.promptSections.userTemplate.replace('{{INPUT_TEXT}}', text),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: variant.model,
          stream: false,
          think,
          format: this.findingsSchema,
          messages,
          options: {
            temperature: this.temperature,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const content = payload?.message?.content ?? '';
      const parsed = parseJsonContent(content);

      return {
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        parseOk: true,
        rawContent: content,
        rawThinking: payload?.message?.thinking ?? '',
        elapsedMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        findings: [],
        parseOk: false,
        rawContent: String(error?.message ?? error),
        rawThinking: '',
        error: String(error?.message ?? error),
        elapsedMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthcheck() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 5000));

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama healthcheck failed with status ${response.status}`);
      }

      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        message: String(error?.message ?? error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
