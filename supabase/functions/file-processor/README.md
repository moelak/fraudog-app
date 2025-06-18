# File Processor Edge Function

This Edge Function processes CSV files uploaded to the Supabase storage bucket and inserts the parsed data into the `api.csv_uploads` table, which then triggers the `bright-responder` function.

## How It Works

1. When a file is uploaded to the `user-file-upload` storage bucket, this function is triggered via a storage webhook
2. The function downloads the file, parses it as CSV, and extracts the data
3. It then inserts a record into the `api.csv_uploads` table with:
   - The file name
   - Client ID (extracted from the filename or provided)
   - Parsed CSV data
   - File ID for reference
   - Form secret for RLS policy authentication

4. This insertion triggers the existing `bright-responder` function which processes the data further

## RLS Policy

This function implements the RLS policy Option B as specified in the requirements:

> Supabase waitlist Edge Function uses a shared secret (form_secret) column. Only inserts with the correct form_secret value are allowed.

The function reads the `FORM_SECRET` environment variable and includes it with every database insertion to satisfy the RLS policy:

```sql
CREATE POLICY "Allow insert with correct form secret"
ON public.waitlist
FOR INSERT
USING (
  form_secret = current_setting('request.jwt.claim.form_secret', true)
);
```

## Testing

You can test this function locally using:

1. Create a `.env` file with your Supabase credentials and form secret:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   FORM_SECRET=your_form_secret_value
   ```

2. Run the simulation script:
   ```
   supabase functions serve file-processor
   ```

3. In another terminal, send a test request:
   ```
   curl -i --location --request POST 'http://localhost:54321/functions/v1/file-processor' \
   --header 'Authorization: Bearer YOUR_ANON_KEY' \
   --header 'Content-Type: application/json' \
   --data-raw '{
     "type": "INSERT",
     "table": "objects",
     "schema": "storage",
     "record": {
       "id": "test-123",
       "bucket_id": "user-file-upload",
       "name": "test-data.csv",
       "owner": "test-owner",
       "created_at": "2025-06-18T12:30:45Z",
       "updated_at": "2025-06-18T12:30:45Z",
       "last_accessed_at": "2025-06-18T12:30:45Z",
       "metadata": {}
     },
     "old_record": null
   }'
   ```

## Deployment

The function has been deployed to your Supabase project:

```
supabase functions deploy file-processor
```

And the required environment variables have been set:

```
supabase secrets set FORM_SECRET="your_form_secret_value"
```

## Setting Up the Storage Webhook

To complete the setup, you need to create a storage webhook in the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Database → Webhooks
3. Create a new webhook with:
   - Event Type: INSERT
   - Schema: storage
   - Table: objects
   - Function URL: https://texfktwxzjxqrazemzzk.supabase.co/functions/v1/file-processor
