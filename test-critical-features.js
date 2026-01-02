
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tests = {
  passed: 0,
  failed: 0,
  warnings: 0,
  results: []
};

function logTest(name, status, message) {
  const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const result = `${emoji} ${name}: ${message}`;
  console.log(result);
  tests.results.push(result);
  
  if (status === 'pass') tests.passed++;
  else if (status === 'fail') tests.failed++;
  else tests.warnings++;
}

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...\n');
  
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    logTest('Database Connection', 'pass', 'Successfully connected to Supabase');
  } catch (error) {
    logTest('Database Connection', 'fail', error.message);
  }
}

async function testUserAuthentication() {
  console.log('\n🔍 Testing User Authentication...\n');
  
  // Test admin user exists
  try {
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'kalyani@evonix.co')
      .single();
    
    if (adminUser && adminUser.is_admin) {
      logTest('Admin User Exists', 'pass', 'Admin user found with correct role');
    } else {
      logTest('Admin User Exists', 'fail', 'Admin user not found or role incorrect');
    }
    
    // Test password hashing
    if (adminUser) {
      const isValidHash = adminUser.password.startsWith('$2b$');
      if (isValidHash) {
        logTest('Password Hashing', 'pass', 'Passwords are properly hashed with bcrypt');
      } else {
        logTest('Password Hashing', 'fail', 'Password hash format incorrect');
      }
    }
  } catch (error) {
    logTest('Admin User Test', 'fail', error.message);
  }
  
  // Test regular user
  try {
    const { data: regularUser } = await supabase
      .from('users')
      .select('*')
      .eq('is_admin', false)
      .limit(1)
      .single();
    
    if (regularUser) {
      logTest('Regular User Exists', 'pass', 'At least one regular user found');
    } else {
      logTest('Regular User Exists', 'warn', 'No regular users found');
    }
  } catch (error) {
    logTest('Regular User Test', 'warn', 'No regular users in database');
  }
}

async function testAlumniProfiles() {
  console.log('\n🔍 Testing Alumni Profiles...\n');
  
  try {
    const { data: alumni, error } = await supabase
      .from('alumni')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    
    logTest('Alumni Profiles', 'pass', `Found ${alumni.length} alumni profiles`);
    
    // Test required fields
    const profilesWithMissingData = alumni.filter(a => 
      !a.first_name || !a.last_name || !a.email || !a.graduation_year
    );
    
    if (profilesWithMissingData.length === 0) {
      logTest('Alumni Data Validation', 'pass', 'All profiles have required fields');
    } else {
      logTest('Alumni Data Validation', 'warn', `${profilesWithMissingData.length} profiles missing required data`);
    }
  } catch (error) {
    logTest('Alumni Profiles', 'fail', error.message);
  }
}

async function testSupabaseStorage() {
  console.log('\n🔍 Testing Supabase Storage Buckets...\n');
  
  const buckets = ['profile-pictures', 'post-attachments', 'event_covers', 'event_docs'];
  
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.getBucket(bucket);
      if (error) throw error;
      logTest(`Storage Bucket: ${bucket}`, 'pass', 'Bucket exists and accessible');
    } catch (error) {
      logTest(`Storage Bucket: ${bucket}`, 'fail', error.message);
    }
  }
}

async function testNotifications() {
  console.log('\n🔍 Testing Notifications System...\n');
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    logTest('Notifications Table', 'pass', `Found ${count} notifications`);
    
    // Test notification types
    const validTypes = [
      'message', 'connection_request', 'connection_response', 
      'post_like', 'post_comment', 'event_rsvp', 'job', 'signup_approved'
    ];
    
    const { data: notifications } = await supabase
      .from('notifications')
      .select('type')
      .limit(100);
    
    const invalidTypes = notifications?.filter(n => !validTypes.includes(n.type)) || [];
    
    if (invalidTypes.length === 0) {
      logTest('Notification Types', 'pass', 'All notification types are valid');
    } else {
      logTest('Notification Types', 'warn', `Found ${invalidTypes.length} invalid notification types`);
    }
  } catch (error) {
    logTest('Notifications System', 'fail', error.message);
  }
}

async function testPosts() {
  console.log('\n🔍 Testing Posts & Feed...\n');
  
  try {
    const { data: posts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    logTest('Feed Posts', 'pass', `Found ${posts.length} posts`);
    
    // Test post approval workflow
    const pendingPosts = posts.filter(p => !p.post_approved);
    if (pendingPosts.length > 0) {
      logTest('Post Approval', 'warn', `${pendingPosts.length} posts pending approval`);
    } else {
      logTest('Post Approval', 'pass', 'No posts pending approval');
    }
  } catch (error) {
    logTest('Posts & Feed', 'fail', error.message);
  }
}

async function testEvents() {
  console.log('\n🔍 Testing Events...\n');
  
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    logTest('Events Table', 'pass', `Found ${events.length} events`);
    
    // Test event date validation
    const pastEvents = events.filter(e => new Date(e.event_date) < new Date());
    logTest('Event Dates', 'pass', `${pastEvents.length} past events, ${events.length - pastEvents.length} upcoming`);
  } catch (error) {
    logTest('Events', 'fail', error.message);
  }
}

async function testJobs() {
  console.log('\n🔍 Testing Job Portal...\n');
  
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    logTest('Jobs Table', 'pass', `Found ${jobs.length} job postings`);
  } catch (error) {
    logTest('Job Portal', 'fail', error.message);
  }
}

async function testMessages() {
  console.log('\n🔍 Testing Messaging System...\n');
  
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    logTest('Messages Table', 'pass', `Found ${messages.length} messages`);
    
    // Test unread messages
    const unreadCount = messages.filter(m => !m.is_read).length;
    logTest('Message Read Status', 'pass', `${unreadCount} unread messages`);
  } catch (error) {
    logTest('Messaging System', 'fail', error.message);
  }
}

async function runAllTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     🧪 ALUMNI PORTAL - AUTOMATED TEST SUITE 🧪      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  await testDatabaseConnection();
  await testUserAuthentication();
  await testAlumniProfiles();
  await testSupabaseStorage();
  await testNotifications();
  await testPosts();
  await testEvents();
  await testJobs();
  await testMessages();
  
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                   📊 TEST SUMMARY                    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`❌ Failed: ${tests.failed}`);
  console.log(`⚠️  Warnings: ${tests.warnings}`);
  console.log(`📋 Total Tests: ${tests.passed + tests.failed + tests.warnings}\n`);
  
  if (tests.failed > 0) {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  } else if (tests.warnings > 0) {
    console.log('⚠️  All critical tests passed but there are warnings.\n');
  } else {
    console.log('✅ All tests passed successfully!\n');
  }
}

runAllTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
