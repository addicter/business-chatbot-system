// database.mjs - DynamoDB version
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand, 
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { randomUUID as uuid } from 'node:crypto';
import crypto from 'node:crypto';

// Initialize DynamoDB client
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});
const docClient = DynamoDBDocumentClient.from(client);

// Table names
const TABLES = {
  BUSINESSES: 'BusinessChatbot-Businesses',
  DOCUMENTS: 'BusinessChatbot-Documents', 
  CHUNKS: 'BusinessChatbot-Chunks',
  CHAT_SESSIONS: 'BusinessChatbot-ChatSessions',
  MESSAGES: 'BusinessChatbot-Messages',
  LEADS: 'BusinessChatbot-Leads'
};

function generateSecureHash() {
  return crypto.randomBytes(16).toString('hex');
}

// Business management functions
export async function createBusiness(data) {
  const id = uuid();
  const apiKey = crypto.randomBytes(32).toString('hex');
  const chatHash = generateSecureHash();
  const analyticsHash = generateSecureHash();
  
  const business = {
    id,
    slug: data.slug,
    chat_hash: chatHash,
    analytics_hash: analyticsHash,
    name: data.name,
    description: data.description || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    website: data.website || '',
    hours: data.hours || '',
    timezone: data.timezone || 'Asia/Kolkata',
    maps_url: data.maps_url || '',
    logo_url: data.logo_url || '',
    primary_color: data.primary_color || '#6a5cff',
    secondary_color: data.secondary_color || '#00d4ff',
    welcome_message: data.welcome_message || 'Hi! How can I help you today?',
    system_prompt: data.system_prompt || '',
    enable_email_notifications: data.enable_email_notifications ?? true,
    enable_lead_capture: data.enable_lead_capture ?? true,
    enable_file_uploads: data.enable_file_uploads ?? true,
    api_key: apiKey,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLES.BUSINESSES,
      Item: business
    }));
    
    return { id, api_key: apiKey, chat_hash: chatHash, analytics_hash: analyticsHash };
  } catch (error) {
    console.error('Error creating business:', error);
    throw error;
  }
}

export async function getBusinessBySlug(slug) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.BUSINESSES,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));
    
    return result.Items?.[0];
  } catch (error) {
    console.error('Error getting business by slug:', error);
    throw error;
  }
}

export async function getBusinessByChatHash(chatHash) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.BUSINESSES,
      IndexName: 'ChatHashIndex',
      KeyConditionExpression: 'chat_hash = :chat_hash',
      ExpressionAttributeValues: {
        ':chat_hash': chatHash
      }
    }));
    
    return result.Items?.[0];
  } catch (error) {
    console.error('Error getting business by chat hash:', error);
    throw error;
  }
}

export async function getBusinessByAnalyticsHash(analyticsHash) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.BUSINESSES,
      IndexName: 'AnalyticsHashIndex',
      KeyConditionExpression: 'analytics_hash = :analytics_hash',
      ExpressionAttributeValues: {
        ':analytics_hash': analyticsHash
      }
    }));
    
    return result.Items?.[0];
  } catch (error) {
    console.error('Error getting business by analytics hash:', error);
    throw error;
  }
}

export async function getBusinessById(id) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.BUSINESSES,
      Key: { id }
    }));
    
    return result.Item;
  } catch (error) {
    console.error('Error getting business by id:', error);
    throw error;
  }
}

// Document management functions
export async function saveDocument(businessId, filename, originalName, fileType, fileSize, content, category = 'general') {
  const id = uuid();
  
  const document = {
    business_id: businessId,
    id,
    filename,
    original_name: originalName,
    file_type: fileType,
    file_size: fileSize,
    content,
    category,
    status: 'processed',
    upload_date: new Date().toISOString()
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLES.DOCUMENTS,
      Item: document
    }));
    
    return id;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
}

export async function saveChunk(businessId, documentId, chunkIndex, content, embedding, category = 'general', keywords = '') {
  const chunkId = `${documentId}#${chunkIndex}`;
  
  const chunk = {
    business_id: businessId,
    chunk_id: chunkId,
    document_id: documentId,
    chunk_index: chunkIndex,
    content,
    embedding,
    category,
    keywords
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLES.CHUNKS,
      Item: chunk
    }));
    
    return chunkId;
  } catch (error) {
    console.error('Error saving chunk:', error);
    throw error;
  }
}

export async function getBusinessChunks(businessId, category = null) {
  try {
    let params = {
      TableName: TABLES.CHUNKS,
      KeyConditionExpression: 'business_id = :business_id',
      ExpressionAttributeValues: {
        ':business_id': businessId
      }
    };
    
    if (category) {
      params.FilterExpression = 'category = :category';
      params.ExpressionAttributeValues[':category'] = category;
    }
    
    const result = await docClient.send(new QueryCommand(params));
    
    return result.Items?.map(item => ({
      id: item.chunk_id,
      content: item.content,
      embedding: item.embedding,
      category: item.category
    })) || [];
  } catch (error) {
    console.error('Error getting business chunks:', error);
    throw error;
  }
}

// Session and message functions
export async function createSession(businessId, userIp = '', userAgent = '') {
  const id = uuid();
  
  const session = {
    business_id: businessId,
    id,
    user_ip: userIp,
    user_agent: userAgent,
    user_name: '',
    user_email: '',
    user_phone: '',
    started_at: new Date().toISOString(),
    ended_at: null,
    total_messages: 0,
    session_duration_minutes: 0,
    is_lead: false,
    lead_score: 0,
    lead_notes: ''
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLES.CHAT_SESSIONS,
      Item: session
    }));
    
    return id;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

export async function updateSession(sessionId, updates) {
  try {
    const sessions = await docClient.send(new ScanCommand({
      TableName: TABLES.CHAT_SESSIONS,
      FilterExpression: 'id = :session_id',
      ExpressionAttributeValues: {
        ':session_id': sessionId
      }
    }));
    
    if (!sessions.Items?.length) {
      throw new Error('Session not found');
    }
    
    const businessId = sessions.Items[0].business_id;
    
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    Object.entries(updates).forEach(([key, value], index) => {
      const placeholder = `:val${index}`;
      const namePlaceholder = `#attr${index}`;
      
      updateExpression.push(`${namePlaceholder} = ${placeholder}`);
      expressionAttributeValues[placeholder] = value;
      expressionAttributeNames[namePlaceholder] = key;
    });
    
    await docClient.send(new UpdateCommand({
      TableName: TABLES.CHAT_SESSIONS,
      Key: {
        business_id: businessId,
        id: sessionId
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames
    }));
    
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

export async function saveMessage(sessionId, businessId, role, content, intent = '', sentiment = 'neutral', confidence = 0.0, retrievedChunks = []) {
  const id = uuid();
  const timestamp = new Date().toISOString();
  
  const message = {
    session_id: sessionId,
    timestamp,
    business_id: businessId,
    id,
    role,
    content,
    intent,
    sentiment,
    confidence,
    retrieved_chunks: retrievedChunks
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLES.MESSAGES,
      Item: message
    }));
    
    await docClient.send(new UpdateCommand({
      TableName: TABLES.CHAT_SESSIONS,
      Key: {
        business_id: businessId,
        id: sessionId
      },
      UpdateExpression: 'SET total_messages = total_messages + :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      }
    }));
    
    return id;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

export async function getSessionHistory(sessionId, limit = 10) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.MESSAGES,
      KeyConditionExpression: 'session_id = :session_id',
      ExpressionAttributeValues: {
        ':session_id': sessionId
      },
      ScanIndexForward: false,
      Limit: limit
    }));
    
    return result.Items?.map(item => ({
      role: item.role,
      content: item.content,
      timestamp: item.timestamp
    })).reverse() || [];
  } catch (error) {
    console.error('Error getting session history:', error);
    throw error;
  }
}

// Lead management
export async function createLead(businessId, sessionId, data) {
  const id = uuid();
  
  const lead = {
    business_id: businessId,
    id,
    session_id: sessionId,
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    interest: data.interest || '',
    budget: data.budget || '',
    timeline: data.timeline || '',
    message: data.message || '',
    status: 'new',
    source: 'chat',
    assigned_to: '',
    follow_up_date: null,
    notes: data.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLES.LEADS,
      Item: lead
    }));
    
    await updateSession(sessionId, { is_lead: true });
    
    return id;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
}

// Enhanced analytics
export async function getBusinessAnalytics(businessId, days = 30) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const sessionsResult = await docClient.send(new QueryCommand({
      TableName: TABLES.CHAT_SESSIONS,
      KeyConditionExpression: 'business_id = :business_id',
      FilterExpression: 'started_at >= :since',
      ExpressionAttributeValues: {
        ':business_id': businessId,
        ':since': since
      }
    }));
    
    const sessions = sessionsResult.Items || [];
    const totalSessions = sessions.length;
    const totalLeads = sessions.filter(s => s.is_lead).length;
    const avgMessages = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.total_messages || 0), 0) / sessions.length 
      : 0;
    
    const leadsResult = await docClient.send(new QueryCommand({
      TableName: TABLES.LEADS,
      KeyConditionExpression: 'business_id = :business_id',
      FilterExpression: 'created_at >= :since',
      ExpressionAttributeValues: {
        ':business_id': businessId,
        ':since': since
      },
      ScanIndexForward: false,
      Limit: 10
    }));
    
    return {
      totalSessions,
      totalLeads,
      avgMessagesPerSession: Math.round(avgMessages * 10) / 10,
      conversionRate: totalSessions > 0 ? Math.round((totalLeads / totalSessions) * 100 * 10) / 10 : 0,
      topIntents: [],
      dailyStats: [],
      recentLeads: leadsResult.Items || []
    };
    
  } catch (error) {
    console.error('Error getting business analytics:', error);
    throw error;
  }
}

export async function getAllBusinesses() {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLES.BUSINESSES,
      ProjectionExpression: 'id, slug, chat_hash, analytics_hash, #name, email, created_at',
      ExpressionAttributeNames: {
        '#name': 'name'
      }
    }));
    
    return result.Items?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [];
  } catch (error) {
    console.error('Error getting all businesses:', error);
    throw error;
  }
}

export async function getBusinessDocuments(businessId) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.DOCUMENTS,
      KeyConditionExpression: 'business_id = :business_id',
      ExpressionAttributeValues: {
        ':business_id': businessId
      },
      ScanIndexForward: false
    }));
    
    return result.Items || [];
  } catch (error) {
    console.error('Error getting business documents:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  console.log('✅ DynamoDB client initialized');
  return true;
}
