-- Add delivery_method column to document_requests table
ALTER TABLE document_requests 
ADD COLUMN delivery_method text NOT NULL DEFAULT 'soft_copy';

-- Add check constraint for delivery method values
ALTER TABLE document_requests 
ADD CONSTRAINT check_delivery_method 
CHECK (delivery_method IN ('soft_copy', 'hard_copy'));