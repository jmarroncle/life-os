-- Life OS: bucket de Storage para imágenes subidas desde el editor de
-- bloques (Data Center y Libreta comparten el mismo bucket). Correr una
-- sola vez en Supabase → SQL Editor → New query.

insert into storage.buckets (id, name, public)
values ('life-os-uploads', 'life-os-uploads', true)
on conflict (id) do nothing;

-- Cada usuario solo puede subir/borrar dentro de su propia carpeta
-- ("<user_id>/archivo.ext"), igual que el filtro manual por user_id que
-- usan las server actions sobre las tablas de life_os. La subida en
-- src/lib/uploads.ts ya guarda los archivos con ese prefijo.
create policy "life_os_uploads_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'life-os-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "life_os_uploads_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'life-os-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- El bucket es público (public = true): la lectura de archivos ya
-- funciona vía URL pública sin necesitar una policy de SELECT — es lo que
-- permite renderizar <img src="..."> directamente en el editor.
