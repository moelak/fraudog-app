# Supabase Setup Guide

## Prerequisites
1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings > API to find your Project URL and anon/public key

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Storage Setup

1. Go to the Storage section in your Supabase dashboard
2. Create a new bucket named `user-file-upload`
3. Set the bucket to be public if you want files to be publicly accessible
4. Update the bucket policies as needed for your security requirements

## Testing the File Upload

1. Start the development server: `npm run dev`
2. Log in to the application
3. Navigate to "File Upload" in the sidebar
4. Select a file and click "Upload File"
5. The file should be uploaded to your Supabase storage bucket
