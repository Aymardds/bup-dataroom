-- ==============================================================================
-- Schema Supabase : Salle des Coffres / Data Room VDR
-- Projet : jzhrlhifidptxfnvvgdp
-- ==============================================================================

-- 0. Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table Profiles & synchronisation des utilisateurs Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles readable by signed-in" ON public.profiles;
CREATE POLICY "profiles readable by signed-in" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Table Data Rooms
CREATE TABLE IF NOT EXISTS public.data_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  purpose text NOT NULL DEFAULT 'levee_de_fonds',
  description text,
  status text NOT NULL DEFAULT 'active',
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_rooms TO authenticated;
GRANT ALL ON public.data_rooms TO service_role;

-- 3. Table Membres (Parties prenantes invitées)
CREATE TABLE IF NOT EXISTS public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  email text NOT NULL,
  organization text,
  party_type text NOT NULL DEFAULT 'investisseur',
  role text NOT NULL DEFAULT 'viewer',
  can_download boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;

-- 4. Table Dossiers
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;

-- 5. Table Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text,
  view_count int NOT NULL DEFAULT 0,
  uploaded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

-- 6. Table Journaux d'activité (Audit logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid(),
  actor_name text,
  action text NOT NULL,
  target text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- 7. Fonctions d'autorisation et d'audit
CREATE OR REPLACE FUNCTION public.room_role(_room uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM data_rooms WHERE id = _room AND owner_id = auth.uid()) THEN 'owner'
    ELSE (SELECT role FROM room_members WHERE room_id = _room AND lower(email) = lower(auth.jwt()->>'email') LIMIT 1)
  END
$$;

CREATE OR REPLACE FUNCTION public.can_download(_room uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.room_role(_room) IN ('owner','admin','editor')
    OR COALESCE((SELECT can_download FROM room_members WHERE room_id = _room AND lower(email) = lower(auth.jwt()->>'email') LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.record_view(_doc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid;
BEGIN
  SELECT room_id INTO r FROM documents WHERE id = _doc;
  IF r IS NULL OR public.room_role(r) IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE documents SET view_count = view_count + 1 WHERE id = _doc;
  UPDATE room_members SET status = 'active' WHERE room_id = r AND lower(email) = lower(auth.jwt()->>'email') AND status = 'invited';
END $$;

-- 8. Politiques Row Level Security (RLS)

-- RLS: data_rooms
ALTER TABLE public.data_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms select" ON public.data_rooms;
CREATE POLICY "rooms select" ON public.data_rooms FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.room_role(id) IS NOT NULL);

DROP POLICY IF EXISTS "rooms insert" ON public.data_rooms;
CREATE POLICY "rooms insert" ON public.data_rooms FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "rooms update" ON public.data_rooms;
CREATE POLICY "rooms update" ON public.data_rooms FOR UPDATE TO authenticated
  USING (public.room_role(id) IN ('owner','admin'));

DROP POLICY IF EXISTS "rooms delete" ON public.data_rooms;
CREATE POLICY "rooms delete" ON public.data_rooms FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- RLS: room_members
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members select" ON public.room_members;
CREATE POLICY "members select" ON public.room_members FOR SELECT TO authenticated
  USING (public.room_role(room_id) IS NOT NULL);

DROP POLICY IF EXISTS "members insert" ON public.room_members;
CREATE POLICY "members insert" ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (public.room_role(room_id) IN ('owner','admin'));

DROP POLICY IF EXISTS "members update" ON public.room_members;
CREATE POLICY "members update" ON public.room_members FOR UPDATE TO authenticated
  USING (public.room_role(room_id) IN ('owner','admin'));

DROP POLICY IF EXISTS "members delete" ON public.room_members;
CREATE POLICY "members delete" ON public.room_members FOR DELETE TO authenticated
  USING (public.room_role(room_id) IN ('owner','admin'));

-- RLS: folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "folders select" ON public.folders;
CREATE POLICY "folders select" ON public.folders FOR SELECT TO authenticated
  USING (public.room_role(room_id) IS NOT NULL);

DROP POLICY IF EXISTS "folders insert" ON public.folders;
CREATE POLICY "folders insert" ON public.folders FOR INSERT TO authenticated
  WITH CHECK (public.room_role(room_id) IN ('owner','admin','editor'));

DROP POLICY IF EXISTS "folders update" ON public.folders;
CREATE POLICY "folders update" ON public.folders FOR UPDATE TO authenticated
  USING (public.room_role(room_id) IN ('owner','admin','editor'));

DROP POLICY IF EXISTS "folders delete" ON public.folders;
CREATE POLICY "folders delete" ON public.folders FOR DELETE TO authenticated
  USING (public.room_role(room_id) IN ('owner','admin'));

-- RLS: documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "docs select" ON public.documents;
CREATE POLICY "docs select" ON public.documents FOR SELECT TO authenticated
  USING (public.room_role(room_id) IS NOT NULL);

DROP POLICY IF EXISTS "docs insert" ON public.documents;
CREATE POLICY "docs insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.room_role(room_id) IN ('owner','admin','editor'));

DROP POLICY IF EXISTS "docs update" ON public.documents;
CREATE POLICY "docs update" ON public.documents FOR UPDATE TO authenticated
  USING (public.room_role(room_id) IN ('owner','admin','editor'));

DROP POLICY IF EXISTS "docs delete" ON public.documents;
CREATE POLICY "docs delete" ON public.documents FOR DELETE TO authenticated
  USING (public.room_role(room_id) IN ('owner','admin'));

-- RLS: activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs select" ON public.activity_logs;
CREATE POLICY "logs select" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.room_role(room_id) IN ('owner','admin'));

DROP POLICY IF EXISTS "logs insert" ON public.activity_logs;
CREATE POLICY "logs insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.room_role(room_id) IS NOT NULL);

-- Helper pour caster un UUID sans lever d'exception en cas de dossier non-UUID
CREATE OR REPLACE FUNCTION public.safe_cast_uuid(_val text) RETURNS uuid
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE AS $$
BEGIN
  RETURN _val::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- 9. Storage Bucket pour les documents de la data room
INSERT INTO storage.buckets (id, name, public)
VALUES ('dataroom', 'dataroom', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "dataroom read" ON storage.objects;
CREATE POLICY "dataroom read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dataroom' AND public.room_role(public.safe_cast_uuid((storage.foldername(name))[1])) IS NOT NULL);

DROP POLICY IF EXISTS "dataroom write" ON storage.objects;
CREATE POLICY "dataroom write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dataroom' AND public.room_role(public.safe_cast_uuid((storage.foldername(name))[1])) IN ('owner','admin','editor'));

DROP POLICY IF EXISTS "dataroom delete" ON storage.objects;
CREATE POLICY "dataroom delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dataroom' AND public.room_role(public.safe_cast_uuid((storage.foldername(name))[1])) IN ('owner','admin'));

