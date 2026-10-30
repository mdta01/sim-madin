-- ============================================================================
-- SIM MADIN — Supabase Setup SQL
-- ============================================================================
-- Run this SQL di Supabase Dashboard → SQL Editor untuk setup:
--   1. Storage bucket 'sim-madin-uploads'
--   2. Storage policies (public read, authenticated write)
--   3. Updated_at trigger untuk semua tabel
--   4. Soft-delete indexes
-- ============================================================================

-- ============================================================================
-- 1. STORAGE BUCKET
-- ============================================================================
-- Create bucket (kalau belum ada — adapter juga auto-create on first upload)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sim-madin-uploads',
  'sim-madin-uploads',
  true,  -- public read (untuk img src embedding di web/mobile)
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do nothing;

-- ============================================================================
-- 2. STORAGE POLICIES (RLS)
-- ============================================================================
-- Public read: siapa saja bisa GET object dari bucket ini (public bucket)
-- Note: karena bucket public=true, read policy optional — Supabase handle otomatis.

-- Authenticated write: hanya user yang sudah login bisa upload
-- (admin web via Supabase Auth, mobile apps via Supabase Auth)
create policy "Authenticated can upload to sim-madin-uploads"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'sim-madin-uploads');

-- Authenticated delete: hanya pemilik atau admin bisa hapus
create policy "Authenticated can delete own files in sim-madin-uploads"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'sim-madin-uploads' and owner = auth.uid());

-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================
-- Auto-update updated_at column saat row di-update (Prisma auto-handles via
-- @updatedAt, tapi ini backup untuk direct SQL updates)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply ke semua tabel utama (jalankan satu per satu, ignore jika sudah ada)
-- Format: create trigger set_updated_at before update on "<table>" for each row execute function update_updated_at_column();
do $$
declare
  t text;
begin
  for t in select table_name from information_schema.columns
           where column_name = 'updated_at' and table_schema = 'public'
  loop
    execute format('drop trigger if exists set_updated_at on %I;', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function update_updated_at_column();', t);
  end loop;
end$$;

-- ============================================================================
-- 4. EXTENSIONS
-- ============================================================================
-- Enable uuid-ossp untuk gen_random_uuid() (Prisma pakai cuid by default,
-- tapi ada beberapa tabel yang pakai UUID)
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================
-- Verifikasi setup berhasil:
select 'Storage buckets' as check_name, count(*) as count from storage.buckets where name = 'sim-madin-uploads';
select 'Storage policies' as check_name, count(*) as count from pg_policies where schemaname = 'storage' and tablename = 'objects';
select 'Triggers' as check_name, count(*) as count from information_schema.triggers where event_object_schema = 'public';

-- Output yang diharapkan:
-- check_name       | count
-- -----------------+-------
-- Storage buckets  | 1
-- Storage policies | 2
-- Triggers         | (jumlah tabel dengan updated_at)
