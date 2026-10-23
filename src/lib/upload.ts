import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File, folder = "imoveis"): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "_")}`;
  const up = await supabase.storage.from("imoveis").upload(path, file);
  if (up.error) throw up.error;
  const s = await supabase.storage.from("imoveis").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (s.error) throw s.error;
  return s.data.signedUrl;
}
