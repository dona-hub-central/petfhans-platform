-- =============================================
-- PET FILES — archivos adjuntos por mascota
-- =============================================

CREATE TABLE IF NOT EXISTS pet_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_type TEXT NOT NULL DEFAULT 'other'
    CHECK (file_type IN ('prescription','exam','photo','video','other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pet_files ENABLE ROW LEVEL SECURITY;

-- Vets ven y gestionan archivos de su clínica
CREATE POLICY "Vet gestiona archivos de su clinica" ON pet_files
  FOR ALL USING (clinic_id = get_user_clinic_id() OR get_user_role() = 'superadmin');

-- Owners ven archivos de sus mascotas
CREATE POLICY "Owner ve archivos de sus mascotas" ON pet_files
  FOR SELECT USING (
    pet_id IN (
      SELECT id FROM pets WHERE owner_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Owners pueden subir archivos de sus mascotas
CREATE POLICY "Owner sube archivos de sus mascotas" ON pet_files
  FOR INSERT WITH CHECK (
    pet_id IN (
      SELECT id FROM pets WHERE owner_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Storage policies para bucket pet-files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pet-files', 'pet-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload pet files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pet-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own clinic pet files" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-files' AND auth.role() = 'authenticated');

CREATE POLICY "Vet can delete pet files" ON storage.objects
  FOR DELETE USING (bucket_id = 'pet-files' AND auth.role() = 'authenticated');
