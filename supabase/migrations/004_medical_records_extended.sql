-- Ampliar medical_records con campos clínicos completos
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS visit_type TEXT DEFAULT 'consultation'
    CHECK (visit_type IN ('consultation','emergency','surgery','followup','vaccination','checkup')),
  ADD COLUMN IF NOT EXISTS physical_exam JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prognosis TEXT,
  ADD COLUMN IF NOT EXISTS vaccines JSONB DEFAULT '[]';
