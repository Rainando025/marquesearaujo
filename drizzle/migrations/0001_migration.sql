create policy "admin manage imoveis files" on storage.objects for all to authenticated
using (bucket_id='imoveis' and public.has_role(auth.uid(),'admin'))
with check (bucket_id='imoveis' and public.has_role(auth.uid(),'admin'));