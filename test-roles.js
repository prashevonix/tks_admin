
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRoles() {
  console.log('🔍 Testing Role-Based Access\n');

  // Fetch all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, username, is_admin, user_role');

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    return;
  }

  console.log('📊 Current Users and Their Roles:\n');
  users.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`  Role: ${user.user_role || 'NOT SET'}`);
    console.log(`  Admin: ${user.is_admin}`);
    console.log('---');
  });

  // Update admin user to have administrator role
  const adminUser = users.find(u => u.is_admin);
  if (adminUser && adminUser.user_role !== 'administrator') {
    console.log('\n🔧 Updating admin user role to administrator...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ user_role: 'administrator' })
      .eq('id', adminUser.id);

    if (updateError) {
      console.error('❌ Failed to update:', updateError.message);
    } else {
      console.log('✅ Admin user role updated successfully');
    }
  }

  // Ensure all users have a role
  const usersWithoutRole = users.filter(u => !u.user_role);
  if (usersWithoutRole.length > 0) {
    console.log(`\n🔧 Setting default role for ${usersWithoutRole.length} users...`);
    for (const user of usersWithoutRole) {
      await supabase
        .from('users')
        .update({ user_role: 'alumni' })
        .eq('id', user.id);
    }
    console.log('✅ Default roles set');
  }

  console.log('\n✨ Role testing complete!');
  console.log('\nYou can now test login with these credentials:');
  console.log('- Admin: kalyani@evonix.co / Evonix@287 (role: administrator)');
  console.log('- User: vanshaj@kalyani.com / Vansh@123 (role: alumni)');
}

testRoles().catch(console.error);
