import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  LockKeyhole,
  RefreshCw,
  Rocket,
  Share2,
  Store,
} from "lucide-react";
import {
  createMyRentalSite,
  getMyRentalSite,
  getMyRentalSiteBenefit,
  getRentalSitePublicUrl,
  isRentalSiteSlugAvailable,
  normalizeRentalSiteSlug,
  setMyRentalSitePublished,
  updateMyRentalSite,
  validateRentalSiteSlug,
} from "./services/rentalSiteService";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function MyRentalSiteModal({
  userId,
  profile,
  onClose,
  onBuyCredits,
  showToast,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [benefit, setBenefit] = useState(null);
  const [site, setSite] = useState(null);
  const [message, setMessage] = useState("");
  const [slugStatus, setSlugStatus] = useState({ checking: false, available: null, message: "" });
  const [form, setForm] = useState({
    brand_name: profile?.nome ? `${profile.nome}` : "",
    slug: profile?.nome ? normalizeRentalSiteSlug(profile.nome) : "",
    tagline: "",
    whatsapp: profile?.whatsapp || "",
    email: profile?.email || "",
  });

  const publicUrl = useMemo(() => (site?.slug ? getRentalSitePublicUrl(site.slug) : ""), [site?.slug]);

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    setMessage("");

    try {
      const [benefitData, siteData] = await Promise.all([
        getMyRentalSiteBenefit(),
        getMyRentalSite(userId),
      ]);

      setBenefit(benefitData || null);
      setSite(siteData || null);

      if (siteData) {
        setForm({
          brand_name: siteData.brand_name || "",
          slug: siteData.slug || "",
          tagline: siteData.tagline || "",
          whatsapp: siteData.whatsapp || profile?.whatsapp || "",
          email: siteData.email || profile?.email || "",
        });
      }
    } catch (error) {
      setMessage(error.message || "Não foi possível carregar o benefício Meu Site.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!benefit?.active || loading) return undefined;

    const normalized = normalizeRentalSiteSlug(form.slug);
    const validation = validateRentalSiteSlug(normalized);
    if (!validation.valid) {
      setSlugStatus({ checking: false, available: false, message: validation.message });
      return undefined;
    }

    if (site?.slug === normalized) {
      setSlugStatus({ checking: false, available: true, message: "Este é o endereço atual do seu site." });
      return undefined;
    }

    setSlugStatus({ checking: true, available: null, message: "Verificando disponibilidade..." });
    const timer = window.setTimeout(async () => {
      try {
        const result = await isRentalSiteSlugAvailable(normalized, site?.id || null);
        setSlugStatus({
          checking: false,
          available: result.available,
          message: result.available ? "Endereço disponível." : result.message,
        });
      } catch (error) {
        setSlugStatus({ checking: false, available: false, message: error.message || "Falha ao verificar o endereço." });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [form.slug, site?.id, site?.slug, benefit?.active, loading]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setMessage("");

    if (!benefit?.active) {
      setMessage("Faça uma nova compra de créditos para liberar a criação do site.");
      return;
    }

    const validation = validateRentalSiteSlug(form.slug);
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }

    if (slugStatus.checking || slugStatus.available === false) {
      setMessage(slugStatus.message || "Escolha um endereço disponível.");
      return;
    }

    setSaving(true);
    try {
      const created = await createMyRentalSite({
        userId,
        brandName: form.brand_name,
        slug: form.slug,
        tagline: form.tagline,
        whatsapp: form.whatsapp,
        email: form.email,
      });
      setSite(created);
      setForm((current) => ({ ...current, slug: created.slug }));
      setMessage("Seu site foi criado. Ele começa como rascunho para você revisar antes de publicar.");
      showToast?.("success", "Site criado", "Agora você já pode revisar os dados e publicar.");
    } catch (error) {
      setMessage(error.message || "Não foi possível criar seu site.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!site?.id) return;
    setMessage("");

    if (!benefit?.active) {
      setMessage("Seu benefício expirou. Compre novos créditos para voltar a editar o site.");
      return;
    }

    const validation = validateRentalSiteSlug(form.slug);
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }

    if (slugStatus.checking || slugStatus.available === false) {
      setMessage(slugStatus.message || "Escolha um endereço disponível.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyRentalSite(site.id, {
        brand_name: form.brand_name,
        slug: form.slug,
        tagline: form.tagline.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
      });
      setSite(updated);
      setForm((current) => ({ ...current, slug: updated.slug }));
      setMessage("Alterações salvas com sucesso.");
      showToast?.("success", "Site atualizado", "As informações básicas foram salvas.");
    } catch (error) {
      setMessage(error.message || "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    if (!site?.id || !benefit?.active) return;
    setPublishing(true);
    setMessage("");

    try {
      if (!site.published && onlyDigits(form.whatsapp).length < 10) {
        throw new Error("Informe um WhatsApp válido antes de publicar o site.");
      }

      // Salva os dados visíveis antes da primeira publicação.
      const saved = await updateMyRentalSite(site.id, {
        brand_name: form.brand_name,
        slug: form.slug,
        tagline: form.tagline.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
      });

      const updated = await setMyRentalSitePublished(saved.id, !saved.published);
      setSite(updated);
      setMessage(updated.published ? "Site publicado com sucesso." : "Site colocado em rascunho.");
      showToast?.(
        "success",
        updated.published ? "Site publicado" : "Site em rascunho",
        updated.published ? "O link público já pode ser compartilhado." : "O link público deixou de exibir a locadora."
      );
    } catch (error) {
      setMessage(error.message || "Não foi possível alterar a publicação.");
    } finally {
      setPublishing(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast?.("success", "Link copiado", publicUrl);
    } catch {
      setMessage(`Copie este link: ${publicUrl}`);
    }
  }

  async function shareLink() {
    if (!publicUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: site?.brand_name || "Minha locadora",
          text: `Conheça a ${site?.brand_name || "nossa locadora"}`,
          url: publicUrl,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const text = encodeURIComponent(`Conheça a ${site?.brand_name || "nossa locadora"}: ${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  const active = benefit?.active === true;
  const hasSite = Boolean(site?.id);

  return (
    <div className="modalOverlay rentalSiteModalOverlay">
      <div className="recordModal rentalSiteModalV63">
        <button className="closeModal" type="button" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <div className="rentalSiteModalHeaderV63">
          <div className="rentalSiteIconV63"><Store size={24} /></div>
          <div>
            <span>Benefício LocaCheck</span>
            <h2>Meu Site</h2>
            <p>Crie e mantenha o site da sua locadora usando suas compras de créditos.</p>
          </div>
        </div>

        {loading ? (
          <div className="rentalSiteLoadingV63">
            <RefreshCw size={22} className="rentalSiteSpinV63" />
            Consultando seu benefício...
          </div>
        ) : (
          <>
            <section className={`rentalBenefitCardV63 ${active ? "active" : "inactive"}`}>
              <div className="rentalBenefitIconV63">
                {active ? <CheckCircle2 size={25} /> : <LockKeyhole size={25} />}
              </div>
              <div className="rentalBenefitMainV63">
                <span>{active ? "BENEFÍCIO ATIVO" : "BENEFÍCIO INATIVO"}</span>
                <strong>
                  {active
                    ? `${benefit?.days_remaining || 0} dia(s) restante(s)`
                    : hasSite
                      ? "Seu site está preservado, mas fora do ar"
                      : "Compre créditos para liberar seu site"}
                </strong>
                <p>
                  {active
                    ? `Válido até ${formatDateTime(benefit?.expires_at)}.`
                    : "Uma nova compra paga de créditos libera novamente o benefício por 30 dias."}
                </p>
              </div>
              {active && (
                <div className="rentalBenefitDateV63">
                  <CalendarClock size={18} />
                  <small>Última compra elegível</small>
                  <strong>{formatDateTime(benefit?.last_purchase_at)}</strong>
                </div>
              )}
            </section>

            {!active && (
              <section className="rentalSiteLockedV63">
                <LockKeyhole size={34} />
                <h3>{hasSite ? "Seu conteúdo continua salvo" : "Ative o benefício Meu Site"}</h3>
                <p>
                  {hasSite
                    ? "Logo, endereço, configurações e futuras motos não são apagados quando o benefício vence. Após uma nova compra, o site volta a ficar disponível para edição e publicação."
                    : "Qualquer compra paga de créditos do LocaCheck libera a criação do seu site por 30 dias."}
                </p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    onClose?.();
                    onBuyCredits?.();
                  }}
                >
                  Comprar créditos
                </button>
              </section>
            )}

            {active && !hasSite && (
              <form className="rentalSiteFormV63" onSubmit={handleCreate}>
                <div className="rentalSiteSectionTitleV63">
                  <Rocket size={20} />
                  <div>
                    <strong>Crie seu site</strong>
                    <small>Comece pela identidade básica. As fotos, frota e personalização completa entram nas próximas etapas.</small>
                  </div>
                </div>

                <label>
                  <span>Nome da locadora *</span>
                  <input
                    type="text"
                    value={form.brand_name}
                    onChange={(event) => updateField("brand_name", event.target.value)}
                    placeholder="Ex: Speed Motos"
                    maxLength={90}
                    required
                  />
                </label>

                <label>
                  <span>Endereço do site *</span>
                  <div className="rentalSlugFieldV63">
                    <span className="rentalSlugPrefixV63">loca-check.vercel.app/site/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(event) => updateField("slug", normalizeRentalSiteSlug(event.target.value))}
                      placeholder="speedmotos"
                      maxLength={50}
                      required
                    />
                  </div>
                  <small className={`rentalSlugStatusV63 ${slugStatus.available === true ? "ok" : slugStatus.available === false ? "error" : ""}`}>
                    {slugStatus.message || "Use letras, números e hífen. Esse endereço será exclusivo da sua locadora."}
                  </small>
                </label>

                <label>
                  <span>Slogan</span>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(event) => updateField("tagline", event.target.value)}
                    placeholder="Ex: Sua liberdade começa aqui"
                    maxLength={140}
                  />
                </label>

                <div className="rentalSiteFormGridV63">
                  <label>
                    <span>WhatsApp</span>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={(event) => updateField("whatsapp", event.target.value)}
                      placeholder="(88) 99999-9999"
                    />
                  </label>
                  <label>
                    <span>E-mail</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="contato@locadora.com"
                    />
                  </label>
                </div>

                {message && <div className="authMessage">{message}</div>}

                <button className="btn primary rentalSitePrimaryActionV63" type="submit" disabled={saving || slugStatus.checking || slugStatus.available === false}>
                  <Rocket size={18} />
                  {saving ? "Criando..." : "Criar meu site"}
                </button>
              </form>
            )}

            {active && hasSite && (
              <>
                <section className="rentalSiteStatusPanelV63">
                  <div>
                    <span className={`rentalPublicationBadgeV63 ${site.published ? "published" : "draft"}`}>
                      {site.published ? "PUBLICADO" : "RASCUNHO"}
                    </span>
                    <h3>{site.brand_name}</h3>
                    <p>{site.published ? "Seu endereço público está ativo enquanto o benefício permanecer válido." : "Revise os dados antes de colocar sua locadora no ar."}</p>
                  </div>

                  {publicUrl && (
                    <div className="rentalPublicUrlV63">
                      <Globe2 size={18} />
                      <span>{publicUrl}</span>
                    </div>
                  )}

                  <div className="rentalSiteLinkActionsV63">
                    <button type="button" className="btn outline" onClick={copyLink}>
                      <Copy size={17} /> Copiar link
                    </button>
                    <button type="button" className="btn outline" onClick={shareLink}>
                      <Share2 size={17} /> Compartilhar
                    </button>
                    {site.published && (
                      <button type="button" className="btn outline" onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}>
                        <ExternalLink size={17} /> Abrir site
                      </button>
                    )}
                  </div>
                </section>

                <form className="rentalSiteFormV63" onSubmit={handleSave}>
                  <div className="rentalSiteSectionTitleV63">
                    <Store size={20} />
                    <div>
                      <strong>Informações básicas</strong>
                      <small>A edição completa de logo, cores, fotos, textos e frota será adicionada nas próximas etapas.</small>
                    </div>
                  </div>

                  <label>
                    <span>Nome da locadora *</span>
                    <input
                      type="text"
                      value={form.brand_name}
                      onChange={(event) => updateField("brand_name", event.target.value)}
                      maxLength={90}
                      required
                    />
                  </label>

                  <label>
                    <span>Endereço do site *</span>
                    <div className="rentalSlugFieldV63">
                      <span className="rentalSlugPrefixV63">loca-check.vercel.app/site/</span>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(event) => updateField("slug", normalizeRentalSiteSlug(event.target.value))}
                        maxLength={50}
                        required
                      />
                    </div>
                    <small className={`rentalSlugStatusV63 ${slugStatus.available === true ? "ok" : slugStatus.available === false ? "error" : ""}`}>
                      {slugStatus.message || "O endereço pode ser alterado enquanto estiver disponível."}
                    </small>
                  </label>

                  <label>
                    <span>Slogan</span>
                    <input
                      type="text"
                      value={form.tagline}
                      onChange={(event) => updateField("tagline", event.target.value)}
                      maxLength={140}
                    />
                  </label>

                  <div className="rentalSiteFormGridV63">
                    <label>
                      <span>WhatsApp</span>
                      <input
                        type="tel"
                        value={form.whatsapp}
                        onChange={(event) => updateField("whatsapp", event.target.value)}
                        placeholder="(88) 99999-9999"
                      />
                    </label>
                    <label>
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                      />
                    </label>
                  </div>

                  {message && <div className="authMessage">{message}</div>}

                  <div className="rentalSiteEditorActionsV63">
                    <button type="submit" className="btn outline" disabled={saving || slugStatus.checking || slugStatus.available === false}>
                      {saving ? "Salvando..." : "Salvar informações"}
                    </button>
                    <button type="button" className={`btn ${site.published ? "danger" : "primary"}`} onClick={handlePublishToggle} disabled={publishing || saving}>
                      <Rocket size={17} />
                      {publishing ? "Processando..." : site.published ? "Colocar em rascunho" : "Publicar site"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
