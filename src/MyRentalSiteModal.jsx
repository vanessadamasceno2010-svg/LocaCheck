import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  ImagePlus,
  Instagram,
  Link2,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Share2,
  Store,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  createMyRentalSite,
  createRentalSiteMotorcycle,
  deleteRentalSiteMotorcycle,
  getMyRentalSite,
  getMyRentalSiteBenefit,
  getRentalSitePublicUrl,
  isRentalSiteSlugAvailable,
  listMyRentalSiteMotorcycles,
  normalizeRentalSiteSlug,
  setMyRentalSitePublished,
  updateMyRentalSite,
  updateRentalSiteMotorcycle,
  uploadRentalSiteAsset,
  validateRentalSiteSlug,
} from "./services/rentalSiteService";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function onlyDigits(value) { return String(value || "").replace(/\D/g, ""); }
function money(value) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const emptyMoto = { name: "", category: "", description: "", image_url: "", price_day: "", price_week: "", price_month: "", available: true, published: true, sort_order: 0 };

export default function MyRentalSiteModal({ userId, profile, onClose, onBuyCredits, showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [benefit, setBenefit] = useState(null);
  const [site, setSite] = useState(null);
  const [motorcycles, setMotorcycles] = useState([]);
  const [tab, setTab] = useState("identidade");
  const [message, setMessage] = useState("");
  const [slugStatus, setSlugStatus] = useState({ checking: false, available: null, message: "" });
  const [form, setForm] = useState({
    brand_name: profile?.nome || "",
    slug: profile?.nome ? normalizeRentalSiteSlug(profile.nome) : "",
    tagline: "",
    logo_url: "",
    hero_image_url: "",
    hero_title: "",
    hero_subtitle: "",
    about_title: "",
    about_text: "",
    whatsapp: profile?.whatsapp || "",
    phone: "",
    email: profile?.email || "",
    instagram: "",
    address: "",
    opening_hours: "",
    primary_color: "#2563eb",
    secondary_color: "#0f172a",
    cta_text: "Falar no WhatsApp",
  });
  const [motoForm, setMotoForm] = useState(emptyMoto);
  const [editingMotoId, setEditingMotoId] = useState(null);

  const publicUrl = useMemo(() => site?.slug ? getRentalSitePublicUrl(site.slug) : "", [site?.slug]);
  const active = benefit?.active === true;
  const hasSite = Boolean(site?.id);

  async function loadData() {
    if (!userId) return;
    setLoading(true); setMessage("");
    try {
      const [benefitData, siteData] = await Promise.all([getMyRentalSiteBenefit(), getMyRentalSite(userId)]);
      setBenefit(benefitData || null); setSite(siteData || null);
      if (siteData) {
        setForm({
          brand_name: siteData.brand_name || "", slug: siteData.slug || "", tagline: siteData.tagline || "",
          logo_url: siteData.logo_url || "", hero_image_url: siteData.hero_image_url || "", hero_title: siteData.hero_title || "",
          hero_subtitle: siteData.hero_subtitle || "", about_title: siteData.about_title || "", about_text: siteData.about_text || "",
          whatsapp: siteData.whatsapp || profile?.whatsapp || "", phone: siteData.phone || "", email: siteData.email || profile?.email || "",
          instagram: siteData.instagram || "", address: siteData.address || "", opening_hours: siteData.opening_hours || "",
          primary_color: siteData.primary_color || "#2563eb", secondary_color: siteData.secondary_color || "#0f172a", cta_text: siteData.cta_text || "Falar no WhatsApp",
        });
        setMotorcycles(await listMyRentalSiteMotorcycles(siteData.id));
      } else setMotorcycles([]);
    } catch (error) { setMessage(error.message || "Não foi possível carregar seu site."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  useEffect(() => {
    if (!active || loading) return undefined;
    const normalized = normalizeRentalSiteSlug(form.slug);
    const validation = validateRentalSiteSlug(normalized);
    if (!validation.valid) { setSlugStatus({ checking: false, available: false, message: validation.message }); return undefined; }
    if (site?.slug === normalized) { setSlugStatus({ checking: false, available: true, message: "Este é o endereço atual do seu site." }); return undefined; }
    setSlugStatus({ checking: true, available: null, message: "Verificando disponibilidade..." });
    const timer = window.setTimeout(async () => {
      try { const result = await isRentalSiteSlugAvailable(normalized, site?.id || null); setSlugStatus({ checking: false, available: result.available, message: result.available ? "Endereço disponível." : result.message }); }
      catch (error) { setSlugStatus({ checking: false, available: false, message: error.message || "Falha ao verificar o endereço." }); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [form.slug, site?.id, site?.slug, active, loading]);

  function updateField(field, value) { setForm(current => ({ ...current, [field]: value })); }

  async function handleCreate(event) {
    event.preventDefault(); setMessage("");
    if (!active) { setMessage("Faça uma nova compra de créditos para liberar a criação do site."); return; }
    const validation = validateRentalSiteSlug(form.slug);
    if (!validation.valid || slugStatus.checking || slugStatus.available === false) { setMessage(validation.message || slugStatus.message || "Escolha um endereço disponível."); return; }
    setSaving(true);
    try {
      const created = await createMyRentalSite({ userId, brandName: form.brand_name, slug: form.slug, tagline: form.tagline, whatsapp: form.whatsapp, email: form.email });
      setSite(created); setForm(current => ({ ...current, slug: created.slug }));
      setMessage("Site criado. Agora personalize sua identidade e cadastre sua frota.");
      showToast?.("success", "Site criado", "Você já pode personalizar e publicar.");
    } catch (error) { setMessage(error.message || "Não foi possível criar seu site."); }
    finally { setSaving(false); }
  }

  async function saveSite() {
    if (!site?.id) return;
    if (!active) { setMessage("Seu benefício expirou. Renove para editar o site."); return; }
    const validation = validateRentalSiteSlug(form.slug);
    if (!validation.valid || slugStatus.checking || slugStatus.available === false) { setMessage(validation.message || slugStatus.message); return; }
    setSaving(true); setMessage("");
    try {
      const updated = await updateMyRentalSite(site.id, { ...form, slug: validation.slug, tagline: form.tagline.trim() || null, hero_title: form.hero_title.trim() || null, hero_subtitle: form.hero_subtitle.trim() || null, about_title: form.about_title.trim() || null, about_text: form.about_text.trim() || null });
      setSite(updated); setForm(current => ({ ...current, slug: updated.slug }));
      setMessage("Alterações salvas com sucesso."); showToast?.("success", "Site atualizado", "As alterações foram salvas.");
    } catch (error) { setMessage(error.message || "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  async function handlePublishToggle() {
    if (!site?.id || !active) return;
    if (!site.published && onlyDigits(form.whatsapp).length < 10) { setMessage("Informe um WhatsApp válido antes de publicar o site."); setTab("contato"); return; }
    setPublishing(true); setMessage("");
    try {
      await saveSite();
      const updated = await setMyRentalSitePublished(site.id, !site.published);
      setSite(updated); setMessage(updated.published ? "Site publicado com sucesso." : "Site colocado em rascunho.");
      showToast?.("success", updated.published ? "Site publicado" : "Site em rascunho", updated.published ? "Seu endereço público já está disponível." : "O site deixou de ser exibido publicamente.");
    } catch (error) { setMessage(error.message || "Não foi possível alterar a publicação."); }
    finally { setPublishing(false); }
  }

  async function uploadField(field, file, kind) {
    if (!site?.id || !file || !active) return;
    setUploading(kind); setMessage("");
    try {
      const url = await uploadRentalSiteAsset(site.id, file, kind);
      updateField(field, url);
      await updateMyRentalSite(site.id, { [field]: url });
      setSite(current => ({ ...current, [field]: url }));
      showToast?.("success", "Imagem enviada", "A imagem foi salva no seu site.");
    } catch (error) { setMessage(error.message || "Não foi possível enviar a imagem."); }
    finally { setUploading(""); }
  }

  async function saveMoto(event) {
    event.preventDefault();
    if (!site?.id || !active) return;
    try {
      const payload = { ...motoForm, price_day: Number(motoForm.price_day || 0), price_week: Number(motoForm.price_week || 0), price_month: Number(motoForm.price_month || 0), sort_order: Number(motoForm.sort_order || 0) };
      const saved = editingMotoId ? await updateRentalSiteMotorcycle(editingMotoId, payload) : await createRentalSiteMotorcycle(site.id, payload);
      setMotorcycles(current => editingMotoId ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved].sort((a,b) => Number(a.sort_order)-Number(b.sort_order)));
      setMotoForm(emptyMoto); setEditingMotoId(null); setMessage("Moto salva com sucesso.");
      showToast?.("success", "Frota atualizada", "A moto foi salva.");
    } catch (error) { setMessage(error.message || "Não foi possível salvar a moto."); }
  }

  function editMoto(moto) { setEditingMotoId(moto.id); setMotoForm({ ...moto, price_day: moto.price_day || "", price_week: moto.price_week || "", price_month: moto.price_month || "" }); setTab("frota"); }

  async function removeMoto(id) {
    if (!window.confirm("Excluir esta moto da frota?")) return;
    try { await deleteRentalSiteMotorcycle(id); setMotorcycles(current => current.filter(item => item.id !== id)); showToast?.("success", "Moto excluída", "A moto foi removida."); }
    catch (error) { setMessage(error.message || "Não foi possível excluir a moto."); }
  }

  async function copyLink() { try { await navigator.clipboard.writeText(publicUrl); showToast?.("success", "Link copiado", publicUrl); } catch { setMessage(publicUrl); } }
  async function shareLink() {
    if (!publicUrl) return;
    if (navigator.share) { try { await navigator.share({ title: site?.brand_name, text: `Conheça a ${site?.brand_name}`, url: publicUrl }); return; } catch (error) { if (error?.name === "AbortError") return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(`Conheça a ${site?.brand_name}: ${publicUrl}`)}`, "_blank", "noopener,noreferrer");
  }

  const tabs = [
    ["identidade", "Identidade", Store], ["hero", "Página inicial", ImagePlus], ["sobre", "Sobre", UserRound], ["frota", "Frota", Bike], ["contato", "Contato", MessageCircle], ["aparencia", "Aparência", Palette],
  ];

  return (
    <div className="modalOverlay rentalSiteModalOverlay">
      <div className="recordModal rentalSiteEditorV67">
        <button className="closeModal" type="button" onClick={onClose} aria-label="Fechar">×</button>
        <header className="rentalEditorHeaderV67">
          <div className="rentalEditorTitleV67"><div className="rentalSiteIconV67"><Store size={24}/></div><div><span>LOCACHECK SITES</span><h2>Meu Site</h2><p>Crie uma presença profissional para sua locadora.</p></div></div>
          {hasSite && <div className="rentalEditorHeaderActionsV67"><span className={`rentalPublicationBadgeV67 ${site.published ? "published" : "draft"}`}>{site.published ? "PUBLICADO" : "RASCUNHO"}</span><button className="btn outline" onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")} disabled={!site.published}><ExternalLink size={16}/> Abrir</button><button className="btn primary" onClick={handlePublishToggle} disabled={!active || publishing}><Rocket size={16}/> {publishing ? "Publicando..." : site.published ? "Colocar em rascunho" : "Publicar site"}</button></div>}
        </header>

        {loading ? <div className="rentalSiteLoadingV63"><RefreshCw size={22} className="rentalSiteSpinV63"/> Consultando seu benefício...</div> : !active && !hasSite ? (
          <section className="rentalSiteLockedV67"><LockKeyhole size={38}/><h3>Ative o benefício Meu Site</h3><p>Uma compra elegível de créditos libera a criação do seu site por 30 dias.</p><button className="btn primary" onClick={() => { onClose?.(); onBuyCredits?.(); }}>Comprar créditos</button></section>
        ) : !hasSite ? (
          <form className="rentalCreateSiteV67" onSubmit={handleCreate}><div className="rentalBenefitCardV63 active"><CheckCircle2 size={25}/><div><span>BENEFÍCIO ATIVO</span><strong>{benefit?.days_remaining || 0} dia(s) restante(s)</strong><p>Válido até {formatDateTime(benefit?.expires_at)}.</p></div><CalendarClock size={20}/></div><div className="rentalCreateGridV67"><label>Nome da locadora *<input value={form.brand_name} onChange={e=>updateField("brand_name",e.target.value)} placeholder="Ex.: Speed Motos" required/></label><label>Endereço do site *<div className="rentalSlugFieldV63"><span className="rentalSlugPrefixV63">loca-check.vercel.app/site/</span><input value={form.slug} onChange={e=>updateField("slug",normalizeRentalSiteSlug(e.target.value))} placeholder="speedmotos" required/></div><small className={slugStatus.available ? "ok" : ""}>{slugStatus.message || "Use letras, números e hífen."}</small></label><label>Slogan<input value={form.tagline} onChange={e=>updateField("tagline",e.target.value)} placeholder="Sua liberdade começa aqui"/></label><label>WhatsApp<input value={form.whatsapp} onChange={e=>updateField("whatsapp",e.target.value)} placeholder="(88) 99999-9999"/></label></div>{message && <div className="authMessage">{message}</div>}<button className="btn primary" disabled={saving || slugStatus.checking || slugStatus.available === false}><Rocket size={18}/> {saving ? "Criando..." : "Criar meu site"}</button></form>
        ) : (
          <>
            <section className="rentalEditorStatusV67"><div><span className={`rentalPublicationBadgeV67 ${site.published ? "published" : "draft"}`}>{site.published ? "SITE ONLINE" : "SITE EM RASCUNHO"}</span><h3>{site.brand_name}</h3><p>{publicUrl}</p></div><div className="rentalEditorStatusActionsV67"><button className="btn outline" onClick={copyLink}><Copy size={16}/> Copiar</button><button className="btn outline" onClick={shareLink}><Share2 size={16}/> Compartilhar</button></div></section>
            <nav className="rentalEditorTabsV67">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</nav>
            <div className="rentalEditorBodyV67">
              {tab === "identidade" && <section className="rentalEditorSectionV67"><div className="rentalSectionIntroV67"><Store/><div><h3>Identidade da locadora</h3><p>Essas informações aparecem no topo e em vários pontos do site.</p></div></div><div className="rentalEditorGridV67"><label>Nome da locadora *<input value={form.brand_name} onChange={e=>updateField("brand_name",e.target.value)}/></label><label>Endereço do site *<div className="rentalSlugFieldV63"><span className="rentalSlugPrefixV63">loca-check.vercel.app/site/</span><input value={form.slug} onChange={e=>updateField("slug",normalizeRentalSiteSlug(e.target.value))}/></div><small>{slugStatus.message}</small></label><label className="wide">Slogan<input value={form.tagline} onChange={e=>updateField("tagline",e.target.value)} placeholder="Sua liberdade começa aqui"/></label></div><ImageField label="Logo da locadora" value={form.logo_url} onChange={file=>uploadField("logo_url",file,"logo")} uploading={uploading==="logo"} /></section>}
              {tab === "hero" && <section className="rentalEditorSectionV67"><div className="rentalSectionIntroV67"><ImagePlus/><div><h3>Página inicial</h3><p>Crie um destaque forte para apresentar sua locadora logo na primeira tela.</p></div></div><div className="rentalEditorGridV67"><label className="wide">Título principal<input value={form.hero_title} onChange={e=>updateField("hero_title",e.target.value)} placeholder={`Alugue sua moto com a ${form.brand_name}`}/></label><label className="wide">Texto de destaque<textarea value={form.hero_subtitle} onChange={e=>updateField("hero_subtitle",e.target.value)} rows={4} placeholder="Motos revisadas, atendimento rápido e condições transparentes."/></label><label>Texto do botão<input value={form.cta_text} onChange={e=>updateField("cta_text",e.target.value)}/></label></div><ImageField label="Imagem principal" value={form.hero_image_url} onChange={file=>uploadField("hero_image_url",file,"hero")} uploading={uploading==="hero"} /></section>}
              {tab === "sobre" && <section className="rentalEditorSectionV67"><div className="rentalSectionIntroV67"><UserRound/><div><h3>Sobre a locadora</h3><p>Conte a história e os diferenciais da sua empresa.</p></div></div><div className="rentalEditorGridV67"><label className="wide">Título da seção<input value={form.about_title} onChange={e=>updateField("about_title",e.target.value)} placeholder={`Sobre a ${form.brand_name}`}/></label><label className="wide">Descrição<textarea value={form.about_text} onChange={e=>updateField("about_text",e.target.value)} rows={8} placeholder="Fale sobre sua experiência, atendimento, segurança, manutenção e região de atendimento."/></label></div></section>}
              {tab === "contato" && <section className="rentalEditorSectionV67"><div className="rentalSectionIntroV67"><MessageCircle/><div><h3>Contato e localização</h3><p>Deixe o cliente encontrar sua locadora e falar rapidamente com você.</p></div></div><div className="rentalEditorGridV67"><label>WhatsApp *<input value={form.whatsapp} onChange={e=>updateField("whatsapp",e.target.value)} placeholder="(88) 99999-9999"/></label><label>Telefone<input value={form.phone} onChange={e=>updateField("phone",e.target.value)} placeholder="(88) 3333-3333"/></label><label>E-mail<input value={form.email} onChange={e=>updateField("email",e.target.value)} placeholder="contato@empresa.com"/></label><label>Instagram<input value={form.instagram} onChange={e=>updateField("instagram",e.target.value)} placeholder="https://instagram.com/sualocadora"/></label><label className="wide">Endereço<input value={form.address} onChange={e=>updateField("address",e.target.value)} placeholder="Rua, número, bairro, cidade - UF"/></label><label className="wide">Horário de atendimento<input value={form.opening_hours} onChange={e=>updateField("opening_hours",e.target.value)} placeholder="Seg a Sáb · 08h às 18h"/></label></div></section>}
              {tab === "aparencia" && <section className="rentalEditorSectionV67"><div className="rentalSectionIntroV67"><Palette/><div><h3>Aparência</h3><p>Escolha as cores que representam sua locadora.</p></div></div><div className="rentalColorGridV67"><ColorPicker label="Cor principal" value={form.primary_color} onChange={v=>updateField("primary_color",v)}/><ColorPicker label="Cor secundária" value={form.secondary_color} onChange={v=>updateField("secondary_color",v)}/></div><div className="rentalPreviewStripV67" style={{background:`linear-gradient(120deg, ${form.secondary_color}, ${form.primary_color})`}}><strong>{form.brand_name || "Sua Locadora"}</strong><span>{form.tagline || "Sua liberdade começa aqui"}</span></div></section>}
              {tab === "frota" && <section className="rentalEditorSectionV67"><div className="rentalSectionIntroV67"><Bike/><div><h3>Sua frota</h3><p>Cadastre modelos, fotos, preços e disponibilidade. Só motos publicadas aparecem no site.</p></div></div><form className="rentalMotoFormV67" onSubmit={saveMoto}><div className="rentalEditorGridV67"><label>Modelo *<input value={motoForm.name} onChange={e=>setMotoForm({...motoForm,name:e.target.value})} placeholder="Honda CG 160" required/></label><label>Categoria<input value={motoForm.category} onChange={e=>setMotoForm({...motoForm,category:e.target.value})} placeholder="Street"/></label><label>Diária<input type="number" min="0" step="0.01" value={motoForm.price_day} onChange={e=>setMotoForm({...motoForm,price_day:e.target.value})}/></label><label>Semanal<input type="number" min="0" step="0.01" value={motoForm.price_week} onChange={e=>setMotoForm({...motoForm,price_week:e.target.value})}/></label><label>Mensal<input type="number" min="0" step="0.01" value={motoForm.price_month} onChange={e=>setMotoForm({...motoForm,price_month:e.target.value})}/></label><label>Ordem<input type="number" min="0" value={motoForm.sort_order} onChange={e=>setMotoForm({...motoForm,sort_order:e.target.value})}/></label><label className="wide">Descrição<textarea rows={3} value={motoForm.description} onChange={e=>setMotoForm({...motoForm,description:e.target.value})} placeholder="Economia, conforto e excelente para o dia a dia."/></label></div><div className="rentalMotoChecksV67"><label><input type="checkbox" checked={motoForm.available} onChange={e=>setMotoForm({...motoForm,available:e.target.checked})}/> Disponível para locação</label><label><input type="checkbox" checked={motoForm.published} onChange={e=>setMotoForm({...motoForm,published:e.target.checked})}/> Mostrar no site</label></div><ImageField label="Foto da moto" value={motoForm.image_url} onChange={file=>{setUploading("moto"); uploadRentalSiteAsset(site.id,file,"moto").then(url=>setMotoForm(current=>({...current,image_url:url}))).catch(e=>setMessage(e.message)).finally(()=>setUploading(""));}} uploading={uploading==="moto"}/><div className="rentalMotoFormActionsV67"><button type="submit" className="btn primary"><Save size={16}/>{editingMotoId ? "Salvar alterações" : "Adicionar moto"}</button>{editingMotoId && <button type="button" className="btn outline" onClick={()=>{setEditingMotoId(null);setMotoForm(emptyMoto)}}>Cancelar</button>}</div></form><div className="rentalMotoListV67">{motorcycles.length===0 ? <div className="rentalEmptyFleetV67"><Bike size={32}/><strong>Nenhuma moto cadastrada</strong><span>Adicione sua primeira moto acima.</span></div> : motorcycles.map(moto=><article key={moto.id} className="rentalMotoCardV67"><div className="rentalMotoImageV67">{moto.image_url?<img src={moto.image_url} alt={moto.name}/>:<Bike size={30}/>}</div><div className="rentalMotoInfoV67"><strong>{moto.name}</strong><span>{moto.category || "Locação"}</span><p>{moto.description || "Sem descrição"}</p><div className="rentalMotoPricesV67"><b>{money(moto.price_day)}/dia</b><span>{moto.price_week ? `${money(moto.price_week)}/sem` : "Sem preço semanal"}</span><span>{moto.price_month ? `${money(moto.price_month)}/mês` : "Sem preço mensal"}</span></div></div><div className="rentalMotoCardActionsV67"><span className={moto.published?"ok":"muted"}>{moto.published?<><Check size={13}/> no site</>:"rascunho"}</span><button className="btn outline" onClick={()=>editMoto(moto)}>Editar</button><button className="iconButton" onClick={()=>removeMoto(moto.id)} aria-label="Excluir"><Trash2 size={17}/></button></div></article>)}</div></section>}
            </div>
            {message && <div className="authMessage rentalEditorMessageV67">{message}</div>}
            <footer className="rentalEditorFooterV67"><span><Globe2 size={15}/> {publicUrl}</span><button className="btn primary" onClick={saveSite} disabled={saving || !active}><Save size={16}/>{saving ? "Salvando..." : "Salvar alterações"}</button></footer>
          </>
        )}
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange, uploading }) {
  return <div className="rentalImageFieldV67"><div className="rentalImagePreviewV67">{value ? <img src={value} alt="Prévia"/> : <ImagePlus size={30}/>}</div><div><strong>{label}</strong><p>JPG, PNG, WEBP, AVIF ou SVG · até 5 MB.</p><label className="btn outline rentalUploadButtonV67"><Upload size={16}/>{uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" onChange={e=>onChange(e.target.files?.[0])} disabled={uploading}/></label></div></div>;
}
function ColorPicker({ label, value, onChange }) { return <label className="rentalColorPickerV67"><span>{label}</span><div><input type="color" value={value} onChange={e=>onChange(e.target.value)}/><input value={value} onChange={e=>onChange(e.target.value)} maxLength={7}/></div></label>; }
