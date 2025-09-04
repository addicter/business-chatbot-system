import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export class FileProcessor {
  /**
   * Process a file by type and return cleaned text enriched with a contact card (when detected).
   */
  static async processFile(filePath, fileType, originalName) {
    console.log(`🔍 Processing file: ${originalName} with type: ${fileType}`);

    try {
      switch (fileType.toLowerCase()) {
        case 'pdf':
          // Temporarily return placeholder for PDF until fixed
          return `PDF Content from ${originalName}\n\nThis PDF file has been uploaded but text extraction is being processed. Please provide the key information from this PDF in the chat or upload as a text/word file for now.`;

        case 'csv':
          return await FileProcessor.processCSV(filePath);

        case 'txt':
        case 'plain':
        case 'text':
          return await FileProcessor.processText(filePath);

        case 'docx':
          return await FileProcessor.processDocx(filePath);

        case 'xlsx':
        case 'xls':
          return await FileProcessor.processExcel(filePath);

        default:
          console.error(`❌ Unsupported file type: ${fileType}`);
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${originalName}:`, error);
      throw error;
    }
  }

  // ============ Plain Text ============
  static async processText(filePath) {
    console.log(`📄 Reading text file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    const cleaned = FileProcessor.cleanText(content);
    const withCard = FileProcessor.appendContactCard(cleaned);
    console.log(`✅ Text processed: ${withCard.length} characters`);
    return withCard;
  }

  // ============ DOCX ============
  static async processDocx(filePath) {
    console.log(`📄 Reading DOCX file: ${filePath}`);
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const cleaned = FileProcessor.cleanText(result.value || '');
    const withCard = FileProcessor.appendContactCard(cleaned);
    console.log(`✅ DOCX processed: ${withCard.length} characters`);
    return withCard;
  }

  // ============ CSV ============
  static async processCSV(filePath) {
    console.log(`📊 Reading CSV file: ${filePath}`);
    return new Promise((resolve, reject) => {
      const results = [];
      const headers = [];

      createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
          console.log(`📊 CSV Headers: ${headerList.join(', ')}`);
        })
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          let text = `Data Summary:\n\nColumns: ${headers.join(', ')}\n\nContent:\n`;

          results.forEach((row, index) => {
            text += `\nRecord ${index + 1}:\n`;
            Object.entries(row).forEach(([key, value]) => {
              if (value && value.toString().trim()) {
                text += `- ${key}: ${value}\n`;
              }
            });
          });

          const cleaned = FileProcessor.cleanText(text);
          const withCard = FileProcessor.appendContactCard(cleaned);
          console.log(`✅ CSV processed: ${results.length} records, ${withCard.length} characters`);
          resolve(withCard);
        })
        .on('error', (error) => {
          console.error(`❌ CSV processing error:`, error);
          reject(error);
        });
    });
  }

  // ============ Excel ============
  static async processExcel(filePath) {
    console.log(`📊 Reading Excel file: ${filePath}`);
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer);
    let text = '';

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      text += `\n\nSheet: ${sheetName}\n`;
      text += `${'='.repeat(sheetName.length + 7)}\n`;

      jsonData.forEach((row, rowIndex) => {
        if (row.length > 0) {
          const rowClean = row.filter(cell => cell !== undefined && cell !== '').join(' | ');
          if (rowClean.trim()) {
            text += `Row ${rowIndex + 1}: ${rowClean}\n`;
          }
        }
      });
    });

    const cleaned = FileProcessor.cleanText(text);
    const withCard = FileProcessor.appendContactCard(cleaned);
    console.log(`✅ Excel processed: ${workbook.SheetNames.length} sheets, ${withCard.length} characters`);
    return withCard;
  }

  // ============ Cleaning / Chunking ============
  static cleanText(text) {
    return (text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t/g, ' ')
      .replace(/[ \u00A0]{2,}/g, ' ')
      .trim();
  }

  /**
   * Improved chunking: prefers paragraph breaks, then sentences, then newlines.
   * Increased default overlap to help retrieval for short Q&As like "contact".
   */
  static chunkText(text, maxLength = 1000, overlap = 200) {
    if (!text || text.length <= maxLength) {
      return text ? [text] : [];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxLength, text.length);

      if (end < text.length) {
        const lastParaBreak = text.lastIndexOf('\n\n', end);
        const lastSentence = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        let breakPoint = Math.max(lastParaBreak, lastSentence, lastNewline);

        if (breakPoint <= start + maxLength * 0.5) breakPoint = -1;
        if (breakPoint > start) end = breakPoint + 1;
      }

      const chunk = text.slice(start, end).trim();
      if (chunk) chunks.push(chunk);

      const nextStart = Math.max(start + 1, end - overlap);
      if (nextStart <= start) break;
      start = nextStart;
    }

    return chunks;
  }

  // ============ Keyword Extraction ============
  static extractKeywords(text, limit = 10) {
    const words = (text || '').toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other'].includes(word));

    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([word]) => word)
      .join(', ');
  }

  // ============ Categorization ============
  static categorizeContent(text, filename) {
    const content = (text || '').toLowerCase();
    const name = (filename || '').toLowerCase();

    function countKeyword(hay, needle) {
      const lowerKeyword = needle.toLowerCase();
      let count = 0, pos = 0;
      while ((pos = hay.indexOf(lowerKeyword, pos)) !== -1) {
        count++; pos += lowerKeyword.length;
      }
      return count;
    }

    const categories = {
      hours: { keywords: ['hours', 'timing', 'schedule', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'am', 'pm', 'open', 'close', 'operating', 'business hours', 'opening hours', 'closing time', 'weekdays', 'weekends'], weight: 1.5 },
      contact: { keywords: ['contact', 'phone', 'email', 'address', 'location', 'call', 'reach', 'telephone', 'mobile', 'whatsapp', 'gmail', 'yahoo', 'hotmail', 'street', 'city', 'pincode', 'zip'], weight: 1.2 },
      menu: { keywords: ['menu', 'food', 'dish', 'cuisine', 'appetizer', 'starter', 'main', 'dessert', 'beverage', 'drink', 'curry', 'rice', 'bread', 'naan', 'biryani', 'pizza', 'burger', 'sandwich', 'salad', 'soup'], weight: 1.0 },
      reservations: { keywords: ['reservation', 'booking', 'table', 'seat', 'waitlist', 'book', 'reserve', 'advance booking', 'party size', 'group booking'], weight: 1.0 },
      courses: { keywords: ['course', 'program', 'curriculum', 'subject', 'syllabus', 'class', 'lecture', 'tutorial', 'workshop', 'training', 'certification', 'degree', 'diploma', 'semester', 'batch', 'module'], weight: 1.0 },
      admissions: { keywords: ['admission', 'enroll', 'enrollment', 'application', 'apply', 'eligibility', 'requirement', 'entrance', 'selection', 'interview', 'document', 'form', 'deadline', 'registration'], weight: 1.0 },
      faculty: { keywords: ['faculty', 'teacher', 'instructor', 'professor', 'trainer', 'staff', 'experience', 'qualification', 'expertise', 'teaching', 'mentor'], weight: 1.0 },
      services: { keywords: ['service', 'treatment', 'therapy', 'consultation', 'diagnosis', 'procedure', 'surgery', 'checkup', 'examination', 'test', 'scan', 'x-ray', 'medicine', 'prescription'], weight: 1.0 },
      doctors: { keywords: ['doctor', 'physician', 'specialist', 'surgeon', 'consultant', 'medical', 'clinic', 'hospital', 'patient', 'appointment'], weight: 1.0 },
      pricing: { keywords: ['price', 'cost', 'fee', 'charge', 'rate', 'tariff', 'amount', 'rupee', 'dollar', 'payment', 'discount', 'offer', 'package deal'], weight: 0.8 },
      delivery: { keywords: ['delivery', 'takeaway', 'pickup', 'order', 'shipping', 'courier', 'packaging', 'home delivery', 'online order', 'swiggy', 'zomato', 'uber eats'], weight: 1.0 },
      directions: { keywords: ['direction', 'map', 'location', 'parking', 'metro', 'bus', 'transport', 'landmark', 'route', 'distance', 'accessibility', 'wheelchair', 'elevator'], weight: 1.0 },
      policies: { keywords: ['policy', 'terms', 'condition', 'rule', 'regulation', 'guideline', 'cancellation', 'refund', 'privacy', 'terms of service', 'disclaimer'], weight: 1.0 },
      events: { keywords: ['event', 'catering', 'party', 'celebration', 'wedding', 'corporate', 'meeting', 'conference', 'birthday', 'anniversary', 'private dining', 'banquet'], weight: 1.0 },
      amenities: { keywords: ['amenity', 'facility', 'wifi', 'parking', 'washroom', 'restroom', 'air conditioning', 'seating', 'comfort', 'convenience', 'infrastructure'], weight: 1.0 },
      technology: { keywords: ['app', 'website', 'online', 'digital', 'software', 'platform', 'login', 'account', 'password', 'registration', 'download', 'mobile app'], weight: 1.0 },
      support: { keywords: ['support', 'help', 'assistance', 'customer service', 'helpline', 'complaint', 'feedback', 'query', 'question', 'issue', 'problem', 'solution'], weight: 1.0 },
      offers: { keywords: ['offer', 'deal', 'promotion', 'discount', 'coupon', 'loyalty', 'reward', 'points', 'cashback', 'special', 'combo', 'package'], weight: 1.0 },
      dietary: { keywords: ['dietary', 'allergen', 'vegan', 'vegetarian', 'gluten', 'dairy', 'nut', 'sugar', 'organic', 'healthy', 'nutrition', 'calorie', 'ingredient'], weight: 1.0 },
      faq: { keywords: ['faq', 'frequently asked', 'question', 'answer', 'common', 'query', 'doubt', 'clarification'], weight: 1.0 },
      social: { keywords: ['social', 'instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'follow', 'share', 'community', 'review', 'rating'], weight: 1.0 }
    };

    const scores = {};
    Object.entries(categories).forEach(([category, config]) => {
      let score = 0;
      config.keywords.forEach(keyword => {
        const count = countKeyword(content, keyword);
        const nameMatch = name.includes(keyword) ? 1 : 0;
        score += (count + nameMatch) * config.weight;
      });
      scores[category] = score;
    });

    if (content.includes('₹') || content.includes('$') || content.includes('€')) {
      scores.pricing = (scores.pricing || 0) + 2;
    }
    if (content.includes('+91') || content.includes('+1') || content.includes('phone:') || content.includes('tel:')) {
      scores.contact = (scores.contact || 0) + 3;
    }
    if (content.includes('@') && (content.includes('.com') || content.includes('.in') || content.includes('.org'))) {
      scores.contact = (scores.contact || 0) + 2;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'general';

    const bestCategory = Object.entries(scores).find(([, score]) => score === maxScore)[0];
    console.log(`📂 Categorized as: ${bestCategory} (score: ${maxScore})`);
    return bestCategory;
  }

  // ============ Contact Card Extraction & Injection ============
  /**
   * Extract phone(s), whatsapp, email, address, website, and operating hours.
   * Robust to header variants and label variants (e.g., "Phone/WhatsApp").
   */
  static extractContactInfo(fullText) {
    const text = fullText || '';

    // ---- helpers
    const iIndexOf = (hay, needle, from = 0) =>
      hay.toLowerCase().indexOf(needle.toLowerCase(), from);

    const findHeaderIndex = (hay, options) => {
      for (const opt of options) {
        const idx = iIndexOf(hay, opt);
        if (idx !== -1) return { idx, header: opt };
      }
      return { idx: -1, header: null };
    };

    const isAllCapsHeader = (line) =>
      /^[A-Z0-9][A-Z0-9 /&+\-’'“”"–—:()]+$/.test(line.trim());

    const nextHeaderOrBlank = (hay, startPos) => {
      const after = hay.slice(startPos);
      const lines = after.split('\n');
      let offset = 0;
      for (let i = 1; i < lines.length; i++) {
        offset += lines[i - 1].length + 1;
        const t = lines[i].trim();
        if (t === '' || isAllCapsHeader(t)) {
          return startPos + offset;
        }
      }
      return hay.length;
    };

    const getSection = (hay, headerOptions) => {
      const { idx } = findHeaderIndex(hay, headerOptions);
      if (idx === -1) return '';
      const end = nextHeaderOrBlank(hay, idx);
      return hay.slice(idx, end);
    };

    const take = (src, regex) => {
      const m = src.match(regex);
      return m ? m[1].trim() : null;
    };

    const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const normalizePhone = (s) => (s || '')
      .replace(/[^+\d]/g, '') // keep + and digits
      .replace(/^\+?0+(\d)/, '+$1'); // avoid leading zeros

    const extractPhonesFrom = (src) => {
      const found = [];
      const re = /(\+?\d[\d\s\-()]{8,})/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const raw = m[1].trim();
        const normalized = normalizePhone(raw);
        const digitCount = (normalized.match(/\d/g) || []).length;
        if (digitCount >= 10) found.push(raw);
      }
      return unique(found);
    };

    // ---- header variants
    const contactHeaders = [
      'CONTACT & LOCATION',
      'CONTACT & HOURS',
      'CONTACTS & HOURS',
      'CONTACT/HOURS',
      'CONTACT DETAILS',
      'CONTACT',
      'CONTACTS'
    ];
    const hoursHeaders = [
      'OPERATING HOURS',
      'HOURS',
      'WORKING HOURS',
      'BUSINESS HOURS',
      'TIMINGS'
    ];

    const contactBlock = getSection(text, contactHeaders) || text; // fallback to full text
    const hoursBlock = getSection(text, hoursHeaders);

    // ---- label variants
    const phoneLabelRegexes = [
      /Phone\s*\/\s*WhatsApp\s*:\s*([^\n]+)/i,
      /Phone\s*&\s*WhatsApp\s*:\s*([^\n]+)/i,
      /WhatsApp\s*:\s*([^\n]+)/i,
      /Phone\s*:\s*([^\n]+)/i,
      /Tel(?:ephone)?\s*:\s*([^\n]+)/i,
    ];

    const emailRegex = /Email\s*:\s*([^\s\n]+)/i;
    const addressRegex = /Address\s*:\s*([^\n]+)/i;
    const websiteRegex = /Website\s*:\s*([^\n]+)/i;

    // Try labeled phones from contact block first
    let phones = [];
    let whatsapp = null;

    for (const re of phoneLabelRegexes) {
      const m = contactBlock.match(re);
      if (m) {
        const raw = m[1].trim();
        phones = phones.concat(extractPhonesFrom(raw));
        if (/WhatsApp/i.test(re.toString())) {
          whatsapp = extractPhonesFrom(raw)[0] || whatsapp;
        }
      }
    }

    // Fallback: scan the whole contact block for phone-like strings
    if (phones.length === 0) {
      phones = extractPhonesFrom(contactBlock);
    }
    // As a last resort, scan the entire text
    if (phones.length === 0) {
      phones = extractPhonesFrom(text);
    }

    // Email/Address/Website with fallback to full text
    const email = take(contactBlock, emailRegex) || take(text, emailRegex);
    const address = take(contactBlock, addressRegex) || take(text, addressRegex);
    const website = take(contactBlock, websiteRegex) || take(text, websiteRegex);

    // Hours: keep lines after header
    let hours = null;
    if (hoursBlock) {
      const lines = hoursBlock.split('\n').slice(1);
      const stopAt = lines.findIndex(l => {
        const t = l.trim();
        return t === '' || isAllCapsHeader(t);
      });
      hours = lines.slice(0, stopAt === -1 ? undefined : stopAt).join('\n').trim() || null;
    }

    // If nothing was found, return null to avoid noise
    if (phones.length === 0 && !email && !address && !website && !hours) {
      console.log('ℹ️ No contact info found.');
      return null;
    }

    // Log what we got
    console.log('📇 Extracted contact info:', {
      phones,
      whatsapp,
      email,
      address,
      website,
      hoursPreview: hours ? hours.slice(0, 80) + (hours.length > 80 ? '…' : '') : null
    });

    return {
      phones: unique(phones),
      whatsapp,
      email,
      address,
      website,
      hours
    };
  }

  /**
   * Append a fixed-format contact card near the top of the text to boost retrieval.
   */
  static appendContactCard(cleanedText) {
    const info = FileProcessor.extractContactInfo(cleanedText);
    if (!info) return cleanedText;

    const { phones, whatsapp, email, address, website, hours } = info;

    const phoneLine = phones && phones.length
      ? `Phone: ${phones.join(' , ')}`
      : null;

    const whatsappLine = whatsapp
      ? `WhatsApp: ${whatsapp}`
      : null;

    const emailLine = email ? `Email: ${email}` : null;
    const addressLine = address ? `Address: ${address}` : null;
    const websiteLine = website ? `Website: ${website}` : null;
    const hoursBlock = hours ? `Hours:\n${hours}` : null;

    const cardLines = [
      '=== CONTACT_CARD ===',
      phoneLine,
      whatsappLine,
      emailLine,
      addressLine,
      websiteLine,
      hoursBlock,
      '=== END_CONTACT_CARD ==='
    ].filter(Boolean);

    // Put the card at the very top so short queries reliably retrieve it
    return `${cardLines.join('\n')}\n\n${cleanedText}`;
  }
}