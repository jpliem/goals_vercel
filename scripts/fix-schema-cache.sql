-- Fix Schema Cache Issues
-- Run this script in Supabase SQL Editor to refresh the schema cache

-- 1. First, verify the goals table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'goals'
  AND column_name IN ('start_date', 'target_date', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- 2. If start_date is missing, add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'goals' 
          AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.goals 
        ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added start_date column to goals table';
    ELSE
        RAISE NOTICE 'start_date column already exists';
    END IF;
END $$;

-- 3. Reload the PostgREST schema cache
-- This notifies PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Alternative: If the above doesn't work, you can also try:
-- In Supabase Dashboard, go to Settings > API > click "Reload Schema Cache"

-- 5. Verify the column now exists and is accessible
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'goals'
  AND column_name = 'start_date';