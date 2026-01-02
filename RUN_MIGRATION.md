
# Database Migration Instructions

## Steps to Run the Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration Script**
   - Copy the contents of `database_migration_roles.sql`
   - Paste it into the Supabase SQL Editor
   - Click "Run" to execute the migration

3. **Verify the Migration**
   - Check that the `user_role` column has been added to the `users` table
   - Verify that existing users have been updated with the 'alumni' role

## What This Migration Does

- Adds a `user_role` column to the `users` table
- Sets default role as 'alumni'
- Adds a check constraint to ensure valid roles: 'alumni', 'student', 'faculty', 'administrator'
- Creates an index on `user_role` for better query performance
- Updates Row Level Security (RLS) policies if enabled

## After Running the Migration

Once the migration is complete, the admin dashboard should be able to:
- Fetch and display all users
- Show user roles correctly
- Filter users by role

## Troubleshooting

If you still see errors after running the migration:
1. Check the Supabase logs for any error messages
2. Verify that the `user_role` column exists in the `users` table
3. Clear your browser cache and refresh the application
