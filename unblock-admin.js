
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function unblockAdmin() {
  const adminEmail = 'kalyani@evonix.co';
  
  console.log(`Unblocking admin account: ${adminEmail}`);
  
  const { data, error } = await supabase
    .from('users')
    .update({ account_blocked: false })
    .eq('email', adminEmail)
    .select();
  
  if (error) {
    console.error('Error unblocking admin:', error);
    return;
  }
  
  console.log('Admin account unblocked successfully:', data);
}

unblockAdmin();
