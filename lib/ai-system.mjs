import OpenAI from 'openai';
import { getBusinessChunks } from './database.mjs';

export class AISystem {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.embeddingModel = process.env.DEFAULT_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.chatModel = process.env.DEFAULT_CHAT_MODEL || 'gpt-4o-mini';
  }

  async createEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  calculateCosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  // -------------------- Intent helpers --------------------
  isContactLike(text) {
    const t = (text || '').toLowerCase();
    const keys = [
      'contact', 'phone', 'call', 'whatsapp', 'email', 'address', 'location',
      'map', 'reach', 'visit', 'hours', 'timings', 'working hours', 'business hours'
    ];
    return keys.some(k => t.includes(k));
  }

  contactChunkScore(s) {
    if (!s) return 0;
    const text = s.toLowerCase();
    let score = 0;
    if (text.includes('=== contact_card ===')) score += 10;
    if (text.includes('phone:')) score += 3;
    if (text.includes('whatsapp:')) score += 2;
    if (text.includes('email:')) score += 2;
    if (text.includes('address:')) score += 2;
    if (text.includes('website:')) score += 1;
    if (text.includes('hours:')) score += 2;
    return score;
  }

  // -------------------- Retrieval --------------------
  async retrieveRelevantChunks(businessId, query, topK = 6) {
    try {
      const queryEmbedding = await this.createEmbedding(query);
      const chunks = getBusinessChunks(businessId) || [];
      if (chunks.length === 0) return [];

      // cosine similarity first
      const scored = chunks.map(chunk => ({
        ...chunk,
        similarity: this.calculateCosineSimilarity(queryEmbedding, chunk.embedding)
      })).sort((a, b) => b.similarity - a.similarity);

      let selected = scored.slice(0, topK);

      // Heuristic: for contact-like queries, force include the best contact chunk
      if (this.isContactLike(query)) {
        const bestContact = chunks
          .map(ch => ({ ...ch, cscore: this.contactChunkScore(ch.content) }))
          .filter(ch => ch.cscore > 0)
          .sort((a, b) => b.cscore - a.cscore)[0];

        if (bestContact && !selected.some(c => c.id === bestContact.id)) {
          // Replace last slot with contact chunk (or push if you prefer K+1)
          selected = [...selected.slice(0, topK - 1), bestContact];
        }
      }

      return selected;
    } catch (error) {
      console.error('Error retrieving chunks:', error);
      return [];
    }
  }

  // -------------------- Response generation --------------------
  buildFallbackContactCard(business) {
    const lines = ['=== FALLBACK_CONTACT_CARD ==='];
    if (business.phone)   lines.push(`Phone: ${business.phone}`);
    if (business.whatsapp || /whatsapp/i.test(business.phone || '')) {
      // If you store whatsapp separately, prefer it; otherwise phone may already be WA-enabled.
      const wa = business.whatsapp || business.phone;
      if (wa) lines.push(`WhatsApp: ${wa}`);
    }
    if (business.email)   lines.push(`Email: ${business.email}`);
    if (business.address) lines.push(`Address: ${business.address}`);
    if (business.website) lines.push(`Website: ${business.website}`);
    if (business.hours)   lines.push(`Hours:\n${business.hours}`);
    lines.push('=== END_FALLBACK_CONTACT_CARD ===');
    return lines.join('\n');
  }

  contextSeemsToHaveContact(context) {
    const t = (context || '').toLowerCase();
    return (
      t.includes('=== contact_card ===') ||
      t.includes('phone:') || t.includes('whatsapp:') ||
      t.includes('email:') || t.includes('address:') ||
      t.includes('website:') || t.includes('hours:')
    );
  }

  // Ensure the context always contains contact info for contact-like queries
  ensureContactInContext(context, business, query) {
    let ctx = context || '';
    if (this.isContactLike(query) && !this.contextSeemsToHaveContact(ctx)) {
      const fallback = this.buildFallbackContactCard(business);
      ctx = `${fallback}\n\n${ctx}`.trim();
    }
    return ctx;
  }

  async generateResponse(business, query, sessionHistory = [], relevantChunks = []) {
    try {
      // Prepare context from relevant chunks
      let context = (relevantChunks || [])
        .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
        .join('\n\n');

      // Safety net: if the user is asking for contact-like info and the context lacks it,
      // prepend a fallback card built from the business object.
      context = this.ensureContactInContext(context, business, query);

      // Build conversation messages
      const messages = [
        {
          role: 'system',
          content: this.buildSystemPrompt(business, context)
        }
      ];

      // Add last 6 turns of history
      (sessionHistory || []).slice(-6).forEach(msg => {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      });

      // Current user message
      messages.push({ role: 'user', content: query });

      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages,
        temperature: 0.2,          // more deterministic for factual details
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content ||
        'I apologize, but I had trouble generating a response. Please try again.';
    } catch (error) {
      console.error('Error generating response:', error);
      return 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.';
    }
  }

  buildSystemPrompt(business, context) {
    // IMPORTANT: Do NOT forbid using Business Info.
    // Prefer the retrieved context, but allow fallback to Business Information.
    const basePrompt = `You are a helpful AI assistant for ${business.name}.

BUSINESS INFORMATION (authoritative fallback if the context lacks specifics):
- Name: ${business.name}
- Description: ${business.description || '—'}
- Phone: ${business.phone || '—'}
- Email: ${business.email || '—'}
- Address: ${business.address || '—'}
- Website: ${business.website || '—'}
- Hours: ${business.hours || '—'}

PERSONALITY & STYLE:
- Friendly, professional, conversational; avoid sounding robotic.
- Use natural language that feels human; be concise but complete.
- Offer to help further or connect with a human when appropriate.

RESPONSE GUIDELINES:
- Prefer information in the CONTEXT below. If a requested field is missing in the context, use BUSINESS INFORMATION above.
- For contact/location questions, copy numbers, emails, URLs, and addresses exactly as written (no paraphrasing).
- Never invent prices, dates, or details not present in the context or business info.
- If something truly isn’t available in either, say so plainly and offer next steps.`;

    if (context && context.trim()) {
      return `${basePrompt}

CONTEXT (retrieved knowledge):
${context}

Answer the user using the context. If the context lacks a requested field, safely backfill from BUSINESS INFORMATION. If they conflict, prefer CONTEXT.`;
    }

    // If no context at all, we still allow Business Info
    return basePrompt;
  }

  analyzeIntent(message) {
    const msg = (message || '').toLowerCase();

    const intents = {
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      pricing: ['price', 'cost', 'fee', 'charge', 'money', 'expensive', 'cheap', 'budget'],
      programs: ['course', 'program', 'class', 'training', 'curriculum', 'syllabus'],
      schedule: ['time', 'schedule', 'timing', 'when', 'batch', 'duration'],
      admission: ['admission', 'enroll', 'join', 'register', 'apply', 'eligibility'],
      contact: ['contact', 'call', 'phone', 'email', 'address', 'location', 'visit', 'whatsapp'],
      demo: ['demo', 'trial', 'sample', 'free', 'preview'],
      placement: ['placement', 'job', 'career', 'employment', 'salary'],
      policies: ['policy', 'refund', 'terms', 'conditions', 'rules'],
      complaint: ['problem', 'issue', 'complain', 'bad', 'terrible', 'worst', 'disappointed']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => msg.includes(keyword))) {
        return intent;
      }
    }

    return 'inquiry';
  }

  analyzeSentiment(message) {
    const msg = (message || '').toLowerCase();

    const positive = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome', 'perfect', 'happy', 'satisfied', 'thank'];
    const negative = ['bad', 'terrible', 'worst', 'hate', 'awful', 'horrible', 'disappointed', 'angry', 'frustrated', 'sad'];

    const positiveCount = positive.filter(word => msg.includes(word)).length;
    const negativeCount = negative.filter(word => msg.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  shouldShowContactForm(intent, message) {
    const contactTriggers = [
      'contact', 'call me', 'speak to someone', 'human', 'agent',
      'phone number', 'email', 'visit', 'meet', 'appointment', 'whatsapp'
    ];

    return intent === 'contact' ||
      contactTriggers.some(trigger => (message || '').toLowerCase().includes(trigger));
  }

  generateSuggestions(intent, business) {
    return [];
  }
}

export const aiSystem = new AISystem();