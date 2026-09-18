import { useEffect, useState } from "react";
import { Clock3, MapPin, MessageCircle, Store } from "lucide-react";
import { getPublicRentalSite } from "./services/rentalSiteService";

function getWhatsappUrl(value, brandName) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(`Olá! Vi o site da ${brandName || "locadora"} no LocaCheck e gostaria de mais informações.`);
  return `https://wa.me/${normalized}?text=${text}`;
}

export default function PublicRentalSitePage({ slug }) {
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const data = await getPublicRentalSite(slug);
        if (active) setSite(data || null);
      } catch {
        if (active) setSite(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="publicRentalPageV63 publicRentalUnavailableV63">
        <div className="publicRentalUnavailableCardV63">
          <div className="publicRentalLogoFallbackV63"><Store size={28} /></div>
          <h1>Carregando locadora...</h1>
          <p>Estamos preparando as informações deste site.</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="publicRentalPageV63 publicRentalUnavailableV63">
        <div className="publicRentalUnavailableCardV63">
          <div className="publicRentalLogoFallbackV63"><Store size={28} /></div>
          <span>LocaCheck Sites</span>
          <h1>Site temporariamente indisponível</h1>
          <p>Esta página está temporariamente fora do ar.</p>
        </div>
      </div>
    );
  }

  const whatsappUrl = getWhatsappUrl(site.whatsapp, site.brand_name);
  const primary = site.primary_color || "#f59e0b";

  return (
    <div className="publicRentalPageV63" style={{ "--rental-primary": primary }}>
      <header className="publicRentalHeaderV63">
        <div className="publicRentalBrandV63">
          {site.logo_url ? (
            <img src={site.logo_url} alt={`Logo ${site.brand_name}`} />
          ) : (
            <div className="publicRentalLogoFallbackV63"><Store size={23} /></div>
          )}
          <div>
            <strong>{site.brand_name}</strong>
            <span>{site.tagline || "Aluguel de motos"}</span>
          </div>
        </div>

        {whatsappUrl && (
          <a className="publicRentalHeaderCtaV63" href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> WhatsApp
          </a>
        )}
      </header>

      <main className="publicRentalHeroV63">
        <div className="publicRentalHeroContentV63">
          <span>SITE OFICIAL DA LOCADORA</span>
          <h1>{site.hero_title || `Alugue sua moto com a ${site.brand_name}`}</h1>
          <p>{site.hero_subtitle || site.tagline || "Consulte nossas condições e fale diretamente com nossa equipe."}</p>

          <div className="publicRentalHeroActionsV63">
            {whatsappUrl && (
              <a className="publicRentalPrimaryBtnV63" href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={19} /> {site.cta_text || "Falar no WhatsApp"}
              </a>
            )}
          </div>

          {(site.address || site.opening_hours) && (
            <div className="publicRentalInfoV63">
              {site.address && <span><MapPin size={17} /> {site.address}</span>}
              {site.opening_hours && <span><Clock3 size={17} /> {site.opening_hours}</span>}
            </div>
          )}
        </div>

        <aside className="publicRentalStageNoticeV63">
          <span>LocaCheck Sites</span>
          <strong>Seu site já está publicado.</strong>
          <p>A frota, fotos, valores e personalização completa serão conectados nas próximas etapas do editor.</p>
        </aside>
      </main>
    </div>
  );
}
