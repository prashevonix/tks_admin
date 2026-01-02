
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Secrets');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testProfiles = [
  {
    // Profile 1 - Software Engineer in Bangalore
    firstName: 'Arjun',
    lastName: 'Sharma',
    email: 'arjun.sharma@demo.com',
    phone: '+91-9876543210',
    gender: 'male',
    graduationYear: 2018,
    batch: '2018',
    course: 'B.Tech',
    branch: 'Computer Science Engineering',
    rollNumber: 'TKS18CS045',
    cgpa: '8.7',
    currentCity: 'Bangalore',
    currentState: 'Karnataka',
    currentCountry: 'India',
    currentCompany: 'Infosys',
    currentRole: 'Senior Software Engineer',
    industry: 'Information Technology',
    experience: '6 years',
    skills: 'Java, Spring Boot, Microservices, AWS, Docker, Kubernetes',
    linkedinUrl: 'https://www.linkedin.com/in/arjun-sharma-demo',
    bio: 'Passionate software engineer with expertise in building scalable cloud-native applications. Love mentoring juniors and contributing to open source.'
  },
  {
    // Profile 2 - Data Scientist in Mumbai
    firstName: 'Priya',
    lastName: 'Patel',
    email: 'priya.patel@demo.com',
    phone: '+91-9876543211',
    gender: 'female',
    graduationYear: 2019,
    batch: '2019',
    course: 'B.Tech',
    branch: 'Electronics and Communication',
    rollNumber: 'TKS19EC023',
    cgpa: '9.1',
    currentCity: 'Mumbai',
    currentState: 'Maharashtra',
    currentCountry: 'India',
    currentCompany: 'Tata Consultancy Services',
    currentRole: 'Data Scientist',
    industry: 'Analytics & Data Science',
    experience: '5 years',
    skills: 'Python, Machine Learning, TensorFlow, SQL, Power BI, Tableau',
    linkedinUrl: 'https://www.linkedin.com/in/priya-patel-demo',
    higherEducation: 'M.S. in Data Science',
    university: 'Indian Institute of Technology, Bombay',
    higherEducationCountry: 'India',
    bio: 'Data enthusiast transforming raw data into actionable insights. Specialized in predictive analytics and AI-driven solutions.'
  },
  {
    // Profile 3 - Product Manager in Pune
    firstName: 'Rahul',
    lastName: 'Verma',
    email: 'rahul.verma@demo.com',
    phone: '+91-9876543212',
    gender: 'male',
    graduationYear: 2017,
    batch: '2017',
    course: 'B.Tech',
    branch: 'Mechanical Engineering',
    rollNumber: 'TKS17ME031',
    cgpa: '8.5',
    currentCity: 'Pune',
    currentState: 'Maharashtra',
    currentCountry: 'India',
    currentCompany: 'Wipro',
    currentRole: 'Senior Product Manager',
    industry: 'Product Management',
    experience: '7 years',
    skills: 'Product Strategy, Agile, JIRA, User Research, Roadmapping, Stakeholder Management',
    linkedinUrl: 'https://www.linkedin.com/in/rahul-verma-demo',
    githubUrl: 'https://github.com/rahulverma-demo',
    bio: 'Product leader with a passion for building user-centric solutions. Experienced in leading cross-functional teams and driving product vision.'
  },
  {
    // Profile 4 - MBA Graduate in Delhi
    firstName: 'Sneha',
    lastName: 'Reddy',
    email: 'sneha.reddy@demo.com',
    phone: '+91-9876543213',
    gender: 'female',
    graduationYear: 2020,
    batch: '2020',
    course: 'B.Tech',
    branch: 'Civil Engineering',
    rollNumber: 'TKS20CV018',
    cgpa: '8.9',
    currentCity: 'Delhi',
    currentState: 'Delhi',
    currentCountry: 'India',
    currentCompany: 'Deloitte',
    currentRole: 'Business Analyst',
    industry: 'Consulting',
    experience: '4 years',
    skills: 'Business Analysis, Excel, SQL, Financial Modeling, Strategic Planning',
    linkedinUrl: 'https://www.linkedin.com/in/sneha-reddy-demo',
    higherEducation: 'MBA',
    university: 'Indian Institute of Management, Ahmedabad',
    higherEducationCountry: 'India',
    bio: 'Strategic thinker with strong analytical skills. Helping organizations optimize their operations and achieve business goals.'
  },
  {
    // Profile 5 - Startup Founder in Hyderabad
    firstName: 'Vikram',
    lastName: 'Singh',
    email: 'vikram.singh@demo.com',
    phone: '+91-9876543214',
    gender: 'male',
    graduationYear: 2016,
    batch: '2016',
    course: 'B.Tech',
    branch: 'Electrical Engineering',
    rollNumber: 'TKS16EE027',
    cgpa: '8.3',
    currentCity: 'Hyderabad',
    currentState: 'Telangana',
    currentCountry: 'India',
    currentCompany: 'TechVentures (Own Startup)',
    currentRole: 'Founder & CEO',
    industry: 'Entrepreneurship',
    experience: '8 years',
    skills: 'Entrepreneurship, Business Development, IoT, Product Development, Team Leadership',
    linkedinUrl: 'https://www.linkedin.com/in/vikram-singh-demo',
    personalWebsite: 'https://techventures-demo.com',
    bio: 'Serial entrepreneur building innovative IoT solutions. Raised seed funding and leading a team of 15+ engineers to revolutionize smart home technology.'
  }
];

async function createTestProfiles() {
  console.log('🚀 Creating 5 test profiles with realistic data...\n');

  for (let i = 0; i < testProfiles.length; i++) {
    const profile = testProfiles[i];
    console.log(`\n📝 Creating Profile ${i + 1}: ${profile.firstName} ${profile.lastName}`);
    
    try {
      // Generate password
      const password = 'Demo@123';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', profile.email)
        .single();

      let userId;

      if (existingUser) {
        console.log(`   ⚠️  User already exists, updating...`);
        userId = existingUser.id;
        
        // Update password
        await supabase
          .from('users')
          .update({ password: hashedPassword })
          .eq('id', userId);
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            username: profile.email.split('@')[0],
            email: profile.email,
            password: hashedPassword,
            is_admin: false,
            user_role: 'alumni'
          })
          .select()
          .single();

        if (userError) {
          console.error(`   ❌ Failed to create user:`, userError.message);
          continue;
        }

        userId = newUser.id;
        console.log(`   ✅ User created successfully`);
      }

      // Create or update alumni profile
      const { data: existingAlumni } = await supabase
        .from('alumni')
        .select('id')
        .eq('user_id', userId)
        .single();

      const alumniData = {
        user_id: userId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        gender: profile.gender,
        graduation_year: profile.graduationYear,
        batch: profile.batch,
        course: profile.course,
        branch: profile.branch,
        roll_number: profile.rollNumber,
        cgpa: profile.cgpa,
        current_city: profile.currentCity,
        current_state: profile.currentState,
        current_country: profile.currentCountry,
        current_company: profile.currentCompany,
        current_role: profile.currentRole,
        industry: profile.industry,
        experience: profile.experience,
        skills: profile.skills,
        linkedin_url: profile.linkedinUrl,
        github_url: profile.githubUrl || null,
        personal_website: profile.personalWebsite || null,
        higher_education: profile.higherEducation || null,
        university: profile.university || null,
        higher_education_country: profile.higherEducationCountry || null,
        bio: profile.bio,
        is_profile_public: true,
        is_verified: true,
        is_active: true
      };

      if (existingAlumni) {
        const { error: updateError } = await supabase
          .from('alumni')
          .update(alumniData)
          .eq('id', existingAlumni.id);

        if (updateError) {
          console.error(`   ❌ Failed to update alumni profile:`, updateError.message);
        } else {
          console.log(`   ✅ Alumni profile updated successfully`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('alumni')
          .insert(alumniData);

        if (insertError) {
          console.error(`   ❌ Failed to create alumni profile:`, insertError.message);
        } else {
          console.log(`   ✅ Alumni profile created successfully`);
        }
      }

      console.log(`   📧 Email: ${profile.email}`);
      console.log(`   🔑 Password: Demo@123`);

    } catch (error) {
      console.error(`   ❌ Error processing profile:`, error);
    }
  }

  console.log('\n\n🎉 Test profiles creation complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 LOGIN CREDENTIALS FOR ALL TEST PROFILES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  testProfiles.forEach((profile, index) => {
    console.log(`\n${index + 1}. ${profile.firstName} ${profile.lastName} (${profile.currentRole})`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Password: Demo@123`);
    console.log(`   Location: ${profile.currentCity}, ${profile.currentState}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

createTestProfiles();
