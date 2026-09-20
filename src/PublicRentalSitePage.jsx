import { useEffect, useMemo, useState } from "react";
import { Bike, CalendarDays, CheckCircle2, Clock3, Instagram, Mail, MapPin, Menu, MessageCircle, Phone, ShieldCheck, Star, X } from "lucide-react";
import { getPublicRentalSite } from "./services/rentalSiteService";
import heroFallback from "./assets/hero-moto.jpg";

function whatsappUrl(value, brandName) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Olá! Vi o site da ${brandName || "locadora"} no LocaCheck e gostaria de informações sobre aluguel de motos.`)}`;
}
function money(value) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function motorcycleWhatsappUrl(value, brandName, motoName) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  const message = `Olá! Vi a ${motoName || "moto"} no site da ${brandName || "locadora"} e gostaria de saber mais sobre a locação. Poderia me passar mais informações?`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export default function PublicRentalSitePage({ slug, previewSite = null, previewMotorcycles = null }) {
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (previewSite) {
      setSite({ ...previewSite, motorcycles: previewMotorcycles || [] });
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    getPublicRentalSite(slug).then(data => { if (active) setSite(data || null); }).catch(() => { if (active) setSite(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, previewSite, previewMotorcycles]);

  const wa = useMemo(() => whatsappUrl(site?.whatsapp, site?.brand_name), [site?.whatsapp, site?.brand_name]);
  if (loading) return <div className="rentalPublicV67 rentalPublicLoadingV67"><div className="rentalPublicLoaderV67"><Bike size={30}/><strong>Carregando sua locadora...</strong><span>Preparando o site.</span></div></div>;
  if (!site) return <div className="rentalPublicV67 rentalPublicUnavailableV67"><div><Bike size={34}/><h1>Site temporariamente indisponível</h1><p>Esta página não está disponível no momento.</p></div></div>;

  const primary = site.primary_color || "#2563eb";
  const secondary = site.secondary_color || "#0f172a";
  const motos = site.motorcycles || [];
  const hero = site.hero_image_url || heroFallback;

  const scroll = id => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return <div className="rentalPublicV67" style={{ "--rental-primary": primary, "--rental-secondary": secondary }}>
    <header className="rentalPublicNavV67">
      <a className="rentalPublicBrandV67" href="#inicio" onClick={e=>{e.preventDefault();scroll("inicio")}}>
        {site.logo_url ? <img src={site.logo_url} alt={`Logo ${site.brand_name}`}/> : <span className="rentalPublicLogoFallbackV67"><Bike size={24}/></span>}
        <span><strong>{site.brand_name}</strong><small>{site.tagline || "Locação de motos"}</small></span>
      </a>
      <nav className="rentalPublicLinksV67"><button onClick={()=>scroll("inicio")}>Início</button><button onClick={()=>scroll("frota")}>Motos</button><button onClick={()=>scroll("sobre")}>Sobre</button><button onClick={()=>scroll("contato")}>Contato</button></nav>
      <div className="rentalPublicNavActionsV67">{wa && <a href={wa} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a>}<button className="rentalMobileMenuV67" onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X/>:<Menu/>}</button></div>
      {menuOpen && <nav className="rentalMobileNavV67"><button onClick={()=>scroll("inicio")}>Início</button><button onClick={()=>scroll("frota")}>Motos</button><button onClick={()=>scroll("sobre")}>Sobre</button><button onClick={()=>scroll("contato")}>Contato</button></nav>}
    </header>

    <main>
      <section id="inicio" className="rentalPublicHeroV67">
        <div className="rentalHeroBgV67" style={hero ? { backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${secondary} 96%, black) 0%, color-mix(in srgb, ${secondary} 82%, transparent) 44%, color-mix(in srgb, ${secondary} 30%, transparent) 100%), url("${hero}")` } : {}} />
        <div className="rentalHeroContentV67"><h1>{site.hero_title || `Alugue sua moto com ${site.brand_name}`}</h1><p>{site.hero_subtitle || site.tagline || "Motos prontas para você seguir seu caminho, com atendimento rápido e condições claras."}</p><div className="rentalHeroButtonsV67">{wa && <a className="rentalPrimaryCtaV67" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={19}/> {site.cta_text || "Falar no WhatsApp"}</a>}<button className="rentalSecondaryCtaV67" onClick={()=>scroll("frota")}><Bike size={19}/> Ver motos</button></div><div className="rentalHeroTrustV67"><span><CheckCircle2/> Atendimento direto</span><span><ShieldCheck/> Motos revisadas</span><span><Star/> Experiência local</span></div></div>
        
      </section>

      <section className="rentalDriverSectionV70"><div className="rentalDriverInnerV70"><span className="rentalDriverEyebrowV70">SOLUÇÃO PARA QUEM TRABALHA SOBRE DUAS RODAS</span><h2>Aluguel de Motos para Motoristas de Aplicativo</h2><p>Para agilizar seu trabalho, foque em ganhar dinheiro, e deixe o resto com a gente!</p><div className="rentalBenefitsGridV70"><article><strong>Maior flexibilidade</strong><p>Com uma moto alugada, você pode escolher os horários de trabalho e definir sua própria rotina.</p></article><article><strong>Economia de custos</strong><p>O aluguel de uma moto é muito mais acessível e econômico do que comprar um veículo novo.</p></article><article><strong>Redução do desgaste</strong><p>Ao alugar uma moto, você evita gastar tempo e dinheiro com manutenção, seguro e impostos.</p></article></div></div></section>

      <section id="frota" className="rentalPublicSectionV67"><div className="rentalSectionHeadingV67"><div><span>FROTA</span><h2>Motos para diferentes necessidades</h2><p>Confira os modelos disponíveis na {site.brand_name}.</p></div></div>{motos.length ? <div className="rentalFleetGridV67">{motos.map(moto=><article className="rentalFleetCardV67" key={moto.id}><div className="rentalFleetImageV67">{moto.image_url?<img src={moto.image_url} alt={moto.name}/>:<Bike size={46}/>}<span className={moto.available?"available":"unavailable"}>{moto.available?"Disponível":"Indisponível"}</span></div><div className="rentalFleetBodyV67"><h3>{moto.name}</h3><div className="rentalFleetSpecsV71">{moto.model_year && <span>Ano <b>{moto.model_year}</b></span>}{moto.engine_cc && <span><b>{moto.engine_cc}</b> cc</span>}{moto.deposit > 0 && <span>Caução <b>{money(moto.deposit)}</b></span>}</div><p>{moto.description || "Consulte condições e disponibilidade com nossa equipe."}</p><div className="rentalFleetPriceV67">{moto.price_day > 0 && <div><small>A partir de</small><strong>{money(moto.price_day)} <em>/ diária</em></strong></div>}{moto.price_week > 0 && <div><small>Semanal</small><strong>{money(moto.price_week)}</strong></div>}{moto.price_month > 0 && <div><small>Mensal</small><strong>{money(moto.price_month)}</strong></div>}</div>{wa && <a className="rentalFleetCtaV67" href={motorcycleWhatsappUrl(site.whatsapp, site.brand_name, moto.name)} target="_blank" rel="noreferrer">Tenho interesse <MessageCircle size={15}/></a>}</div></article>)}</div> : <div className="rentalEmptyPublicFleetV67"><Bike size={38}/><h3>Em breve, nossa frota estará aqui</h3><p>Entre em contato com a {site.brand_name} para consultar os modelos disponíveis.</p>{wa && <a href={wa} target="_blank" rel="noreferrer">Falar no WhatsApp</a>}</div>}</section>

      <section className="rentalRequirementsSectionV70"><div className="rentalRequirementsHeaderV70"><span>REQUISITOS PARA ALUGUEL</span><h2>O que você precisa para alugar</h2><p>Confira as condições básicas para retirar uma de nossas motos.</p></div><div className="rentalRequirementsGridV70"><article><strong>Idade mínima</strong><p>Para alugar uma de nossas motos, é necessário ter pelo menos 20 anos de idade.</p></article><article><strong>Carteira de Habilitação</strong><p>É obrigatório apresentar uma CNH DIGITAL válida no momento da retirada da moto.</p></article><article><strong>Depósito de segurança</strong><p>Um depósito de segurança é exigido no momento do aluguel e será devolvido 20 dias úteis após a devolução da moto em perfeitas condições.</p></article><article><strong>Nada Consta</strong><p>Declaração de antecedentes criminais.</p></article></div></section>

      <section id="sobre" className="rentalAboutV67"><div className="rentalAboutIconV67"><ShieldCheck size={38}/></div><div><span>SOBRE A LOCADORA</span><h2>{site.about_title || `Por que escolher a ${site.brand_name}?`}</h2><p>{site.about_text || `A ${site.brand_name} trabalha para oferecer uma experiência simples, segura e transparente para quem precisa de uma moto para trabalhar, viajar ou resolver a rotina.`}</p><div className="rentalAboutPointsV67"><span><CheckCircle2/> Atendimento próximo</span><span><CheckCircle2/> Condições transparentes</span><span><CheckCircle2/> Motos cuidadas</span></div></div></section>

      <section className="rentalFaqSectionV70"><div className="rentalFaqHeaderV70"><span>DÚVIDAS</span><h2>FREQUENTES</h2><p>Confira as respostas para as dúvidas mais comuns antes de iniciar sua locação.</p></div><div className="rentalFaqListV70"><details><summary>Estou com nome sujo posso alugar?</summary><p>A {site.brand_name} não faz consulta no Serasa, isso significa que você pode ser aprovado e alugar, mesmo se tiver nome sujo. Você também não precisa de cartão de crédito ou de fiador.</p></details><details><summary>O que está incluso no aluguel?</summary><p>Todos os planos incluem, além da moto: assistência 24h, resgate, plano de proteção para terceiros e manutenção preventiva.</p></details><details><summary>O que acontece se eu levar uma multa?</summary><p>Toda e qualquer multa sofrida após o início do aluguel será de total responsabilidade do condutor.</p></details><details><summary>É possível alugar a moto por 1 semana apenas?</summary><p>Não. Todos os planos possuem um período mínimo de 4 semanas.</p></details><details><summary>Com quanto tempo recebo a devolução do caução?</summary><p>Caso a moto não tenha sofrido nenhuma avaria nem multa, o caução será devolvido no período de 20 dias úteis após o término do contrato.</p></details><details><summary>O que acontece se eu quebrar o contrato?</summary><p>Em caso de quebra de contrato, o caução poderá ser utilizado como multa pela quebra contratual, conforme as condições previstas no contrato de locação.</p></details></div></section>

      <section id="contato" className="rentalContactV67"><div><span>FALE COM A GENTE</span><h2>Vamos encontrar a moto certa para você.</h2><p>Envie uma mensagem e consulte disponibilidade, valores e condições.</p>{wa && <a className="rentalPrimaryCtaV67" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={19}/> Falar no WhatsApp</a>}</div><div className="rentalContactCardV67">{site.address && <div><MapPin/><span><small>Endereço</small><strong>{site.address}</strong></span></div>}{site.opening_hours && <div><Clock3/><span><small>Horário</small><strong>{site.opening_hours}</strong></span></div>}{site.phone && <div><Phone/><span><small>Telefone</small><strong>{site.phone}</strong></span></div>}{site.email && <div><Mail/><span><small>E-mail</small><strong>{site.email}</strong></span></div>}{site.instagram && <a href={site.instagram.startsWith("http")?site.instagram:`https://instagram.com/${site.instagram.replace(/^@/,"")}`} target="_blank" rel="noreferrer"><Instagram/><span><small>Instagram</small><strong>Ver perfil</strong></span></a>}</div></section>
    </main>

    <footer className="rentalPublicFooterV67"><div className="rentalPublicBrandV67">{site.logo_url?<img src={site.logo_url} alt=""/>:<span className="rentalPublicLogoFallbackV67"><Bike size={19}/></span>}<span><strong>{site.brand_name}</strong><small>{site.tagline || "Locação de motos"}</small></span></div><span>© {new Date().getFullYear()} {site.brand_name}. Todos os direitos reservados.</span><span>Site criado com <b>LocaCheck</b></span></footer>
  </div>;
}
