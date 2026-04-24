-- Add summary field to subtopics for Intelligence Hub snapshots
ALTER TABLE subtopics ADD COLUMN IF NOT EXISTS summary TEXT;

-- Update existing subtopics with a fallback placeholder if needed
UPDATE subtopics SET summary = 'Click "Generate Foundations" to build the intelligence report for this concept.' WHERE summary IS NULL;
