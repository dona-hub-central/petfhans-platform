-- Tabla de hilos de conversación owner ↔ clínica
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  pet_id          UUID REFERENCES pets(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_owner ON conversations(owner_id);
CREATE INDEX idx_conversations_clinic ON conversations(clinic_id);
CREATE INDEX idx_conversations_pet ON conversations(pet_id) WHERE pet_id IS NOT NULL;
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Tabla de mensajes
CREATE TABLE conversation_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role       TEXT NOT NULL
                      CHECK (sender_role IN ('pet_owner', 'veterinarian', 'vet_admin')),
  body              TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  attachment_path   TEXT,
  read_by_recipient BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON conversation_messages(conversation_id, read_by_recipient)
  WHERE read_by_recipient = false;

-- Trigger para actualizar last_message_at en el hilo
CREATE OR REPLACE FUNCTION bump_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bump_last_message
AFTER INSERT ON conversation_messages
FOR EACH ROW EXECUTE FUNCTION bump_conversation_last_message();

-- RLS conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_sees_own_conversations" ON conversations
  FOR SELECT
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "clinic_staff_sees_clinic_conversations" ON conversations
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role IN ('vet_admin', 'veterinarian')
    )
  );

CREATE POLICY "owner_creates_conversation" ON conversations
  FOR INSERT
  WITH CHECK (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND clinic_id IN (
      SELECT clinic_id FROM profile_clinics WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clinic_staff_updates_conversation" ON conversations
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profile_clinics
      WHERE user_id = auth.uid()
      AND role = 'vet_admin'
    )
  );

-- RLS conversation_messages
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "see_messages_of_visible_conversations" ON conversation_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR clinic_id IN (
        SELECT clinic_id FROM profile_clinics WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "send_message_in_visible_conversation" ON conversation_messages
  FOR INSERT
  WITH CHECK (
    sender_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE status = 'open'
      AND (
        owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR clinic_id IN (
          SELECT clinic_id FROM profile_clinics WHERE user_id = auth.uid()
        )
      )
    )
  );
