-- 023_storage_avatars.sql
-- Crea el bucket público "avatars" para fotos de perfil de usuarios.
-- La ruta de cada avatar es {user_id}/avatar.{ext}.
-- El bucket es público porque se usa getPublicUrl() para servir las imágenes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Cualquier usuario autenticado puede subir su propio avatar
-- (ruta debe empezar con su user_id)
CREATE POLICY "usuarios pueden subir su avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "usuarios pueden actualizar su avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "usuarios pueden borrar su avatar" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lectura pública (bucket público, no requiere autenticación)
CREATE POLICY "avatars son públicos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
