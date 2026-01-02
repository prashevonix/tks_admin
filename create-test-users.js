
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

async function createTestUsers() {
  console.log('🚀 Starting test user creation...\n');

  try {
    // Hash passwords
    const adminHash = await bcrypt.hash('Evonix@287', 10);
    const userHash = await bcrypt.hash('Vansh@123', 10);

    // Admin User
    console.log('📝 Creating Admin User...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .upsert({
        username: 'kalyani@evonix.co',
        email: 'kalyani@evonix.co',
        password: adminHash,
        is_admin: true
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (adminError) {
      console.error('❌ Admin user error:', adminError.message);
    } else {
      console.log('✅ Admin user created/updated:', adminUser.email);
    }

    // Regular User
    console.log('\n📝 Creating Regular User...');
    const { data: regularUser, error: userError } = await supabase
      .from('users')
      .upsert({
        username: 'vanshaj@kalyani.com',
        email: 'vanshaj@kalyani.com',
        password: userHash,
        is_admin: false
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Regular user error:', userError.message);
    } else {
      console.log('✅ Regular user created/updated:', regularUser.email);

      // Create Alumni Profile
      console.log('\n📝 Creating Alumni Profile...');
      const { data: alumni, error: alumniError } = await supabase
        .from('alumni')
        .upsert({
          user_id: regularUser.id,
          first_name: 'Vanshaj',
          last_name: 'Kalyani',
          email: 'vanshaj@kalyani.com',
          graduation_year: 2020,
          batch: '2020',
          is_profile_public: true,
          is_verified: true,
          is_active: true
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (alumniError) {
        console.error('❌ Alumni profile error:', alumniError.message);
      } else {
        console.log('✅ Alumni profile created/updated');
      }
    }

    console.log('\n🎉 Test users setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n👨‍💼 Admin Login:');
    console.log('   Email: kalyani@evonix.co');
    console.log('   Password: Evonix@287');
    console.log('\n👤 User Login:');
    console.log('   Email: vanshaj@kalyani.com');
    console.log('   Password: Vansh@123');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createTestUsers();
