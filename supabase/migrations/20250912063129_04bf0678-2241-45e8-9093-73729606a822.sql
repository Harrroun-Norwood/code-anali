-- Test enrollment status transitions to ensure triggers work correctly

-- First check if we have the required functions and triggers
SELECT proname FROM pg_proc WHERE proname IN ('handle_enrollment_approval', 'handle_payment_completion');

-- Check if triggers exist
SELECT tgname FROM pg_trigger WHERE tgname IN ('enrollment_approval_trigger', 'payment_completion_trigger');

-- Test the flow with a sample enrollment record
-- (This will help verify the triggers are working)