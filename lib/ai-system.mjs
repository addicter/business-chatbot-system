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
      // Return a default embedding or handle gracefully
      return new Array(1536).fill(0); // Default for text-embedding-3-small
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
      'map', 'reach', 'visit', 'hours', 'timings', 'working hours', 'business hours',
      'connect me', 'speak to someone', 'human', 'agent', 'talk to', 'meet'
    ];
    return keys.some(k => t.includes(k));
  }

  // NEW: Check if query is business-related
  isBusinessRelated(text, business) {
    const t = (text || '').toLowerCase();
    const businessName = (business.name || '').toLowerCase();
    
    // Generic business-related keywords (works for any business type)
    const businessKeywords = [
      // Direct business references
      businessName, 'business', 'company', 'store', 'shop', 'restaurant', 'cafe', 'hotel',
      'service', 'services', 'product', 'products', 'menu', 'food', 'drink', 'item', 'items',
      'price', 'cost', 'fee', 'charge', 'money', 'expensive', 'cheap', 'budget', 'offer', 'deal',
      'open', 'close', 'timing', 'hours', 'schedule', 'available', 'booking', 'reservation',
      
      // Contact and location (universal)
      'contact', 'phone', 'call', 'whatsapp', 'email', 'address', 'location',
      'visit', 'directions', 'how to reach', 'where', 'map', 'near', 'nearby',
      
      // Generic service-related terms
      'help', 'assist', 'support', 'information', 'details', 'about', 'tell me',
      'book', 'order', 'buy', 'purchase', 'get', 'need', 'want', 'looking for',
      'delivery', 'pickup', 'takeaway', 'dine in', 'home delivery',
      
      // Business operations
      'policy', 'policies', 'terms', 'conditions', 'rules', 'refund', 'cancellation',
      'quality', 'review', 'rating', 'feedback', 'complaint', 'problem',
      
      // Travel related to business location (acceptable)
      'far from', 'distance', 'travel time', 'how long', 'transport', 'bus', 'metro',
      'taxi', 'auto', 'train', 'flight', 'parking', 'reach'
    ];
    
    // Check if question contains business-related keywords
    const hasBusinessKeywords = businessKeywords.some(keyword => t.includes(keyword));
    
    // Check if asking about travel TO the business location
    const isTravelToLocation = (
      t.includes('far from') || t.includes('distance') || t.includes('how long') ||
      t.includes('travel') || t.includes('reach') || t.includes('directions')
    ) && (
      t.includes(businessName) || t.includes('there') || t.includes('location') || 
      t.includes('you') || t.includes('your')
    );
    
    // General knowledge questions (NOT business related)
    const generalKnowledgePatterns = [
      'who is', 'what is', 'when was', 'where was', 'how was', 'why is',
      'who was', 'what was', 'when is', 'where is', 'how is', 'why was',
      'tell me about', 'explain', 'define', 'meaning of', 'history of',
      'discovered', 'invented', 'created', 'founded', 'born', 'died',
      'capital of', 'president of', 'prime minister', 'cm of', 'governor of',
      'scientist', 'mathematician', 'philosopher', 'author', 'artist',
      'country', 'state', 'city', 'river', 'mountain', 'ocean', 'planet',
      'weather', 'temperature', 'climate', 'season', 'festival', 'religion',
      'sports', 'game', 'movie', 'book', 'song', 'music', 'recipe'
    ];
    
    const isGeneralKnowledge = generalKnowledgePatterns.some(pattern => t.includes(pattern));
    
    // Special case: if asking about food/recipe but not in context of business menu/services
    const isGenericFoodQuestion = (
      (t.includes('recipe') || t.includes('how to make') || t.includes('how to cook')) &&
      !t.includes(businessName) && !t.includes('menu') && !t.includes('your')
    );
    
    // If it's clearly general knowledge and not business-related, return false
    if ((isGeneralKnowledge || isGenericFoodQuestion) && !hasBusinessKeywords && !isTravelToLocation) {
      return false;
    }
    
    // If it has business keywords or is travel to location, it's business-related
    return hasBusinessKeywords || isTravelToLocation;
  }

  // NEW: Generate polite decline message for non-business queries
  generateDeclineMessage(business) {
    const responses = [
      `I'm here to help with questions related to ${business.name}. For general information, I'd recommend using a general search engine or AI assistant.`,
      `I can only assist with queries related to ${business.name} and our services. For other questions, please try a general search engine.`,
      `I'm specifically designed to help with ${business.name} related questions. For general knowledge queries, I'd suggest using Google or another search engine.`,
      `I focus on helping with ${business.name} inquiries only. For other topics, please use a general search engine or AI assistant.`
    ];
    
    const decline = responses[Math.floor(Math.random() * responses.length)];
    
    return `${decline}\n\nIs there anything specific about ${business.name} I can help you with? I can provide information about our services, pricing, location, contact details, or hours.`;
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

  // -------------------- Retrieval (ENHANCED) --------------------
  async retrieveRelevantChunks(businessId, query, topK = 6) {
    try {
      console.log(`🔍 Retrieving chunks for business ${businessId} with query: "${query}"`);
      
      const queryEmbedding = await this.createEmbedding(query);
      const chunks = await getBusinessChunks(businessId) || [];
      
      console.log(`📊 Found ${chunks.length} total chunks for business ${businessId}`);
      
      if (chunks.length === 0) {
        console.log('⚠️ No chunks found - returning empty array');
        return [];
      }

      // cosine similarity first
      const scored = chunks.map(chunk => ({
        ...chunk,
        similarity: this.calculateCosineSimilarity(queryEmbedding, chunk.embedding)
      })).sort((a, b) => b.similarity - a.similarity);

      console.log(`🎯 Top similarities: ${scored.slice(0, 3).map(c => c.similarity.toFixed(3)).join(', ')}`);

      let selected = scored.slice(0, topK);

      // Heuristic: for contact-like queries, force include the best contact chunk
      if (this.isContactLike(query)) {
        console.log('📞 Contact-like query detected, looking for contact chunks...');
        const bestContact = chunks
          .map(ch => ({ ...ch, cscore: this.contactChunkScore(ch.content) }))
          .filter(ch => ch.cscore > 0)
          .sort((a, b) => b.cscore - a.cscore)[0];

        if (bestContact && !selected.some(c => c.id === bestContact.id)) {
          console.log(`📇 Adding contact chunk with score ${bestContact.cscore}`);
          selected = [...selected.slice(0, topK - 1), bestContact];
        }
      }

      console.log(`✅ Retrieved ${selected.length} relevant chunks`);
      return selected;
    } catch (error) {
      console.error('❌ Error retrieving chunks:', error);
      // Don't return empty - this will trigger fallback to business info
      return [];
    }
  }

  // -------------------- Response generation (ENHANCED) --------------------
  buildFallbackContactCard(business) {
    const lines = ['I\'d be happy to help you get in touch! Here are our contact details:'];
    
    if (business.phone) {
      lines.push(`📞 Phone: ${business.phone}`);
    }
    
    if (business.whatsapp || /whatsapp/i.test(business.phone || '')) {
      const wa = business.whatsapp || business.phone;
      if (wa) lines.push(`💬 WhatsApp: ${wa}`);
    }
    
    if (business.email) {
      lines.push(`📧 Email: ${business.email}`);
    }
    
    if (business.address) {
      lines.push(`📍 Address: ${business.address}`);
    }
    
    if (business.website) {
      lines.push(`🌐 Website: ${business.website}`);
    }
    
    if (business.hours) {
      lines.push(`🕒 Business Hours:\n${business.hours}`);
    }
    
    lines.push('\nFeel free to reach out through any of these channels. We\'re here to help!');
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

  // Enhanced to always provide contact info for contact requests
  ensureContactInContext(context, business, query) {
    let ctx = context || '';
    if (this.isContactLike(query)) {
      if (!this.contextSeemsToHaveContact(ctx)) {
        const fallback = this.buildFallbackContactCard(business);
        ctx = `${fallback}\n\n${ctx}`.trim();
      }
    }
    return ctx;
  }

  // NEW: Graceful fallback response for contact requests
  generateContactResponse(business, query) {
    const responses = [
      "I'd be happy to help you connect with us! Here are our contact details:",
      "Let me share our contact information with you:",
      "Here's how you can reach us:",
      "I'd love to help you get in touch! Here are the best ways to contact us:"
    ];
    
    const intro = responses[Math.floor(Math.random() * responses.length)];
    const contactCard = this.buildFallbackContactCard(business);
    
    return `${intro}\n\n${contactCard}`;
  }

  async generateResponse(business, query, sessionHistory = [], relevantChunks = []) {
    try {
      console.log(`🤖 Generating response for query: "${query}" with ${relevantChunks.length} chunks`);
      
      // FIRST: Check if query is business-related
      if (!this.isBusinessRelated(query, business)) {
        console.log('❌ Non-business query detected - declining to answer');
        return this.generateDeclineMessage(business);
      }
      
      // Special handling for contact requests - always provide contact info
      if (this.isContactLike(query) && (!relevantChunks || relevantChunks.length === 0)) {
        console.log('📞 Contact request with no chunks - providing business contact info');
        return this.generateContactResponse(business, query);
      }
      
      // Prepare context from relevant chunks
      let context = (relevantChunks || [])
        .map((chunk, index) => {
          console.log(`📄 Chunk ${index + 1}: ${chunk.content.slice(0, 100)}...`);
          return `[${index + 1}] ${chunk.content}`;
        })
        .join('\n\n');

      console.log(`📝 Context length: ${context.length} characters`);

      // Safety net: ensure contact info is available for contact queries
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

      console.log(`🎬 Sending to OpenAI with ${messages.length} messages`);

      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages,
        temperature: 0.2,
        max_tokens: 500,
      });

      const aiResponse = response.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }
        
      console.log(`✅ Generated response: ${aiResponse.slice(0, 100)}...`);
      return aiResponse;
      
    } catch (error) {
      console.error('❌ Error generating response:', error);
      
      // GRACEFUL FALLBACK - Never show technical errors to users
      if (this.isContactLike(query)) {
        return this.generateContactResponse(business, query);
      }
      
      // For other queries, provide helpful business information
      return this.generateFallbackResponse(business, query);
    }
  }

  // NEW: Generate helpful fallback responses instead of error messages
  generateFallbackResponse(business, query) {
    const intent = this.analyzeIntent(query);
    
    switch (intent) {
      case 'pricing':
        return `I'd be happy to help you with pricing information! For the most accurate and up-to-date pricing details, please contact us directly:\n\n${this.buildFallbackContactCard(business)}`;
      
      case 'programs':
      case 'schedule':
      case 'admission':
        return `Thank you for your interest in our programs! I'd love to provide you with detailed information. Please reach out to us directly so we can discuss your specific needs:\n\n${this.buildFallbackContactCard(business)}`;
      
      case 'demo':
        return `I'd be happy to help arrange a demo for you! Please contact us using the details below and we'll set something up:\n\n${this.buildFallbackContactCard(business)}`;
      
      default:
        return `Thank you for reaching out to ${business.name}! I'm here to help you with any questions you might have. For immediate assistance, please feel free to contact us directly:\n\n${this.buildFallbackContactCard(business)}`;
    }
  }

  buildSystemPrompt(business, context) {
    const basePrompt = `You are a helpful AI assistant for ${business.name}.

IMPORTANT: You ONLY respond to queries related to ${business.name}. Do NOT answer general knowledge questions, current affairs, or topics unrelated to the business.

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
- Always offer to help further and provide contact information when appropriate.
- NEVER show technical errors or system messages to users.
- ONLY respond to business-related queries.

RESPONSE GUIDELINES:
- Prefer information in the CONTEXT below. If a requested field is missing in the context, use BUSINESS INFORMATION above.
- For contact/location questions, copy numbers, emails, URLs, and addresses exactly as written (no paraphrasing).
- Never invent prices, dates, or details not present in the context or business info.
- If something truly isn't available in either, gracefully offer to connect them with someone who can help.
- Always end responses helpfully - offer next steps or contact information.
- Stay focused on ${business.name} related topics only.`;

    if (context && context.trim()) {
      return `${basePrompt}

CONTEXT (retrieved knowledge):
${context}

Answer the user using the context. If the context lacks a requested field, safely backfill from BUSINESS INFORMATION. If they conflict, prefer CONTEXT. Always be helpful and provide contact information when users need more details. Remember: ONLY respond to ${business.name} related queries.`;
    }

    return `${basePrompt}

Remember: ONLY respond to queries specifically related to ${business.name} - courses, admissions, contact info, services, fees, schedules, etc. Do not answer general knowledge questions.`;
  }

  analyzeIntent(message) {
    const msg = (message || '').toLowerCase();

    const intents = {
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      pricing: ['price', 'cost', 'fee', 'charge', 'money', 'expensive', 'cheap', 'budget'],
      programs: ['course', 'program', 'class', 'training', 'curriculum', 'syllabus'],
      schedule: ['time', 'schedule', 'timing', 'when', 'batch', 'duration'],
      admission: ['admission', 'enroll', 'join', 'register', 'apply', 'eligibility'],
      contact: ['contact', 'call', 'phone', 'email', 'address', 'location', 'visit', 'whatsapp', 'connect me', 'speak to someone', 'human', 'agent'],
      demo: ['demo', 'trial', 'sample', 'free', 'preview'],
      placement: ['placement', 'job', 'career', 'employment', 'salary'],
      policies: ['policy', 'refund', 'terms', 'conditions', 'rules'],
      complaint: ['problem', 'issue', 'complain', 'bad', 'terrible', 'worst', 'disappointed'],
      // NEW: Non-business intent
      non_business: ['who is', 'what is', 'when was', 'where was', 'cm of', 'prime minister', 'president', 'scientist', 'discovered', 'invented', 'capital of', 'weather', 'temperature']
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
      'phone number', 'email', 'visit', 'meet', 'appointment', 'whatsapp',
      'connect me', 'talk to'
    ];

    return intent === 'contact' ||
      contactTriggers.some(trigger => (message || '').toLowerCase().includes(trigger));
  }

  generateSuggestions(intent, business) {
    return [];
  }
}

export const aiSystem = new AISystem();
