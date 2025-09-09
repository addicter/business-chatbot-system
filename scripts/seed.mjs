import 'dotenv/config';
import { 
  createBusiness, saveDocument, saveChunk 
} from '../lib/database.mjs';
import { FileProcessor } from '../lib/file-processor.mjs';
import { aiSystem } from '../lib/ai-system.mjs';

async function createDemoBusiness(businessData, documents) {
  console.log(`Creating demo business: ${businessData.name}...`);
  
  try {
    // Create business - ADD AWAIT
    const result = await createBusiness(businessData);
    console.log(`✅ Business created with ID: ${result.id}`);
    
    // Process documents
    let totalChunks = 0;
    
    for (const doc of documents) {
      console.log(`  Processing document: ${doc.title}`);
      
      // Save document - ADD AWAIT
      const documentId = await saveDocument(
        result.id,
        `${doc.title.toLowerCase().replace(/\s+/g, '-')}.txt`,
        doc.title,
        'text/plain',
        doc.content.length,
        doc.content,
        doc.category || 'general'
      );
      
      // Create chunks
      const chunks = FileProcessor.chunkText(doc.content, 1000, 100);
      console.log(`  Created ${chunks.length} chunks`);
      
      // Generate embeddings and save chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const keywords = FileProcessor.extractKeywords(chunk);
        
        try {
          const embedding = await aiSystem.createEmbedding(chunk);
          // Save chunk - ADD AWAIT
          await saveChunk(result.id, documentId, i, chunk, embedding, doc.category || 'general', keywords);
          totalChunks++;
        } catch (error) {
          console.error(`    Error creating embedding for chunk ${i}:`, error.message);
        }
      }
    }
    
    console.log(`✅ ${businessData.name}: ${documents.length} documents, ${totalChunks} chunks created`);
    return result;
    
  } catch (error) {
    console.error(`❌ Error creating ${businessData.name}:`, error);
  }
}

// Demo business: Tech Institute
await createDemoBusiness({
  slug: 'demo-tech-institute',
  name: 'TechMaster Programming Institute',
  description: 'Leading programming and technology training institute offering comprehensive courses in software development, data science, and digital skills.',
  email: 'admissions@techmaster.edu',
  phone: '+91-98765-43210',
  address: 'Silicon Valley Complex, MG Road, Bengaluru, Karnataka 560001',
  website: 'https://techmaster.edu',
  hours: 'Monday to Saturday: 9:00 AM - 8:00 PM',
  maps_url: 'https://maps.google.com/?q=TechMaster+Institute+MG+Road+Bengaluru',
  primary_color: '#6a5cff',
  secondary_color: '#00d4ff',
  welcome_message: 'Hi! 👋 Welcome to TechMaster Institute. I\'m here to help you with information about our programming courses, fees, admission process, and career opportunities. What would you like to know?',
  enable_email_notifications: true,
  enable_lead_capture: true
}, [
  {
    title: 'Course Information',
    category: 'programs',
    content: `TechMaster Institute - Programming Courses 2025

🚀 FULL STACK DEVELOPMENT (6 months) - ₹75,000
Complete web development training covering HTML5, CSS3, JavaScript, React.js, Node.js, MongoDB
Batch Timings: Weekday Evening 7:00-9:00 PM, Weekend 10:00 AM-1:00 PM

💻 PYTHON + DATA SCIENCE (8 months) - ₹85,000  
Python programming, data analysis, machine learning with real projects
Batch Timings: Weekend 9:00 AM-1:00 PM, Weekday Tuesday-Thursday 6:30-8:30 PM

☁️ DEVOPS ENGINEERING (5 months) - ₹70,000
Linux, Docker, Kubernetes, CI/CD, AWS deployment
Batch Timings: Weekend Only Saturday-Sunday 10:00 AM-2:00 PM

📱 MOBILE APP DEVELOPMENT (6 months) - ₹65,000
React Native for iOS and Android development
Batch Timings: Weekday 7:00-9:00 PM, Weekend 2:00-5:00 PM

📚 ALL COURSES INCLUDE:
✅ Live instructor-led classes
✅ Hands-on projects and mentoring  
✅ Interview preparation
✅ 100% placement assistance
✅ Industry-recognized certificates`
  },
  {
    title: 'Admission Process',
    category: 'admissions',
    content: `TechMaster Institute - Admission Process 2025

🎯 SIMPLE ADMISSION PROCESS:
1. Free Career Counseling Session (30-45 minutes)
2. Free Demo Class Attendance  
3. Eligibility Assessment
4. Document Submission & Enrollment
5. Fee Payment & Batch Allocation

📋 ELIGIBILITY: Graduation in any field, Age 18-35 years, Basic computer literacy

💰 PAYMENT OPTIONS:
- One-time payment: 8% discount
- Two installments: 60% + 40%
- EMI options: 0% interest for 3-6 months
- Education loans available

🎓 SCHOLARSHIPS:
- Merit scholarship: Up to 25% off
- Early bird discount: 10% off
- Group enrollment: 15% off each

📞 CONTACT: +91-98765-43210 | admissions@techmaster.edu`
  },
  {
    title: 'Contact Information', 
    category: 'contact',
    content: `TechMaster Institute - Contact Details

📍 ADDRESS: 
Silicon Valley Complex, 3rd Floor, MG Road, Bengaluru 560001
Landmark: Opposite Forum Mall, Near Metro Station

📞 PHONE: +91-98765-43210
📧 EMAIL: info@techmaster.edu
🌐 WEBSITE: www.techmaster.edu

🕒 HOURS:
Monday-Friday: 9:00 AM - 8:00 PM
Saturday: 9:00 AM - 7:00 PM  
Sunday: 10:00 AM - 4:00 PM (Demo classes only)

🚇 HOW TO REACH:
Metro: Green Line to MG Road Station
Bus: Routes 201E, 356, 500 to Forum Mall stop
Parking: Available in building basement`
  }
]);

console.log('\n🎉 Demo business created successfully!');
console.log('\n🚀 Ready to test:');
console.log(`- Tech Institute: http://localhost:8080/chat/demo-tech-institute`);
console.log(`- Admin Dashboard: http://localhost:8080/admin`);
