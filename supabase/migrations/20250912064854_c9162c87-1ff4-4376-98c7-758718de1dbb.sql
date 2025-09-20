-- Fix the remaining security definer view issue
-- Check for any remaining security definer views
SELECT schemaname, viewname, viewowner FROM pg_views 
WHERE definition ILIKE '%security definer%';

-- If any found, we'll need to recreate them without SECURITY DEFINER