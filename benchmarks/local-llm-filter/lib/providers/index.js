import { OllamaProvider } from './ollama.js';

export const createProvider = (runtime, promptSections, findingsSchema) => {
  switch (runtime.provider) {
    case 'ollama':
      return new OllamaProvider(runtime, promptSections, findingsSchema);
    default:
      throw new Error(`Unsupported benchmark provider: ${runtime.provider}`);
  }
};
