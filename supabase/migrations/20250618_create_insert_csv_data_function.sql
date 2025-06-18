-- Create a stored procedure that can bypass RLS policies
CREATE OR REPLACE FUNCTION api.insert_csv_data(
  p_name TEXT,
  p_client_id TEXT,
  p_data JSONB,
  p_file_id TEXT,
  p_form_secret TEXT
) RETURNS BOOLEAN
SECURITY DEFINER -- This makes the function run with the privileges of the creator
SET search_path = api, public -- Restricts search path for security
LANGUAGE plpgsql AS $$
BEGIN
  -- Insert the data directly, bypassing RLS
  INSERT INTO api.csv_uploads (name, client_id, data, file_id, form_secret)
  VALUES (p_name, p_client_id, p_data, p_file_id, p_form_secret);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting CSV data: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION api.insert_csv_data TO service_role;
