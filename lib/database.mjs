import Database from 'better-sqlite3';
import { randomUUID as uuid } from 'node:crypto';
import crypto from 'node:crypto';

const db = new Database('business_chatbot.sqlite');

// Generate secure hash for public endpoints
function generateSecureHash() {
  return crypto.randomBytes(16).toString('hex');
}

export function initializeDatabase() {
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    
    -- Enhanced businesses table with hash fields
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      chat_hash TEXT UNIQUE NOT NULL,      -- For /chat/{hash}
      analytics_hash TEXT UNIQUE NOT NULL, -- For /analytics/{hash}
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      
      -- Contact Information
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      website TEXT DEFAULT '',
      
      -- Business Hours & Location
      hours TEXT DEFAULT '',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      maps_url TEXT DEFAULT '',
      
      -- Branding
      logo_url TEXT DEFAULT '',
      primary_color TEXT DEFAULT '#6a5cff',
      secondary_color TEXT DEFAULT '#00d4ff',
      
      -- AI Configuration
      welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
      system_prompt TEXT DEFAULT '',
      
      -- Features
      enable_email_notifications BOOLEAN DEFAULT 1,
      enable_lead_capture BOOLEAN DEFAULT 1,
      enable_file_uploads BOOLEAN DEFAULT 1,
      
      -- Security
      api_key TEXT NOT NULL,
      
      -- Metadata
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Rest of the schema remains the same...
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'processed',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      keywords TEXT DEFAULT '',
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      user_name TEXT DEFAULT '',
      user_email TEXT DEFAULT '',
      user_phone TEXT DEFAULT '',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL,
      total_messages INTEGER DEFAULT 0,
      session_duration_minutes INTEGER DEFAULT 0,
      is_lead BOOLEAN DEFAULT 0,
      lead_score INTEGER DEFAULT 0,
      lead_notes TEXT DEFAULT '',
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      intent TEXT DEFAULT '',
      sentiment TEXT DEFAULT 'neutral',
      confidence REAL DEFAULT 0.0,
      retrieved_chunks TEXT DEFAULT '',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      interest TEXT DEFAULT '',
      budget TEXT DEFAULT '',
      timeline TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      source TEXT DEFAULT 'chat',
      assigned_to TEXT DEFAULT '',
      follow_up_date DATE DEFAULT NULL,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
    
    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
    CREATE INDEX IF NOT EXISTS idx_businesses_chat_hash ON businesses(chat_hash);
    CREATE INDEX IF NOT EXISTS idx_businesses_analytics_hash ON businesses(analytics_hash);
    CREATE INDEX IF NOT EXISTS idx_documents_business ON documents(business_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_business ON chunks(business_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_business ON chat_sessions(business_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id);
  `);
}

// Enhanced business management functions
export function createBusiness(data) {
  const id = uuid();
  const apiKey = crypto.randomBytes(32).toString('hex');
  const chatHash = generateSecureHash();
  const analyticsHash = generateSecureHash();
  
  const stmt = db.prepare(`
    INSERT INTO businesses (
      id, slug, chat_hash, analytics_hash, name, description, email, phone, address, website,
      hours, maps_url, logo_url, primary_color, secondary_color,
      welcome_message, system_prompt, enable_email_notifications,
      enable_lead_capture, api_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id, data.slug, chatHash, analyticsHash, data.name, data.description || '', data.email || '',
    data.phone || '', data.address || '', data.website || '',
    data.hours || '', data.maps_url || '', data.logo_url || '',
    data.primary_color || '#6a5cff', data.secondary_color || '#00d4ff',
    data.welcome_message || 'Hi! How can I help you today?',
    data.system_prompt || '', data.enable_email_notifications ? 1 : 0,
    data.enable_lead_capture ? 1 : 0, apiKey
  );
  
  return { id, api_key: apiKey, chat_hash: chatHash, analytics_hash: analyticsHash };
}

export function getBusinessBySlug(slug) {
  return db.prepare('SELECT * FROM businesses WHERE slug = ?').get(slug);
}

export function getBusinessByChatHash(chatHash) {
  return db.prepare('SELECT * FROM businesses WHERE chat_hash = ?').get(chatHash);
}

export function getBusinessByAnalyticsHash(analyticsHash) {
  return db.prepare('SELECT * FROM businesses WHERE analytics_hash = ?').get(analyticsHash);
}

export function getBusinessById(id) {
  return db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
}

// Document management functions (unchanged)
export function saveDocument(businessId, filename, originalName, fileType, fileSize, content, category = 'general') {
  const id = uuid();
  const stmt = db.prepare(`
    INSERT INTO documents (id, business_id, filename, original_name, file_type, file_size, content, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, businessId, filename, originalName, fileType, fileSize, content, category);
  return id;
}

export function saveChunk(businessId, documentId, chunkIndex, content, embedding, category = 'general', keywords = '') {
  const id = uuid();
  const stmt = db.prepare(`
    INSERT INTO chunks (id, business_id, document_id, chunk_index, content, embedding, category, keywords)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, businessId, documentId, chunkIndex, content, JSON.stringify(embedding), category, keywords);
  return id;
}

export function getBusinessChunks(businessId, category = null) {
  let query = 'SELECT id, content, embedding, category FROM chunks WHERE business_id = ?';
  let params = [businessId];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY category, chunk_index';
  
  return db.prepare(query).all(...params).map(row => ({
    ...row,
    embedding: JSON.parse(row.embedding)
  }));
}

// Session and message functions (unchanged but updated for new structure)
export function createSession(businessId, userIp = '', userAgent = '') {
  const id = uuid();
  const stmt = db.prepare(`
    INSERT INTO chat_sessions (id, business_id, user_ip, user_agent)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(id, businessId, userIp, userAgent);
  return id;
}

export function updateSession(sessionId, updates) {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(sessionId);
  
  const stmt = db.prepare(`UPDATE chat_sessions SET ${fields} WHERE id = ?`);
  return stmt.run(...values);
}

export function saveMessage(sessionId, businessId, role, content, intent = '', sentiment = 'neutral', confidence = 0.0, retrievedChunks = []) {
  const id = uuid();
  const stmt = db.prepare(`
    INSERT INTO messages (id, session_id, business_id, role, content, intent, sentiment, confidence, retrieved_chunks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, sessionId, businessId, role, content, intent, sentiment, confidence, JSON.stringify(retrievedChunks));
  
  db.prepare('UPDATE chat_sessions SET total_messages = total_messages + 1 WHERE id = ?').run(sessionId);
  
  return id;
}

export function getSessionHistory(sessionId, limit = 10) {
  return db.prepare(`
    SELECT role, content, timestamp FROM messages 
    WHERE session_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `).all(sessionId, limit).reverse();
}

// Lead management
export function createLead(businessId, sessionId, data) {
  const id = uuid();
  const stmt = db.prepare(`
    INSERT INTO leads (id, business_id, session_id, name, email, phone, interest, budget, timeline, message, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id, businessId, sessionId, data.name, data.email, data.phone || '',
    data.interest || '', data.budget || '', data.timeline || '',
    data.message || '', data.notes || ''
  );
  
  updateSession(sessionId, { is_lead: 1 });
  
  return id;
}

// Enhanced analytics
export function getBusinessAnalytics(businessId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const totalSessions = db.prepare(`
    SELECT COUNT(*) as count FROM chat_sessions 
    WHERE business_id = ? AND started_at >= ?
  `).get(businessId, since)?.count || 0;
  
  const totalLeads = db.prepare(`
    SELECT COUNT(*) as count FROM leads 
    WHERE business_id = ? AND created_at >= ?
  `).get(businessId, since)?.count || 0;
  
  const avgMessages = db.prepare(`
    SELECT AVG(total_messages) as avg FROM chat_sessions 
    WHERE business_id = ? AND started_at >= ? AND total_messages > 0
  `).get(businessId, since)?.avg || 0;
  
  const topIntents = db.prepare(`
    SELECT intent, COUNT(*) as count FROM messages 
    WHERE business_id = ? AND timestamp >= ? AND intent != '' 
    GROUP BY intent 
    ORDER BY count DESC 
    LIMIT 5
  `).all(businessId, since);
  
  const dailyStats = db.prepare(`
    SELECT 
      DATE(started_at) as date,
      COUNT(*) as sessions,
      SUM(CASE WHEN is_lead = 1 THEN 1 ELSE 0 END) as leads
    FROM chat_sessions 
    WHERE business_id = ? AND started_at >= ?
    GROUP BY DATE(started_at)
    ORDER BY date DESC
    LIMIT 30
  `).all(businessId, since);

  const recentLeads = db.prepare(`
    SELECT name, email, phone, interest, created_at
    FROM leads 
    WHERE business_id = ? AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(businessId, since);
  
  return {
    totalSessions,
    totalLeads,
    avgMessagesPerSession: Math.round(avgMessages * 10) / 10,
    conversionRate: totalSessions > 0 ? Math.round((totalLeads / totalSessions) * 100 * 10) / 10 : 0,
    topIntents,
    dailyStats,
    recentLeads
  };
}

export function getAllBusinesses() {
  return db.prepare('SELECT id, slug, chat_hash, analytics_hash, name, email, created_at FROM businesses ORDER BY created_at DESC').all();
}

export function getBusinessDocuments(businessId) {
  return db.prepare(`
    SELECT id, filename, original_name, file_type, file_size, category, upload_date, status
    FROM documents 
    WHERE business_id = ? 
    ORDER BY upload_date DESC
  `).all(businessId);
}

// Initialize database on import
initializeDatabase();