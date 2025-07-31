-- Add meta_prompt column to ai_configurations table if it doesn't exist
-- This handles cases where the database wasn't updated with the latest schema

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_configurations' 
        AND column_name = 'meta_prompt'
    ) THEN
        ALTER TABLE public.ai_configurations 
        ADD COLUMN meta_prompt TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.ai_configurations.meta_prompt IS 'Template prompt for meta-analysis of multiple goal analyses. Use {analysis_data} variable for data substitution.';
        
        RAISE NOTICE 'Added meta_prompt column to ai_configurations table';
    ELSE
        RAISE NOTICE 'meta_prompt column already exists in ai_configurations table';
    END IF;
END $$;