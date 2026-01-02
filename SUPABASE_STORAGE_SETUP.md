
# Supabase Storage Setup for Post Attachments

## Steps to Configure

### 1. Run the SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `CREATE_STORAGE_BUCKETS.sql`
4. Click **Run** to execute the migration

This will create:
- `post-attachments` bucket (for images, videos, documents)
- `profile-pictures` bucket (for user avatars)
- Appropriate RLS (Row Level Security) policies

### 2. Verify Buckets

1. Navigate to **Storage** in your Supabase dashboard
2. You should see two new buckets:
   - `post-attachments` (public, 10MB limit)
   - `profile-pictures` (public, 5MB limit)

### 3. Test Upload

After running the migration, test the upload functionality:

1. Log in to your application
2. Try creating a post with an image/document attachment
3. The file should upload to Supabase Storage
4. The post should display the file correctly

## File Structure

### Post Attachments
```
post-attachments/
├── images/{userId}/{timestamp}_{filename}
├── videos/{userId}/{timestamp}_{filename}
└── documents/{userId}/{timestamp}_{filename}
```

### Profile Pictures
```
profile-pictures/
└── {userId}/avatar_{timestamp}.{ext}
```

## Public URLs

Files are accessible via public URLs like:
```
https://{project-ref}.supabase.co/storage/v1/object/public/post-attachments/images/{userId}/{filename}
```

## Security

- All uploads require authentication
- Users can only update/delete their own files
- Anyone can view public files (needed for feed display)
- File size limits enforced at bucket level
- MIME type restrictions prevent unwanted file types

## Cleanup

If you want to remove the old Object Storage implementation:
1. The `/storage/*` route has been removed from `server/routes.ts`
2. You can remove `@replit/object-storage` from dependencies if not used elsewhere
3. Remove the `objectStorage` client initialization from `server/routes.ts`
