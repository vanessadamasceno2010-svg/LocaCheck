import { supabase } from "../supabaseClient";

const RESERVED_SITE_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "login",
  "logout",
  "signup",
  "cadastro",
  "conta",
  "perfil",
  "site",
  "sites",
  "suporte",
  "support",
  "www",
  "assets",
  "static",
  "public",
  "dashboard",
  "painel",
  "consulta",
  "consultas",
  "credito",
  "creditos",
  "pagamento",
  "pagamentos",
]);

export function normalizeRentalSiteSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export function validateRentalSiteSlug(value) {
  const slug = normalizeRentalSiteSlug(value);

  if (!slug || slug.length < 2) {
    return {
      valid: false,
      slug,
      message: "Use pelo menos 2 caracteres no endereço do site.",
    };
  }

  if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug)) {
    return {
      valid: false,
      slug,
      message: "Use somente letras, números e hífen no endereço do site.",
    };
  }

  if (RESERVED_SITE_SLUGS.has(slug)) {
    return {
      valid: false,
      slug,
      message: "Este endereço é reservado pelo LocaCheck. Escolha outro.",
    };
  }

  return { valid: true, slug, message: "" };
}

export function getRentalSitePublicPath(slug) {
  const normalizedSlug = normalizeRentalSiteSlug(slug);
  return normalizedSlug ? `/site/${normalizedSlug}` : "/site";
}

export function getRentalSiteSlugFromPath(pathname) {
  const match = String(pathname || "").match(/^\/site\/([^/?#]+)\/?$/i);
  return match ? normalizeRentalSiteSlug(decodeURIComponent(match[1])) : "";
}

export function getRentalSitePublicUrl(slug) {
  const path = getRentalSitePublicPath(slug);

  // Durante a fase sem domínio próprio, nunca usamos a URL de preview/deployment
  // da Vercel para o link compartilhável. Isso garante um endereço estável.
  // Quando tivermos domínio próprio, basta definir VITE_PUBLIC_SITE_BASE_URL.
  const configuredBase = String(import.meta.env.VITE_PUBLIC_SITE_BASE_URL || "").trim().replace(/\/$/, "");
  const baseUrl = configuredBase || "https://loca-check.vercel.app";

  return `${baseUrl}${path}`;
}

export async function getMyRentalSiteBenefit() {
  const { data, error } = await supabase.rpc("get_my_rental_site_benefit_v62");

  if (error) {
    throw new Error(error.message || "Não foi possível consultar o benefício Meu Site.");
  }

  return data;
}

export async function getMyRentalSite(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("rental_sites")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Não foi possível carregar o site da locadora.");
  }

  return data || null;
}

export async function isRentalSiteSlugAvailable(value, currentSiteId = null) {
  const validation = validateRentalSiteSlug(value);

  if (!validation.valid) {
    return { ...validation, available: false };
  }

  const { data, error } = await supabase.rpc("rental_site_slug_available_v62", {
    p_slug: validation.slug,
    p_current_site_id: currentSiteId || null,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível verificar o endereço do site.");
  }

  const available = data === true;

  return {
    ...validation,
    available,
    message: available ? "" : "Este endereço já está em uso.",
  };
}

export async function createMyRentalSite({ userId, brandName, slug, tagline, whatsapp, email }) {
  const slugValidation = validateRentalSiteSlug(slug);
  if (!slugValidation.valid) {
    throw new Error(slugValidation.message);
  }

  const normalizedBrandName = String(brandName || "").trim();
  if (normalizedBrandName.length < 2) {
    throw new Error("Informe o nome da locadora.");
  }

  const availability = await isRentalSiteSlugAvailable(slugValidation.slug);
  if (!availability.available) {
    throw new Error(availability.message || "Este endereço já está em uso.");
  }

  const payload = {
    owner_id: userId,
    slug: slugValidation.slug,
    brand_name: normalizedBrandName,
    tagline: String(tagline || "").trim() || null,
    whatsapp: String(whatsapp || "").trim() || null,
    email: String(email || "").trim() || null,
    hero_title: `Alugue sua moto com a ${normalizedBrandName}`,
    hero_subtitle: "Escolha sua moto, consulte os valores e fale diretamente com nossa equipe.",
    about_title: `Sobre a ${normalizedBrandName}`,
    cta_text: "Falar no WhatsApp",
    published: false,
  };

  const { data, error } = await supabase
    .from("rental_sites")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Este endereço já está em uso ou sua conta já possui um site.");
    }
    throw new Error(error.message || "Não foi possível criar seu site.");
  }

  return data;
}

export async function updateMyRentalSite(siteId, updates) {
  if (!siteId) throw new Error("Site não informado.");

  const safeUpdates = {};
  const allowedFields = [
    "slug",
    "brand_name",
    "tagline",
    "whatsapp",
    "phone",
    "email",
    "instagram",
    "address",
    "opening_hours",
    "hero_title",
    "hero_subtitle",
    "about_title",
    "about_text",
    "primary_color",
    "secondary_color",
    "cta_text",
    "published",
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates || {}, field)) {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(safeUpdates, "slug")) {
    const slugValidation = validateRentalSiteSlug(safeUpdates.slug);
    if (!slugValidation.valid) throw new Error(slugValidation.message);

    const availability = await isRentalSiteSlugAvailable(slugValidation.slug, siteId);
    if (!availability.available) throw new Error(availability.message || "Este endereço já está em uso.");
    safeUpdates.slug = slugValidation.slug;
  }

  if (Object.prototype.hasOwnProperty.call(safeUpdates, "brand_name")) {
    safeUpdates.brand_name = String(safeUpdates.brand_name || "").trim();
    if (safeUpdates.brand_name.length < 2) throw new Error("Informe o nome da locadora.");
  }

  const { data, error } = await supabase
    .from("rental_sites")
    .update(safeUpdates)
    .eq("id", siteId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Este endereço já está em uso.");
    throw new Error(error.message || "Não foi possível salvar as alterações do site.");
  }

  return data;
}

export async function setMyRentalSitePublished(siteId, published) {
  return updateMyRentalSite(siteId, { published: Boolean(published) });
}


export async function uploadRentalSiteAsset(siteId, file, kind = "asset") {
  if (!siteId || !file) throw new Error("Arquivo ou site não informado.");

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG, WEBP, AVIF ou SVG.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeKind = String(kind || "asset").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const path = `${siteId}/${safeKind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("rental-sites")
    .upload(path, file, { upsert: false, contentType: file.type, cacheControl: "31536000" });

  if (uploadError) {
    throw new Error(uploadError.message || "Não foi possível enviar a imagem.");
  }

  const { data } = supabase.storage.from("rental-sites").getPublicUrl(path);
  return data?.publicUrl || "";
}

export async function listMyRentalSiteMotorcycles(siteId) {
  if (!siteId) return [];
  const { data, error } = await supabase
    .from("rental_site_motorcycles")
    .select("*")
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message || "Não foi possível carregar a frota.");
  return data || [];
}

export async function createRentalSiteMotorcycle(siteId, values) {
  if (!siteId) throw new Error("Site não informado.");
  const payload = {
    site_id: siteId,
    name: String(values?.name || "").trim(),
    category: String(values?.category || "").trim() || null,
    description: String(values?.description || "").trim() || null,
    image_url: String(values?.image_url || "").trim() || null,
    price_day: Number(values?.price_day || 0),
    price_week: Number(values?.price_week || 0),
    price_month: Number(values?.price_month || 0),
    available: values?.available !== false,
    published: values?.published === true,
    sort_order: Number(values?.sort_order || 0),
  };
  if (payload.name.length < 2) throw new Error("Informe o modelo da moto.");
  const { data, error } = await supabase.from("rental_site_motorcycles").insert(payload).select("*").single();
  if (error) throw new Error(error.message || "Não foi possível adicionar a moto.");
  return data;
}

export async function updateRentalSiteMotorcycle(id, values) {
  if (!id) throw new Error("Moto não informada.");
  const allowed = ["name", "category", "description", "image_url", "price_day", "price_week", "price_month", "available", "published", "sort_order"];
  const payload = {};
  for (const field of allowed) if (Object.prototype.hasOwnProperty.call(values || {}, field)) payload[field] = values[field];
  if (payload.name !== undefined) {
    payload.name = String(payload.name || "").trim();
    if (payload.name.length < 2) throw new Error("Informe o modelo da moto.");
  }
  const { data, error } = await supabase.from("rental_site_motorcycles").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message || "Não foi possível atualizar a moto.");
  return data;
}

export async function deleteRentalSiteMotorcycle(id) {
  if (!id) throw new Error("Moto não informada.");
  const { error } = await supabase.from("rental_site_motorcycles").delete().eq("id", id);
  if (error) throw new Error(error.message || "Não foi possível excluir a moto.");
  return true;
}

export async function getPublicRentalSite(slug) {
  const normalizedSlug = normalizeRentalSiteSlug(slug);
  if (!normalizedSlug) return null;

  const { data, error } = await supabase
    .from("rental_sites")
    .select(`
      id, slug, brand_name, tagline, logo_url, hero_image_url, hero_title, hero_subtitle,
      about_title, about_text, whatsapp, phone, email, instagram, address, opening_hours,
      primary_color, secondary_color, cta_text, published
    `)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Não foi possível carregar este site.");
  }

  if (!data?.id) return null;

  // Um proprietário autenticado consegue ler o próprio rascunho por RLS.
  // Esta segunda checagem garante que a rota pública nunca exiba rascunhos,
  // sites expirados ou suspensos, mesmo no navegador do proprietário.
  const { data: isPublic, error: visibilityError } = await supabase.rpc(
    "rental_site_is_public_v62",
    { p_site_id: data.id }
  );

  if (visibilityError || isPublic !== true) return null;

  const { data: motorcycles, error: motorcyclesError } = await supabase
    .from("rental_site_motorcycles")
    .select("id, name, category, description, image_url, price_day, price_week, price_month, available, published, sort_order")
    .eq("site_id", data.id)
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (motorcyclesError) throw new Error(motorcyclesError.message || "Não foi possível carregar a frota pública.");

  return { ...data, motorcycles: motorcycles || [] };
}
