import 'dotenv/config';
import { 
  createBusiness, saveDocument, saveChunk 
} from '../lib/database.mjs';
import { FileProcessor } from '../lib/file-processor.mjs';
import { aiSystem } from '../lib/ai-system.mjs';

async function createDemoBusiness(businessData, documents) {
  console.log(`Creating demo business: ${businessData.name}...`);
  
  try {
    // Create business
    const result = createBusiness(businessData);
    console.log(`✅ Business created with ID: ${result.id}`);
    
    // Process documents
    let totalChunks = 0;
    
    for (const doc of documents) {
      console.log(`  Processing document: ${doc.title}`);
      
      // Save document
      const documentId = saveDocument(
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
          saveChunk(result.id, documentId, i, chunk, embedding, doc.category || 'general', keywords);
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

// Demo business 1: Tech Institute
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
    title: 'Programming Courses and Fees',
    category: 'programs',
    content: `TechMaster Institute - Programming Courses 2025

🚀 FULL STACK DEVELOPMENT (6 months) - ₹75,000
Complete web development training covering:
- Frontend: HTML5, CSS3, JavaScript ES6+, React.js, Redux
- Backend: Node.js, Express.js, MongoDB, REST APIs
- Tools: Git, VS Code, Postman, Docker basics
- 4 Live Projects: E-commerce site, Social media app, Dashboard, Portfolio
- Job-ready portfolio development
Batch Timings:
- Weekday Evening: Monday-Friday 7:00-9:00 PM
- Weekend: Saturday-Sunday 10:00 AM-1:00 PM

💻 PYTHON + DATA SCIENCE (8 months) - ₹85,000
Comprehensive data science program:
- Python Programming: Core concepts, OOP, libraries
- Data Analysis: NumPy, Pandas, Matplotlib, Seaborn  
- Statistics & Probability for data science
- Machine Learning: Scikit-learn, algorithms, model evaluation
- Deep Learning: TensorFlow, neural networks
- Real datasets: Healthcare, Finance, E-commerce analytics
- 5 Industry Projects with mentorship
Batch Timings:
- Weekend: Saturday-Sunday 9:00 AM-1:00 PM
- Weekday: Tuesday-Thursday 6:30-8:30 PM

☁️ DEVOPS ENGINEERING (5 months) - ₹70,000
Modern DevOps practices and tools:
- Linux System Administration & Shell Scripting
- Version Control: Git, GitHub, GitLab
- Containerization: Docker, Docker Compose
- Container Orchestration: Kubernetes
- CI/CD Pipelines: Jenkins, GitHub Actions
- Cloud Platforms: AWS, Azure deployment
- Infrastructure as Code: Terraform basics
- Monitoring: Prometheus, Grafana
- 3 Real deployment projects
Batch Timings:
- Weekend Only: Saturday-Sunday 10:00 AM-2:00 PM

📱 MOBILE APP DEVELOPMENT (6 months) - ₹65,000
Cross-platform mobile development:
- React Native framework
- JavaScript for mobile development
- iOS and Android app deployment
- State management with Redux
- APIs integration and authentication
- Push notifications and analytics
- App store submission process
- 3 Complete mobile apps in portfolio
Batch Timings:
- Weekday: Monday-Friday 7:00-9:00 PM  
- Weekend: Saturday-Sunday 2:00-5:00 PM

🎨 UI/UX DESIGN + FRONTEND (4 months) - ₹55,000
Design and development combined:
- Design Principles and Color Theory
- User Research and Persona Development
- Wireframing and Prototyping
- Figma, Adobe XD, Sketch mastery
- HTML5, CSS3, Responsive Design
- JavaScript interactions
- Portfolio with 6 design projects
Batch Timings:
- Weekend: Saturday-Sunday 10:00 AM-1:00 PM

💼 SPECIAL COMBO PACKAGES:
- Full Stack + DevOps: ₹1,30,000 (Save ₹15,000)
- Data Science + Python Full Stack: ₹1,45,000 (Save ₹15,000)  
- Mobile + Full Stack: ₹1,25,000 (Save ₹15,000)

📚 ALL COURSES INCLUDE:
✅ Live instructor-led classes (not pre-recorded videos)
✅ Hands-on projects with industry mentors  
✅ Interview preparation and mock interviews
✅ Resume building and LinkedIn optimization
✅ 100% placement assistance with job guarantee*
✅ Access to 200+ hiring partner companies
✅ Alumni network of 5000+ successful professionals
✅ Industry-recognized course completion certificates
✅ 1-year doubt clearing and career support
✅ Flexible batch timings and make-up classes
✅ Modern computer lab with high-speed internet

*Job guarantee: If not placed within 6 months of course completion, get 50% fee refund`
  },
  {
    title: 'Admission Process and Requirements',
    category: 'admissions', 
    content: `TechMaster Institute - Admission Process 2025

🎯 SIMPLE ADMISSION PROCESS:

STEP 1: Free Career Counseling Session
- Schedule a personalized consultation with our career counselors
- Discuss your background, goals, and career aspirations  
- Get customized course recommendations based on your profile
- Understand complete fee structure and payment options
- Duration: 30-45 minutes
- Available: Walk-in or online video call

STEP 2: Free Demo Class Attendance  
- Attend a live demo class of your chosen course
- Experience our teaching methodology and interaction style
- Meet the instructor and current students
- Get hands-on experience with course materials
- Ask questions and clear all doubts
- No obligation to enroll

STEP 3: Eligibility Assessment
- Basic aptitude test for technical courses (simple logic and reasoning)
- English communication assessment
- Previous academic/work experience review
- Career goal alignment discussion

STEP 4: Document Submission & Enrollment
Required Documents:
- Educational certificates (10th, 12th, Graduation marksheets)
- Government photo ID (Aadhar/PAN/Driving License/Passport)
- 3 passport-size photographs
- Work experience letters (if applicable)
- Bank account details for placement salary crediting

STEP 5: Fee Payment & Batch Allocation
- Choose from flexible payment options
- Get assigned to your preferred batch timing
- Receive course materials and access credentials
- Join student WhatsApp group and orientation session

📋 ELIGIBILITY CRITERIA:

General Eligibility:
- Minimum qualification: Graduation in any field (final year students eligible)
- Age: 18-35 years (relaxable for exceptional candidates)
- Basic computer literacy required
- Good English communication skills (we provide improvement support)

Course-Specific Requirements:
- Full Stack Development: No prior programming experience needed
- Data Science: Basic mathematics knowledge helpful
- DevOps: Basic understanding of computer systems preferred  
- Mobile Development: No prior experience required
- UI/UX Design: Creative aptitude and design interest

💰 FLEXIBLE PAYMENT OPTIONS:

Option 1: One-Time Payment
- Pay full amount before course start
- Get 8% discount on total fees
- Includes all course materials and certificates

Option 2: Two Installments  
- 60% before course start
- 40% after completing 50% of course
- No extra charges or interest

Option 3: EMI Options
- 0% interest EMI for 3-6 months
- Available through partnerships with banks
- Requires minimal documentation
- Monthly payment as low as ₹12,000

Option 4: Education Loan
- Tie-ups with leading banks and NBFCs
- Loan amount up to ₹2,00,000
- Competitive interest rates starting from 10.5%
- Easy approval process with course offer letter

💳 Payment Methods Accepted:
- Bank transfer/NEFT/RTGS
- UPI payments (GPay, PhonePe, Paytm)
- Credit/Debit cards
- Cash payment at center
- Demand drafts

🎓 SCHOLARSHIP OPPORTUNITIES:

Merit Scholarships:
- Top 10% in entrance test: 25% scholarship
- Excellent academic record: 15% discount
- Referral from alumni: ₹10,000 off

Special Discounts:
- Early bird (enroll 15 days before batch): 10% off
- Student discount (with valid student ID): 12% off
- Women in Tech scholarship: 15% off for female candidates
- Military/Defense background: 20% off
- Group enrollment (3+ friends): 15% off each

📅 REFUND POLICY:

- 100% refund: Within first week of classes
- 75% refund: Within second week  
- 50% refund: Within third week
- No refund: After 21 days of course start
- Medical emergency: Case-by-case consideration with documentation

🗓️ UPCOMING BATCH START DATES:

January 2025:
- Full Stack Development: Jan 15 (Evening), Jan 20 (Weekend)
- Data Science: Jan 18 (Weekend), Jan 22 (Weekday)
- DevOps: Jan 25 (Weekend)

February 2025:  
- Mobile Development: Feb 1 (Evening), Feb 5 (Weekend)
- UI/UX Design: Feb 8 (Weekend)
- Full Stack Development: Feb 12 (Evening)

Limited Seats: Maximum 25 students per batch for personalized attention

📞 ADMISSION HELPLINE:
Phone: +91-98765-43210
WhatsApp: +91-98765-43210  
Email: admissions@techmaster.edu
Walk-in Hours: Mon-Sat 10:00 AM - 7:00 PM`
  },
  {
    title: 'Placement Support and Success Stories',
    category: 'placement',
    content: `TechMaster Institute - Placement Success & Career Support 2025

🎯 OUTSTANDING PLACEMENT RECORD:

Success Statistics (2024):
✅ 94% placement rate within 6 months
✅ 2,800+ students successfully placed
✅ 250+ active hiring partner companies  
✅ Average starting salary: ₹4.8 LPA
✅ Highest package achieved: ₹28 LPA (Data Science)
✅ Average salary hike for working professionals: 80%

🚀 COMPREHENSIVE PLACEMENT SUPPORT:

1. RESUME & PORTFOLIO BUILDING
- Professional resume templates optimized for ATS systems
- LinkedIn profile optimization and professional networking
- GitHub portfolio setup with project showcases
- Personal website/portfolio development
- Mock interview preparation and recording

2. INTERVIEW PREPARATION PROGRAM  
- Technical interview preparation (coding, system design)
- HR interview training and behavioral questions
- Group discussion and presentation skills
- Salary negotiation techniques and market research
- Company-specific preparation for top employers

3. SOFT SKILLS DEVELOPMENT
- Professional communication enhancement
- Business etiquette and workplace behavior
- Team collaboration and leadership skills  
- Time management and productivity techniques
- Email writing and professional correspondence

4. JOB ASSISTANCE & PLACEMENTS
- Direct campus placements with partner companies
- Job referrals through 5000+ alumni network
- Interview scheduling and coordination support
- Offer letter evaluation and negotiation assistance  
- Career transition guidance for working professionals

💼 TOP HIRING PARTNERS:

Tech Giants & MNCs:
- TCS, Infosys, Wipro, HCL Technologies
- Accenture, Capgemini, Cognizant, Tech Mahindra
- IBM, Microsoft, Amazon, Google (contract roles)
- Deloitte, EY, PwC, KPMG

Product Companies & Startups:
- Flipkart, Amazon India, Paytm, PhonePe
- Swiggy, Zomato, Ola, Uber India  
- Byju's, Unacademy, Vedantu
- Freshworks, Zoho, Razorpay
- 150+ fast-growing startups and scale-ups

Salary Ranges by Course:
- Full Stack Development: ₹3.5 - ₹12 LPA
- Data Science & ML: ₹4.5 - ₹28 LPA
- DevOps Engineering: ₹5 - ₹15 LPA  
- Mobile Development: ₹3.5 - ₹10 LPA
- UI/UX Design: ₹3 - ₹8 LPA

🌟 RECENT SUCCESS STORIES:

Priya Sharma - Full Stack Developer
- Background: B.Com graduate, no tech experience
- Course: Full Stack Development (6 months)
- Placed at: Flipkart as Software Developer
- Package: ₹8.5 LPA
- "The practical approach and live projects made all the difference!"

Rajesh Kumar - Data Scientist  
- Background: Mechanical Engineer, 3 years experience
- Course: Python + Data Science (8 months)
- Placed at: Paytm as Data Scientist
- Package: ₹15.2 LPA (180% hike from previous job)
- "Career transformation was smooth with excellent mentorship"

Anita Reddy - DevOps Engineer
- Background: IT graduate, 2 years testing experience  
- Course: DevOps Engineering (5 months)
- Placed at: Swiggy as DevOps Engineer
- Package: ₹12 LPA
- "Hands-on labs and real deployment projects were invaluable"

Vikram Singh - Mobile App Developer
- Background: Fresher, Computer Science graduate
- Course: Mobile Development (6 months)  
- Placed at: Ola as React Native Developer
- Package: ₹7.8 LPA
- "Great learning environment and industry connections"

🏆 PLACEMENT GUARANTEE PROGRAM:

Our Promise:
- Minimum 5 interview opportunities guaranteed
- If not placed within 6 months of course completion: 50% fee refund
- Lifetime placement support for all alumni
- Free upskilling sessions to stay current with technology

Eligibility for Guarantee:
- Attend minimum 90% of classes
- Complete all assignments and projects
- Participate actively in interview preparation
- Maintain professional attitude throughout

📈 CAREER GROWTH SUPPORT:

Ongoing Support:
- Annual alumni meetups and networking events
- Industry trend updates and skill enhancement workshops  
- Career advancement guidance and mentorship
- Job change assistance for better opportunities
- Entrepreneurship support and startup connections

Advanced Career Paths:
- Technical Lead/Architect roles (3-5 years experience)
- Product Manager transitions
- Freelancing and consulting opportunities  
- Startup founding and business development
- Teaching and training career options

💡 PLACEMENT PREPARATION TIMELINE:

Months 1-3 (During Course):
- Focus on learning and project development
- Build strong fundamentals and hands-on skills
- Start building professional network

Months 4-5:
- Resume building and portfolio development
- Technical interview preparation begins
- Mock interviews and peer practice

Month 6 & Beyond:
- Active job applications and interviews
- Placement assistance and company referrals
- Offer evaluation and salary negotiation

📞 PLACEMENT CELL CONTACT:
Phone: +91-98765-43212
Email: placements@techmaster.edu
Placement Officer: Ms. Sneha Patel
LinkedIn: linkedin.com/in/techmaster-placements

Success is not just about getting a job - it's about building a fulfilling career in technology!`
  },
  {
    title: 'Class Schedules and Demo Information',
    category: 'schedules',
    content: `TechMaster Institute - Class Schedules & Demo Classes 2025

⏰ CURRENT BATCH SCHEDULES:

📅 WEEKDAY BATCHES (Monday-Friday):

Full Stack Development:
🕘 Morning Batch: 10:00 AM - 12:00 PM
- Start Date: January 15, 2025
- Duration: 6 months
- Seats Available: 12/25

🕖 Evening Batch: 7:00 PM - 9:00 PM  
- Start Date: January 20, 2025
- Duration: 6 months
- Seats Available: 8/25

Python + Data Science:
🕕 Evening Batch: 6:30 PM - 8:30 PM
- Start Date: January 18, 2025  
- Duration: 8 months
- Days: Tuesday-Thursday + Saturday
- Seats Available: 15/25

Mobile App Development:
🕖 Evening Batch: 7:00 PM - 9:00 PM
- Start Date: February 1, 2025
- Duration: 6 months  
- Seats Available: 20/25

📅 WEEKEND BATCHES (Saturday-Sunday):

Full Stack Development:
🕘 Weekend Batch: 10:00 AM - 1:00 PM
- Start Date: January 25, 2025
- Duration: 6 months
- Seats Available: 10/25

🕑 Afternoon Batch: 2:00 PM - 5:00 PM
- Start Date: February 8, 2025
- Duration: 6 months  
- Seats Available: 22/25

Data Science:
🕘 Morning Batch: 9:00 AM - 1:00 PM
- Start Date: January 22, 2025
- Duration: 8 months
- Seats Available: 18/25

DevOps Engineering:
🕘 Full Weekend: 10:00 AM - 2:00 PM
- Start Date: February 5, 2025
- Duration: 5 months
- Seats Available: 20/25

UI/UX Design:
🕘 Weekend Morning: 10:00 AM - 1:00 PM  
- Start Date: February 12, 2025
- Duration: 4 months
- Seats Available: 25/25 (New batch!)

🎓 FREE DEMO CLASSES - Weekly Schedule:

Monday:
🕖 7:00 PM - Full Stack Development Demo
- Live coding session: "Build your first web app"
- Course overview and career opportunities
- Q&A with instructor and current students

Wednesday:  
🕖 7:00 PM - Data Science Demo
- "Data analysis with real datasets"
- Python programming live demonstration  
- Machine learning concepts explained

Friday:
🕖 7:00 PM - DevOps Demo
- "Deploy an app to the cloud in 60 minutes"
- Container and CI/CD demonstration
- Industry tools hands-on experience

Saturday:
🕘 11:00 AM - Mobile Development Demo  
- "Create your first mobile app"
- Cross-platform development showcase
- App store submission process

🕑 3:00 PM - UI/UX Design Demo
- "Design a mobile app interface"
- Live designing session with industry tools
- Portfolio building guidance

Sunday:
🕘 11:00 AM - Career Counseling & Course Overview
- All courses overview and comparison
- Career guidance based on your background
- Scholarship and payment option discussions

📝 DEMO CLASS BOOKING:

How to Book:
📞 Call: +91-98765-43210
💬 WhatsApp: +91-98765-43210
📧 Email: demo@techmaster.edu  
🌐 Website: www.techmaster.edu/demo
🚶 Walk-in: Mon-Sat 10 AM - 7 PM (no appointment needed)

What to Expect in Demo Classes:
✅ 90-minute interactive session
✅ Live project demonstration  
✅ Complete course curriculum walkthrough
✅ Industry trends and job market discussion
✅ Meet instructors and current batch students
✅ Campus tour and facilities showcase
✅ Instant enrollment discounts offered
✅ Free course materials sample
✅ Career guidance and course selection help

📍 DEMO CLASS VENUE:
TechMaster Institute
Silicon Valley Complex, 3rd Floor
MG Road, Bengaluru - 560001
(Opposite Forum Mall, Near Metro Station)

🎁 DEMO CLASS BENEFITS:
- No obligation to enroll
- Free course curriculum PDF
- Industry salary report download
- 10% discount coupon for enrollment  
- Free career assessment test
- Access to recorded sessions library
- Alumni network introduction

⏰ BATCH TIMING FLEXIBILITY:

Batch Change Policy:
- Switch between batches within first month (no extra cost)
- Weekend to weekday or vice versa allowed
- Make-up classes for missed sessions
- Holiday and exam period adjustments

Class Schedule Features:
- 15-minute breaks every hour
- Recorded sessions for revision
- Weekend doubt clearing sessions  
- Flexible attendance (minimum 75% required)
- Online backup classes during emergencies

🚨 SPECIAL WEEKEND WORKSHOPS:

Monthly Special Sessions:
- First Saturday: "Career in Tech" - Industry overview
- Second Saturday: "Resume Building" - Professional guidance  
- Third Saturday: "Interview Skills" - Mock interview practice
- Fourth Saturday: "Industry Networking" - Meet professionals

All workshops are FREE for enrolled students!

🎯 BATCH STRENGTH & PERSONAL ATTENTION:

- Maximum 25 students per batch
- 1:25 instructor-to-student ratio
- Dedicated lab assistants for hands-on sessions
- Personal mentors assigned to each student
- Individual project guidance and code reviews

📞 SCHEDULING QUERIES:
Admissions Team: +91-98765-43210
Batch Coordinator: Ms. Pooja Mehta
Email: schedule@techmaster.edu
WhatsApp: +91-98765-43210

Book your FREE demo class today and take the first step towards your tech career! 🚀`
  },
  {
    title: 'Contact Information and Location Details',
    category: 'contact',
    content: `TechMaster Institute - Complete Contact Information 2025

📍 MAIN CAMPUS ADDRESS:
TechMaster Programming Institute  
Silicon Valley Complex, 3rd Floor
MG Road, Bengaluru, Karnataka 560001
India

Landmark: Opposite Forum Mall, Next to Cafe Coffee Day
Near: Bangalore Metro Station (Green Line - MG Road Station)

📞 CONTACT NUMBERS:

Main Office: +91-98765-43210
📞 Admissions Helpline: +91-98765-43211
📞 Placement Cell: +91-98765-43212  
📞 Technical Support: +91-98765-43213
💬 WhatsApp: +91-98765-43210 (24/7 Quick Responses)

📧 EMAIL ADDRESSES:

General Inquiries: info@techmaster.edu
Admissions: admissions@techmaster.edu
Course Information: courses@techmaster.edu  
Placement Support: placements@techmaster.edu
Technical Issues: support@techmaster.edu
Director's Office: director@techmaster.edu

🌐 ONLINE PRESENCE:

Website: www.techmaster.edu
LinkedIn: linkedin.com/company/techmaster-institute
Instagram: @techmaster_bangalore
YouTube: TechMaster Institute Official
Facebook: facebook.com/TechMasterInstitute  
Twitter: @TechMasterEdu

🕒 OPERATING HOURS:

Monday to Friday: 9:00 AM - 8:00 PM
Saturday: 9:00 AM - 7:00 PM
Sunday: 10:00 AM - 4:00 PM (Counseling & Demo Classes Only)

Public Holidays: Closed
Special Events: Extended hours (advance notice given)

Walk-in Hours for Admissions:
Monday to Saturday: 10:00 AM - 6:00 PM
Sunday: 10:00 AM - 4:00 PM
No appointment required for basic inquiries

🚇 HOW TO REACH US:

By Bangalore Metro:
- Take Green Line to MG Road Station
- Exit from Gate 2 (Forum Mall side)  
- Walk 2 minutes to Silicon Valley Complex
- We're on 3rd floor (elevator available)

By Bus:
- BMTC Bus Routes: 201E, 356, 500, G-4, V-500
- Get down at MG Road (Forum Mall stop)
- Our building is directly opposite the mall

By Auto/Taxi:
- Show address: "Silicon Valley Complex, MG Road"
- Landmark: "Opposite Forum Mall"
- Parking available in building basement

By Car:
- Paid parking available in basement: ₹30 for 4 hours
- Valet parking service: ₹50 (weekends only)
- Free 30-minute parking for quick visits

By Two-Wheeler:  
- Free parking available on roadside
- Covered parking in basement: ₹10 per day

🏢 CAMPUS FACILITIES:

Infrastructure:
- 8 fully air-conditioned classrooms
- State-of-the-art computer lab (50+ systems)
- High-speed internet: 200 Mbps dedicated line
- Backup power supply (generator + UPS)
- Modern audio-visual equipment in all rooms

Student Amenities:
- Spacious library with 1000+ technical books
- Student lounge and break area
- Cafeteria with healthy snacks and beverages  
- Clean washrooms and drinking water
- Dedicated parking for students
- Free WiFi throughout the campus

Technical Setup:
- Latest computers with SSD and 16GB RAM
- Dual monitor setup for each student
- Licensed software (Visual Studio, Adobe, etc.)
- Cloud lab access for practice
- 24/7 server access for project hosting

🚨 EMERGENCY CONTACTS:

Security: +91-98765-43299
Medical Emergency: 108 (Government Helpline)
Campus Emergency: +91-98765-43210
Director's Mobile: +91-98765-43200 (urgent matters only)

After-hours Support:
- WhatsApp: +91-98765-43210 (monitored till 10 PM)
- Email queries: Responded within 12 hours
- Emergency technical issues: Same day response

📍 NEARBY LANDMARKS & SERVICES:

Within 100 meters:
- Forum Mall (shopping and food court)
- Cafe Coffee Day (meeting point)
- HDFC Bank & ATM
- Bangalore Metro Station
- Bus stop with multiple routes

Within 500 meters:  
- Manipal Hospital (medical emergency)
- Commercial Street (shopping)  
- Multiple restaurants and cafes
- Stationary and electronics shops
- Post office and courier services

🏨 ACCOMMODATION ASSISTANCE:

For Outstation Students:
We help you find:
- PG accommodations near campus
- Shared apartments with other students  
- Hostel facilities for boys and girls
- Budget-friendly options starting ₹8,000/month

Recommended Areas:
- Indiranagar (15 min by bus)
- Koramangala (20 min by metro)  
- BTM Layout (25 min by bus)
- Electronic City (for those with day jobs)

🌦️ WEATHER & BEST VISIT TIMES:

Bengaluru enjoys pleasant weather year-round!
- Best months to visit: October to March
- Monsoon season: June to September  
- Traffic is lighter: 10 AM - 4 PM
- Weekend visits: Less crowded, more personal attention

📱 QUICK CONTACT OPTIONS:

Fastest Response:
1. WhatsApp: +91-98765-43210 (instant replies 9 AM - 9 PM)
2. Phone Call: +91-98765-43210 (immediate assistance)  
3. Walk-in Visit: Best for detailed discussions
4. Email: For detailed inquiries and documents

Response Time Promise:
- WhatsApp: Within 15 minutes (9 AM - 9 PM)
- Phone calls: Immediate during office hours
- Emails: Within 4 hours on working days
- Walk-in queries: Immediate assistance

📊 CONTACT STATISTICS (2024):
- 15,000+ inquiries handled successfully
- 95% query resolution in first contact
- Average response time: 12 minutes
- Student satisfaction rating: 4.8/5

Visit us today and take the first step towards your dream tech career! 🚀

Our friendly team is always ready to help you with any questions about courses, admissions, careers, or campus life. Don't hesitate to reach out!`
  }
]);

// Demo business 2: Design Academy
await createDemoBusiness({
  slug: 'demo-design-academy',  
  name: 'Creative Design Academy',
  description: 'Premier design institute offering courses in UI/UX design, graphic design, web design, and digital creativity for aspiring designers.',
  email: 'hello@designacademy.in',
  phone: '+91-98765-54321',
  address: 'Design Hub, Hitech City, Hyderabad, Telangana 500081',
  website: 'https://designacademy.in',
  hours: 'Monday to Saturday: 10:00 AM - 7:00 PM',
  maps_url: 'https://maps.google.com/?q=Creative+Design+Academy+Hitech+City+Hyderabad',
  primary_color: '#ff6b6b',
  secondary_color: '#4ecdc4',
  welcome_message: 'Hello! 🎨 Welcome to Creative Design Academy. I can help you with information about our design courses, fees, portfolio development, and admission process. What would you like to explore?',
  enable_email_notifications: true,
  enable_lead_capture: true
}, [
  {
    title: 'Design Courses and Fee Structure',
    category: 'programs',
    content: `Creative Design Academy - Design Courses 2025

🎨 UI/UX DESIGN MASTERY (8 months) - ₹95,000
Comprehensive user experience and interface design:
- User Research & Persona Development  
- Information Architecture & User Journey Mapping
- Wireframing & Prototyping (Figma, Adobe XD, Sketch)
- Visual Design Principles & Design Systems
- Usability Testing & Analytics
- Mobile-first and responsive design
- Design thinking and problem-solving methodology
- Portfolio with 10+ real client projects
- Internship with partner design agencies
Batch Timings:
- Weekday: Monday-Friday 6:00-8:00 PM
- Weekend: Saturday-Sunday 10:00 AM-2:00 PM

🖼️ GRAPHIC DESIGN PROFESSIONAL (6 months) - ₹65,000
Complete visual communication training:
- Adobe Creative Suite mastery (Photoshop, Illustrator, InDesign)
- Brand Identity Design & Logo Creation
- Print Design (Brochures, Posters, Packaging)
- Digital Design (Social Media, Web Graphics)
- Typography & Color Theory
- Layout Design & Composition
- Client presentation and communication
- Portfolio with 15+ diverse projects
Batch Timings:
- Weekend: Saturday-Sunday 2:00-6:00 PM
- Weekday: Tuesday-Thursday 7:00-9:00 PM

💻 WEB DESIGN + DEVELOPMENT (10 months) - ₹1,15,000  
Design and code modern websites:
- Design Fundamentals & Web Typography
- HTML5, CSS3, JavaScript ES6+
- Responsive Web Design & Mobile Optimization
- WordPress & CMS Development
- E-commerce Website Design
- SEO and Performance Optimization
- Client project management
- 8 Complete website projects
Batch Timings:
- Weekend: Saturday-Sunday 9:00 AM-2:00 PM

🎬 MOTION GRAPHICS & ANIMATION (7 months) - ₹75,000
Bring designs to life with animation:
- After Effects mastery for motion graphics
- Premiere Pro for video editing
- 2D Animation techniques and principles
- Character Animation & Storytelling
- Color Grading & Visual Effects
- Sound design basics
- Client video projects and commercial work
- Portfolio reel with 12+ animated pieces
Batch Timings:
- Weekend: Saturday-Sunday 10:00 AM-3:00 PM

📱 DIGITAL MARKETING DESIGN (4 months) - ₹45,000
Design for digital marketing success:  
- Social Media Design Templates & Campaigns
- Google Ads Creative Design
- Email Marketing Templates & Automation
- Landing Page Design & Conversion Optimization  
- Brand Campaign Design & Strategy
- Analytics and performance tracking
Batch Timings:
- Weekday: Monday-Friday 7:00-9:00 PM

🏢 INTERIOR DESIGN FUNDAMENTALS (5 months) - ₹55,000
Space design and visualization:
- Space Planning & Layout Design
- Color Schemes & Material Selection  
- 3D Visualization (SketchUp, AutoCAD basics)
- Furniture Design & Selection
- Client consultation and presentation
- Site visits and real project experience
Batch Timings:
- Weekend: Saturday-Sunday 10:00 AM-1:00 PM

💼 DESIGN COMBO PACKAGES:
- UI/UX + Graphic Design: ₹1,40,000 (Save ₹20,000)
- Web Design + Motion Graphics: ₹1,65,000 (Save ₹25,000)  
- Complete Designer Bundle (All courses): ₹3,50,000 (Save ₹1,00,000)

🎓 ALL COURSES INCLUDE:
✅ Industry-experienced design mentors
✅ Latest design software licenses (Adobe, Figma, Sketch)
✅ Real client projects and internship opportunities  
✅ Personal portfolio website development
✅ Job placement assistance with design agencies
✅ Freelancing guidance and client acquisition
✅ Design contest participation and recognition
✅ Access to design community and networking events
✅ Flexible class schedules and make-up sessions
✅ Modern Mac lab with high-resolution displays
✅ Design books library and online resources
✅ Industry-recognized course certificates

🎨 UNIQUE FEATURES:
- Personal mentor assigned to each student
- Monthly design critique sessions with industry experts  
- Live client briefs and real-world project experience
- Design thinking workshops and creative problem solving
- Typography and color theory deep dives
- Brand identity development for portfolio
- Packaging design and print production knowledge
- User testing labs with real users
- Design trends and technology updates
- Creative confidence building and presentation skills`
  },
  {
    title: 'Portfolio Development and Career Support',
    category: 'placement',
    content: `Creative Design Academy - Portfolio & Career Success 2025

🎯 OUTSTANDING CAREER SUPPORT RECORD:

Success Statistics (2024):
✅ 89% job placement rate within 4 months
✅ 1,200+ designers successfully placed
✅ 150+ design agency partnerships
✅ Average starting salary: ₹4.2 LPA  
✅ Highest package: ₹18 LPA (Senior UX Designer)
✅ 85% students build successful freelance careers

🚀 COMPREHENSIVE PORTFOLIO DEVELOPMENT:

Personal Brand Building:
- Professional portfolio website design and development
- Personal logo and brand identity creation
- Social media presence optimization (Behance, Dribbble)
- LinkedIn profile optimization for designers
- Personal photography and professional headshots

Portfolio Projects (Included in Course):
- 3 UI/UX case studies with complete process documentation
- 5 brand identity projects from concept to final logo
- 4 web design projects (responsive and interactive)
- 6 print design pieces (brochures, posters, packaging)
- 2 motion graphics projects (explainer videos)
- 1 complete mobile app design (iOS and Android)

Portfolio Presentation:
- Storytelling techniques for design projects
- Case study documentation and process explanation
- Client presentation skills and confidence building
- Design critique and feedback incorporation
- Interview portfolio preparation

💼 CAREER PATHS & OPPORTUNITIES:

In-House Design Roles:
- UI/UX Designer: ₹3.5 - ₹12 LPA
- Graphic Designer: ₹2.8 - ₹8 LPA
- Web Designer: ₹3.2 - ₹10 LPA  
- Motion Designer: ₹4 - ₹15 LPA
- Brand Designer: ₹3.5 - ₹12 LPA
- Product Designer: ₹5 - ₹20 LPA

Agency & Studio Roles:
- Junior Designer: ₹2.5 - ₹5 LPA
- Senior Designer: ₹6 - ₹15 LPA
- Art Director: ₹8 - ₹25 LPA
- Creative Director: ₹12 - ₹40 LPA

Freelance & Consulting:
- Logo Design: ₹5,000 - ₹50,000 per project
- Website Design: ₹25,000 - ₹2,00,000 per project
- Brand Identity: ₹15,000 - ₹1,00,000 per project
- Monthly retainer clients: ₹20,000 - ₹1,50,000

🏢 TOP HIRING PARTNERS:

Design Agencies:
- Elephant Design, Fractal Ink, Happy mcgarrybowen
- Ogilvy, Leo Burnett, McCann Worldgroup  
- Cheil India, DDB Mudra, JWT India
- 80+ boutique design agencies

Tech Companies & Startups:
- Flipkart, Paytm, Swiggy, Zomato Design Teams
- Byju's, Unacademy, Vedantu (EdTech Design)
- Razorpay, Cred, Dream11 (FinTech Design)
- 200+ startups and growing companies

Traditional Industries:
- Advertising agencies and marketing firms
- Publishing houses and media companies
- Fashion and lifestyle brands
- Architecture and interior design firms

🌟 SUCCESS STORIES:

Sneha Patel - UI/UX Designer
- Background: Arts graduate, no design experience  
- Course: UI/UX Design Mastery (8 months)
- Placed at: Flipkart as Product Designer
- Package: ₹9.5 LPA
- "The real client projects gave me confidence to tackle any design challenge"

Arjun Mehta - Freelance Brand Designer  
- Background: Engineering graduate, career change
- Course: Graphic Design + Portfolio Building
- Current Status: Successful freelance designer
- Monthly Income: ₹1,20,000 average  
- "Academy's freelance guidance helped me build a sustainable design business"

Meera Shah - Motion Graphics Artist
- Background: Mass communication graduate
- Course: Motion Graphics & Animation
- Placed at: Red Chillies Entertainment
- Package: ₹7.8 LPA
- "Working on real commercial projects prepared me for industry demands"

Vikram Reddy - Creative Director
- Background: Fine arts graduate
- Course: Complete Designer Bundle
- Current Position: Creative Director at Leo Burnett  
- Package: ₹22 LPA (after 4 years growth)
- "Academy gave me the foundation, industry connections did the rest"

🎨 PORTFOLIO DEVELOPMENT PROCESS:

Month 1-2: Foundation Projects
- Learn design principles through practical projects
- Create first portfolio pieces with mentor guidance
- Develop personal design style and aesthetic

Month 3-5: Specialization Projects  
- Focus on chosen specialization (UI/UX, Branding, etc.)
- Work on complex, multi-stage projects
- Client collaboration and feedback incorporation

Month 6-8: Professional Portfolio  
- Portfolio website design and development
- Case study documentation and storytelling
- Industry presentation preparation

🚀 FREELANCE SUCCESS PROGRAM:

Client Acquisition Training:
- Upwork, Fiverr, and Freelancer platform optimization
- Cold outreach and networking strategies
- Proposal writing and client communication
- Pricing strategies and project scope definition

Business Skills:
- Freelance contract templates and legal basics
- Time management and project delivery
- Client relationship management
- Accounting and tax considerations for freelancers

Ongoing Support:
- Monthly freelancer meetups and networking
- Project collaboration opportunities with alumni
- Advanced skill workshops and trend updates
- Mentor access for complex client situations

🎓 DESIGN COMMUNITY & NETWORKING:

Regular Events:
- Monthly design meetups with industry professionals
- Portfolio review sessions with design leaders
- Design thinking workshops and creative challenges  
- Student exhibition and showcase events

Industry Connections:
- Guest lectures by design directors and creative leaders
- Agency visits and behind-the-scenes experiences
- Design conference attendance and networking
- Mentorship program with successful alumni

Online Community:
- Private Facebook group for students and alumni
- Design critique and feedback sessions
- Job posting and freelance opportunity sharing
- Resource sharing and industry updates

📞 CAREER SUPPORT CONTACT:
Career Counselor: Ms. Priya Sharma
Phone: +91-98765-54321
Email: careers@designacademy.in
Portfolio Review: By appointment (free for students)

Your creative journey starts here - let's build an amazing portfolio together! 🎨`
  }
]);

console.log('\n🎉 Demo businesses created successfully!');
console.log('\n🚀 Ready to test:');
console.log(`- Tech Institute: http://localhost:8080/chat/demo-tech-institute`);
console.log(`- Design Academy: http://localhost:8080/chat/demo-design-academy`);
console.log(`- Admin Dashboard: http://localhost:8080/admin`);
