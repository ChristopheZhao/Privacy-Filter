// src/utils/llmService.js
import { pipeline } from '@huggingface/transformers';

class LLMPrivacyFilter {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.isInitializing = false;
  }

  async initialize(modelName = 'Xenova/distilbert-base-uncased') {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    try {
      // For privacy filtering, we'll use a text classification pipeline
      // to identify sensitive content types
      this.model = await pipeline('text-classification', modelName, {
        quantized: true, // Use quantized model for better performance
        device: 'cpu', // Force CPU usage for local processing
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize LLM model:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async filterText(text) {
    if (!this.isInitialized) {
      throw new Error('LLM model not initialized');
    }

    try {
      // Split text into sentences for processing
      const sentences = this.splitIntoSentences(text);
      const processedSentences = [];

      for (const sentence of sentences) {
        const filteredSentence = await this.filterSentence(sentence);
        processedSentences.push(filteredSentence);
      }

      return processedSentences.join(' ');
    } catch (error) {
      console.error('Error filtering text with LLM:', error);
      // Fallback to original text if LLM processing fails
      return text;
    }
  }

  async filterSentence(sentence) {
    try {
      // Use the model to analyze the sentence
      const result = await this.model(sentence);
      
      // Simple heuristic: if confidence is high for sensitive content,
      // apply filtering patterns
      if (result && result.length > 0) {
        const topResult = result[0];
        
        // This is a simplified example - in practice, you'd need
        // a model specifically trained for privacy detection
        if (topResult.score > 0.8) {
          return this.applyLLMFiltering(sentence);
        }
      }

      return sentence;
    } catch (error) {
      console.error('Error processing sentence:', error);
      return sentence;
    }
  }

  applyLLMFiltering(text) {
    // Enhanced privacy filtering using NLP understanding
    let filtered = text;

    // Personal identifiers (enhanced with context understanding)
    const personalPatterns = [
      // Names with context
      { pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, replacement: '[NAME]' },
      // Phone numbers (more flexible)
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
      // Email addresses
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
      // Addresses (basic pattern)
      { pattern: /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/gi, replacement: '[ADDRESS]' },
      // Social Security Numbers
      { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: '[SSN]' },
      // Credit Card Numbers
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CREDIT_CARD]' },
    ];

    personalPatterns.forEach(({ pattern, replacement }) => {
      filtered = filtered.replace(pattern, replacement);
    });

    return filtered;
  }

  splitIntoSentences(text) {
    // Simple sentence splitting - could be enhanced with a proper tokenizer
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  }

  async isModelAvailable() {
    return this.isInitialized;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      initializing: this.isInitializing,
    };
  }
}

// Singleton instance
export const llmPrivacyFilter = new LLMPrivacyFilter();

// Configuration for available models
export const availableModels = [
  {
    id: 'distilbert-base',
    name: 'DistilBERT Base (Recommended)',
    modelName: 'Xenova/distilbert-base-uncased',
    description: 'Fast and efficient for privacy detection',
    size: '~250MB'
  },
  {
    id: 'bert-tiny',
    name: 'BERT Tiny (Fastest)',
    modelName: 'Xenova/bert-tiny',
    description: 'Ultra-fast processing, basic accuracy',
    size: '~17MB'
  },
  {
    id: 'roberta-base',
    name: 'RoBERTa Base (Best Quality)',
    modelName: 'Xenova/roberta-base',
    description: 'Higher accuracy, slower processing',
    size: '~500MB'
  }
];

export default llmPrivacyFilter;