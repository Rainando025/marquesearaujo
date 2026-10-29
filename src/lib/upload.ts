import { supabase } from "@/integrations/supabase/client";

/**
 * Redimensiona e comprime imagens no navegador antes do upload.
 * Reduz arquivos pesados (ex.: 5MB-15MB) para ~150KB-350KB sem perda visível de qualidade.
 * Evita topar os limites de armazenamento (Storage) e tráfego de saída do Supabase.
 */
async function compressImage(file: File, maxDim = 1920, quality = 0.82): Promise<Blob | File> {
  // SVGs e GIFs animados devem ser preservados sem alteração
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  // Se não estiver no browser ou não suportar Image, retorna o arquivo original
  if (typeof window === "undefined" || !("Image" in window)) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Prefere WebP se disponível, com fallback para JPEG
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File, folder = "imoveis"): Promise<string> {
  const maxDim = folder === "logo" || folder === "perfil" ? 1000 : 1920;
  const compressed = await compressImage(file, maxDim, 0.85);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const finalExt = compressed instanceof Blob && compressed.type === "image/webp" ? "webp" : ext;
  const safeName = file.name.replace(/\.[^/.]+$/, "").replace(/[^\w-]/g, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}.${finalExt}`;

  const up = await supabase.storage.from("imoveis").upload(path, compressed, {
    contentType: compressed instanceof Blob ? compressed.type : file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (up.error) throw up.error;

  const s = await supabase.storage.from("imoveis").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (s.error) throw s.error;

  return s.data.signedUrl;
}
