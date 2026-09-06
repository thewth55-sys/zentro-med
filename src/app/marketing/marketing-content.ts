// Static content for the Zentro Med Marketing landing (src/app/marketing/page.tsx).
// Sibling to src/app/landing-content.ts — same raw-HTML-string architecture,
// same landing.css design system, same LANDING_BEHAVIOR_SCRIPT (mobile menu,
// FAQ accordion, scroll-reveal, currency switcher — all generic DOM-query
// based, nothing landing-page-specific, so it's imported rather than
// duplicated). Same light theme and green accent as the rest of the
// redesign — the 2026 mockup keeps this page visually on-brand rather
// than reading as a separate indigo-tinted product; the only indigo left
// is the small "Marketing" nav badge next to the logo.

export const MARKETING_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://med.zentrolabs.com/#organization",
      name: "Zentro Med",
      url: "https://med.zentrolabs.com",
      description: "CRM comercial para consultorios médicos en Latinoamérica, con marketing digital disponible como servicio independiente.",
      areaServed: ["CO", "MX", "AR", "CL", "PE", "GT"],
    },
    {
      "@type": "Service",
      "@id": "https://med.zentrolabs.com/marketing/#service",
      name: "Zentro Med Marketing",
      provider: { "@id": "https://med.zentrolabs.com/#organization" },
      description:
        "Servicio de marketing por suscripción para consultorios médicos: estrategia, contenido, campañas en Meta Ads y Google Ads, y reportes, gestionados por un equipo dedicado a la salud. Incluye Zentro CRM sin costo adicional.",
      serviceType: "Marketing Digital para Consultorios Médicos",
      areaServed: ["CO", "MX", "AR", "CL", "PE", "GT"],
    },
  ],
};

export const MARKETING_BODY_HTML = `
<!-- NAV -->
<nav>
  <div class="wrap">
    <div class="nav-i">
      <a href="/" class="logo">
        <img src="/zentro-isotipo.png" alt="" style="height:26px;width:26px;">
        <span class="logo-text">zentro</span>
        <span class="logo-badge" style="background:#818cf8;color:#1e1b4b;">Marketing</span>
      </a>
      <div class="nav-r">
        <a href="#como" class="nav-link">Cómo funciona</a>
        <a href="#planes" class="nav-link">Planes</a>
        <a href="#resultados" class="nav-link">Resultados</a>
        <a href="#preguntas" class="nav-link">Preguntas</a>
        <a href="/" class="nav-login" aria-label="Ver el sistema">
          <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
          <span class="nav-login-text">Ver el sistema</span>
        </a>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-green btn-sm nav-cta-btn">Agendar diagnóstico</a>
        <button class="mob-menu-btn" onclick="zmToggleMobMenu()" aria-label="Abrir menú" aria-expanded="false" id="mobMenuBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <div class="mob-menu-panel" id="mobMenuPanel">
    <a href="#como" class="mob-menu-link" onclick="zmCloseMobMenu()">Cómo funciona</a>
    <a href="#planes" class="mob-menu-link" onclick="zmCloseMobMenu()">Planes</a>
    <a href="#resultados" class="mob-menu-link" onclick="zmCloseMobMenu()">Resultados</a>
    <a href="#preguntas" class="mob-menu-link" onclick="zmCloseMobMenu()">Preguntas</a>
    <a href="/" class="mob-menu-link" onclick="zmCloseMobMenu()">Ver el sistema</a>
    <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-green btn-sm mob-menu-cta" onclick="zmCloseMobMenu()">Agendar diagnóstico</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <div class="hero-eyebrow">
      <span class="pill-dark"><span class="dot-green"></span>Marketing as a service · suscripción mensual</span>
    </div>
    <h1>El único marketing que<br>te dice cuánto facturaste.</h1>
    <p class="hero-sub">No es una agencia que cotiza por proyecto: es un servicio que activas por mes. Un equipo lleva tus campañas de Meta y Google, y como el sistema del consultorio viene incluido, seguimos a cada paciente hasta la silla y hasta la factura.</p>
    <div class="hero-ctas">
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'mkt_hero_primary'});">Agendar diagnóstico gratis</a>
      <a href="#planes" class="btn btn-ghost-light btn-lg">Ver los planes</a>
    </div>
    <p class="hero-note">// Diagnóstico gratis antes de cotizar · Sin permanencia</p>

    <div class="reveal" style="max-width:640px;margin:36px auto 0;">
      <div class="funnel">
        <div class="funnel-step">
          <div class="funnel-label"><span class="funnel-label-main">Vieron tu anuncio</span><span class="funnel-label-sub">Meta y Google · lo gestionamos</span></div>
          <span class="funnel-val">18,420</span>
        </div>
        <div class="funnel-step">
          <div class="funnel-label"><span class="funnel-label-main">Escribieron por WhatsApp</span><span class="funnel-label-sub">Llegan a tu bandeja de siempre</span></div>
          <span class="funnel-val">148</span>
        </div>
        <div class="funnel-step">
          <div class="funnel-label"><span class="funnel-label-main">Zen los atendió</span><span class="funnel-label-sub">Aunque fuera de madrugada</span></div>
          <span class="funnel-val">96</span>
        </div>
        <div class="funnel-step">
          <div class="funnel-label"><span class="funnel-label-main">Agendaron cita</span><span class="funnel-label-sub">En tu agenda real, sin dobles citas</span></div>
          <span class="funnel-val">96</span>
        </div>
        <div class="funnel-step">
          <div class="funnel-label"><span class="funnel-label-main">Se volvieron pacientes</span><span class="funnel-label-sub">Llegaron y se sentaron</span></div>
          <span class="funnel-val">31</span>
        </div>
      </div>
      <div class="funnel-result">
        <div>
          <div class="funnel-result-val">$71,300</div>
          <div class="funnel-result-label">Facturado a esos 31 pacientes</div>
        </div>
        <div>
          <div class="funnel-result-val">11.1×</div>
          <div class="funnel-result-label">Retorno</div>
        </div>
      </div>
      <p class="mockui-caption" style="color:var(--zm-muted2);">// El camino completo · septiembre</p>
    </div>
  </div>
</section>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="wrap">
    <div class="stats-bar-inner">
      <div class="stat-item">
        <div class="stat-n2"><span>+40</span></div>
        <div class="stat-l2">consultorios con campañas activas</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2">$206</div>
        <div class="stat-l2">costo promedio por paciente nuevo</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2"><span>21%</span></div>
        <div class="stat-l2">de los mensajes se vuelven pacientes</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2"><span>11×</span></div>
        <div class="stat-l2">retorno promedio sobre la inversión</div>
      </div>
    </div>
  </div>
</div>

<!-- 01 — CÓMO FUNCIONA -->
<section class="how" id="como">
  <div class="wrap">
    <div class="how-header reveal">
      <p class="section-label">// 01 — Cómo funciona</p>
      <h2 class="section-title">No contratas una agencia. Activas un servicio.</h2>
      <p class="section-sub" style="margin:0 auto;text-align:center;">Sin propuesta de 40 páginas, sin contrato por proyecto y sin permanencia. Se activa por mes, trabajamos sobre tu propia cuenta de Zentro, y ahí vemos cuántos de los mensajes que generamos se volvieron citas y cuánto facturaste con ellos.</p>
    </div>
    <div class="how-steps reveal-group">
      <div class="how-step">
        <div class="step-num">1</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Día 1</p>
        <div class="step-title">Diagnóstico gratis</div>
        <div class="step-desc">Revisamos tu ciudad, tu competencia, tu ticket promedio y cuántos espacios libres tienes. De ahí sale el plan, no de un catálogo.</div>
      </div>
      <div class="how-step">
        <div class="step-num">2</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Días 2 a 7</p>
        <div class="step-title">Montamos todo</div>
        <div class="step-desc">Cuentas de anuncios, píxeles, página de aterrizaje por tratamiento y la conexión con tu WhatsApp. Los activos quedan a tu nombre.</div>
      </div>
      <div class="how-step">
        <div class="step-num">3</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Día 8</p>
        <div class="step-title">Salen las campañas</div>
        <div class="step-desc">Otras agencias arrancan en tres días porque solo montan el anuncio. Nosotros tardamos ocho porque también dejamos listo el sistema: sin eso, los mensajes llegan a un WhatsApp que nadie contesta.</div>
      </div>
      <div class="how-step">
        <div class="step-num">4</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Cada mes</p>
        <div class="step-title">Optimizamos y reportamos</div>
        <div class="step-desc">Ajustamos lo que funciona y apagamos lo que no. El reporte no habla de clics: habla de pacientes y de cuánto facturaste con ellos.</div>
      </div>
    </div>
    <div class="reveal" style="display:flex;justify-content:center;gap:32px;flex-wrap:wrap;margin-top:52px;text-align:center;">
      <div><div class="stat-n2" style="color:var(--zm-ink);font-size:26px;">+40</div><div class="stat-l2" style="color:var(--zm-muted);">consultorios con campañas activas</div></div>
      <div><div class="stat-n2" style="color:var(--zm-ink);font-size:26px;">7</div><div class="stat-l2" style="color:var(--zm-muted);">países donde operamos</div></div>
      <div><div class="stat-n2" style="color:var(--zm-ink);font-size:26px;">100%</div><div class="stat-l2" style="color:var(--zm-muted);">de nuestros clientes son del sector salud</div></div>
    </div>
    <div class="reveal" style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:24px;">
      <span class="pill-dark" style="background:var(--zm-surface);color:var(--zm-ink2);border-color:var(--zm-line);">Equipo asignado · estratega, diseño y pauta, sin subcontratar</span>
      <span class="pill-dark" style="background:var(--zm-surface);color:var(--zm-ink2);border-color:var(--zm-line);">Sin permanencia · suscripción mensual, cancelas con 30 días</span>
    </div>
  </div>
</section>

<!-- 02 — SERVICIO, NO AGENCIA -->
<section class="problems" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 02 — Servicio, no agencia</p>
      <h2 class="section-title">Tu consultorio no se anuncia como una ferretería</h2>
      <p class="section-sub">La mayoría de las agencias lleva restaurantes, tiendas y de paso algunos consultorios, cobra por proyecto y te amarra por un año. Nosotros solo trabajamos con consultorios, se activa por mes, y sabemos que en salud el paciente decide por confianza.</p>
    </div>
    <div class="reveal compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th>En la práctica</th><th>Agencia tradicional</th><th class="highlight">Marketing como servicio</th></tr></thead>
        <tbody>
          <tr><td>Cómo se contrata</td><td class="bad">Propuesta, contrato y anticipo</td><td class="good">Se activa por mes, como cualquier suscripción</td></tr>
          <tr><td>Qué te reporta cada mes</td><td class="bad">Alcance, likes y clics</td><td class="good">Pacientes y cuánto facturaron</td></tr>
          <tr><td>Hasta dónde llega su trabajo</td><td class="bad">Hasta que el paciente escribe</td><td class="good">Hasta que se sienta y paga</td></tr>
          <tr><td>Quién contesta de noche</td><td class="bad">Nadie, hasta el día siguiente</td><td class="good">Zen, en el momento</td></tr>
          <tr><td>Qué sabe de tu especialidad</td><td class="bad">Lo que le contaste en la junta</td><td class="good">Solo trabajamos con consultorios</td></tr>
          <tr><td>Qué pasa si te vas</td><td class="bad">Los activos suelen quedarse con ellos</td><td class="good">Cuentas, páginas y datos son tuyos</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- 03 — PLANES DE MARKETING -->
<section class="pricing" id="planes">
  <div class="wrap">
    <div class="pricing-header reveal">
      <p class="section-label">// 03 — Planes de marketing</p>
      <h2 class="section-title">Elige según cuánto quieres crecer</h2>
      <p class="section-sub" style="max-width:640px;margin:12px auto 0;">Los tres planes incluyen el sistema de gestión del consultorio, sin costo aparte. Sin permanencia: cancelas con 30 días de aviso.</p>
    </div>
    <div class="plans-grid reveal-group" style="max-width:1040px;">

      <!-- MED STARTER -->
      <div class="plan-card">
        <span class="plan-badge badge-crm">Tu primera campaña</span>
        <div class="plan-name">Med Starter</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt">5,900</span><sub>MXN / mes</sub></div>
        <div class="plan-note">$324 USD · + $129 de instalación, una sola vez</div>
        <div class="plan-note">Incluye el sistema de gestión, plan Profesional (valor $79/mes)</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf" style="font-weight:700;color:var(--zm-ink);">Publicidad</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>1 campaña activa en Meta Ads</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Segmentación por zona y tratamiento</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Optimización mensual</div>
          <div class="pf" style="font-weight:700;color:var(--zm-ink);margin-top:6px;">Contenido</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>4 piezas al mes para tus redes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Copys y diseño incluidos</div>
          <div class="pf" style="font-weight:700;color:var(--zm-ink);margin-top:6px;">Medición</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Reporte mensual de resultados</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Mensajes atribuidos a su anuncio</div>
        </div>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="plan-btn btn-plan-crm" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'mkt_starter'});">Empezar con Starter →</a>
        <p class="plan-fine">// Sin permanencia · Cancela con 30 días de aviso</p>
      </div>

      <!-- MED GROWTH -->
      <div class="plan-card featured">
        <div class="plan-chip">⭐ El más contratado</div>
        <span class="plan-badge badge-crm">Quieres crecer en serio</span>
        <div class="plan-name">Med Growth</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt">9,450</span><sub>MXN / mes</sub></div>
        <div class="plan-note">$519 USD · + $259 de instalación, una sola vez</div>
        <div class="plan-note">Incluye el sistema de gestión, plan Clínica (valor $149/mes)</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf" style="font-weight:700;color:var(--zm-ink);">Publicidad</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Meta Ads y Google Ads</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Hasta 3 campañas activas a la vez</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Página de aterrizaje por especialidad</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Optimización cada semana</div>
          <div class="pf" style="font-weight:700;color:var(--zm-ink);margin-top:6px;">Contenido</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>8 piezas al mes, incluye video corto</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Calendario de publicación mensual</div>
          <div class="pf" style="font-weight:700;color:var(--zm-ink);margin-top:6px;">Medición</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Reporte con costo por paciente nuevo</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Llamada mensual de estrategia</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Tablero en vivo dentro de Zentro</div>
        </div>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="plan-btn btn-plan-pop" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'mkt_growth'});">Empezar con Growth →</a>
        <p class="plan-fine">// Sin permanencia · Cancela con 30 días de aviso</p>
      </div>

      <!-- MED PREMIUM -->
      <div class="plan-card dark-card">
        <span class="plan-badge badge-pro">Clínica con varias sedes</span>
        <div class="plan-name">Med Premium</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt">17,700</span><sub>MXN / mes</sub></div>
        <div class="plan-note">$974 USD · + $389 de instalación, una sola vez</div>
        <div class="plan-note">Incluye el sistema de gestión, plan Clínica (valor $149/mes)</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf" style="font-weight:700;color:var(--zm-white);">Publicidad</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Med Growth, sin límite de campañas</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Estrategia por sede y por especialidad</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Posicionamiento en búsquedas locales</div>
          <div class="pf" style="font-weight:700;color:var(--zm-white);margin-top:6px;">Contenido</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>16 piezas al mes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Sesión de producción en tu consultorio</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Guion y edición de video incluidos</div>
          <div class="pf" style="font-weight:700;color:var(--zm-white);margin-top:6px;">Acompañamiento</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Ejecutivo de cuenta dedicado</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Llamada de estrategia cada quince días</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Capacitación a tu recepción</div>
        </div>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="plan-btn btn-plan-pro" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'mkt_premium'});">Hablar de Premium →</a>
        <p class="plan-fine">// Sin permanencia · Cancela con 30 días de aviso</p>
      </div>

    </div>
    <div style="max-width:680px;margin:28px auto 0;text-align:center;">
      <p style="font-size:13px;color:var(--zm-muted);line-height:1.7;"><strong>Lo que no incluye:</strong> la inversión publicitaria en Meta y Google se paga aparte y directo a la plataforma, con tu propia tarjeta. Nosotros no la marcamos ni cobramos comisión sobre ella. Recomendamos empezar con $150 a $300 USD al mes según tu ciudad y especialidad.</p>
    </div>
  </div>
</section>

<!-- 04 — CONTRA QUÉ SE COMPARA -->
<section class="problems">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 04 — Contra qué se compara</p>
      <h2 class="section-title">Lo que ya gastas en el mismo problema</h2>
      <p class="section-sub">La decisión real no es entre nosotros y una agencia. Es entre pagar por atraer pacientes con el seguimiento incluido, o pagar por una de las dos mitades por separado.</p>
    </div>
    <div class="prob-grid reveal-group">
      <div class="prob-card">
        <div class="leak-num-label" style="margin-bottom:8px;">Contratar recepción de medio turno</div>
        <div class="leak-num" style="color:var(--zm-ink);font-size:26px;">$6,000 <span style="font-size:13px;font-weight:600;color:var(--zm-muted);">MXN / mes</span></div>
        <div class="prob-desc" style="margin-top:8px;">Sueldo y prestaciones, sin campañas ni contenido.</div>
        <span class="prob-tag" style="color:var(--zm-muted);background:var(--zm-line2);border-color:var(--zm-line);">Qué te da: contesta en horario de oficina</span>
      </div>
      <div class="prob-card">
        <div class="leak-num-label" style="margin-bottom:8px;">Agencia tradicional más barata</div>
        <div class="leak-num" style="color:var(--zm-ink);font-size:26px;">$3,000 <span style="font-size:13px;font-weight:600;color:var(--zm-muted);">MXN / mes</span></div>
        <div class="prob-desc" style="margin-top:8px;">Solo gestión de pauta, con contrato anual.</div>
        <span class="prob-tag" style="color:var(--zm-muted);background:var(--zm-line2);border-color:var(--zm-line);">Qué te da: reporta alcance y clics</span>
      </div>
      <div class="prob-card" style="border-color:var(--zm-g-mid);background:#f0fdf4;">
        <div class="leak-num-label" style="margin-bottom:8px;">Med Starter</div>
        <div class="leak-num" style="color:var(--zm-g3);font-size:26px;">$5,900 <span style="font-size:13px;font-weight:600;color:var(--zm-muted);">MXN / mes</span></div>
        <div class="prob-desc" style="margin-top:8px;">Campañas, contenido y el sistema, incluidos.</div>
        <span class="prob-tag" style="color:var(--zm-g3);background:var(--zm-g-soft);border-color:#bbf7d0;">Qué te da: reporta pacientes y facturación</span>
      </div>
    </div>
    <p style="text-align:center;margin-top:24px;font-size:11px;color:var(--zm-muted2);font-family:'IBM Plex Mono',monospace;">LA INVERSIÓN PUBLICITARIA EN META Y GOOGLE VA APARTE EN LOS TRES CASOS Y SE PAGA DIRECTO A LA PLATAFORMA. PRECIOS EN PESOS MEXICANOS CON TIPO DE CAMBIO REFERENCIAL; EL COBRO SE HACE EN DÓLARES.</p>
  </div>
</section>

<!-- 05 — COMPARATIVA -->
<section class="problems" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 05 — Comparativa</p>
      <h2 class="section-title">Qué cambia entre un plan y otro</h2>
    </div>
    <div class="reveal compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th></th><th>Med Starter · $324/mes</th><th class="highlight">Med Growth · $519/mes</th><th>Med Premium · $974/mes</th></tr></thead>
        <tbody>
          <tr><td>Instalación, una sola vez</td><td>$129</td><td class="highlight">$259</td><td>$389</td></tr>
          <tr><td>Sistema de gestión incluido</td><td>Plan Profesional</td><td class="highlight">Plan Clínica</td><td>Plan Clínica</td></tr>
          <tr><td>Campañas activas a la vez</td><td>1</td><td class="highlight">3</td><td>Sin límite</td></tr>
          <tr><td>Plataformas</td><td>Meta</td><td class="highlight">Meta y Google</td><td>Meta, Google y local</td></tr>
          <tr><td>Piezas de contenido al mes</td><td>4</td><td class="highlight">8</td><td>16</td></tr>
          <tr><td>Página de aterrizaje</td><td class="bad">No</td><td class="highlight good">Por especialidad</td><td class="good">Por sede</td></tr>
          <tr><td>Producción de video en tu consultorio</td><td class="bad">No</td><td class="highlight bad">No</td><td class="good">Sí</td></tr>
          <tr><td>Frecuencia de optimización</td><td>Mensual</td><td class="highlight">Semanal</td><td>Semanal</td></tr>
          <tr><td>Llamada de estrategia</td><td class="bad">No</td><td class="highlight good">Mensual</td><td class="good">Cada 15 días</td></tr>
          <tr><td>Ejecutivo de cuenta dedicado</td><td class="bad">No</td><td class="highlight bad">No</td><td class="good">Sí</td></tr>
          <tr><td>Capacitación a recepción</td><td class="bad">No</td><td class="highlight bad">No</td><td class="good">Sí</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- 06 — LO QUE NO PROMETEMOS -->
<section class="problems" style="background:var(--zm-dark-panel);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label" style="color:rgba(74,222,90,.7);">// 06 — Lo que no prometemos</p>
      <h2 class="section-title" style="color:var(--zm-white);">Cuatro cosas que otras agencias te van a prometer y nosotros no</h2>
      <p class="section-sub" style="color:rgba(255,255,255,.5);">Si alguien te garantiza un número de pacientes antes de ver tu ciudad, tu especialidad y tu competencia, está adivinando. Preferimos decirte esto antes de que actives el servicio.</p>
    </div>
    <div class="limit-grid dark reveal-group">
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <div class="limit-title">Un número exacto de pacientes</div>
        <div class="limit-text">Depende de tu ciudad, tu ticket y de cuántos espacios libres tengas. Damos un rango después del diagnóstico, no antes.</div>
      </div>
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="limit-title">Resultados en la primera semana</div>
        <div class="limit-text">Las campañas necesitan datos para aprender. El primer mes es de calibración; el segundo es el que cuenta.</div>
      </div>
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></div>
        <div class="limit-title">Que funcione con la agenda desordenada</div>
        <div class="limit-text">Si los mensajes no se contestan, la pauta solo acelera la pérdida. Por eso el sistema de gestión va incluido y no aparte.</div>
      </div>
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <div class="limit-title">Quedarnos con tus cuentas</div>
        <div class="limit-text">El píxel, las cuentas de anuncios y el contenido son tuyos desde el primer día. Si te vas, se queda todo contigo.</div>
      </div>
    </div>
  </div>
</section>

<!-- 07 — RESULTADOS -->
<section class="testi" id="resultados">
  <div class="wrap">
    <div class="testi-header reveal">
      <p class="section-label">// 07 — Resultados</p>
      <h2 class="section-title">Tres consultorios, tres números</h2>
      <p class="section-sub" style="margin:0 auto;text-align:center;">Cada cifra sale del panel del propio consultorio, publicada con su autorización.</p>
    </div>
    <div class="testi-grid reveal-group">
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Ya tenía la agenda ordenada con el sistema. Lo que faltaba era gente nueva entrando, y eso empezó en la segunda semana de campaña."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          31 pacientes nuevos · Mes 2
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dcfce7;color:#15803d;">RM</div>
          <div>
            <div class="testi-name">Dr. Rodrigo M.</div>
            <div class="testi-role">Odontología · Bogotá · Growth</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Antes pagaba una agencia que me mandaba reportes de alcance. Aquí veo el paciente, la cita y lo que facturó."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          $168 costo por paciente nuevo
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dbeafe;color:#1d4ed8;">LV</div>
          <div>
            <div class="testi-name">Dra. Lucía V.</div>
            <div class="testi-role">Dermatología · Medellín · Growth</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Cada sede tiene su propia campaña y su propia página. Sé exactamente cuál de las dos está trayendo más pacientes."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          2 sedes con campañas separadas
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#f3e8ff;color:#7e22ce;">CE</div>
          <div>
            <div class="testi-name">Dr. Carlos E.</div>
            <div class="testi-role">Ortopedia · Cali · Premium</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 08 — INCLUIDO EN LOS TRES PLANES -->
<section class="solution" style="background:var(--zm-dark-panel);">
  <div class="wrap">
    <div class="reveal" style="max-width:700px;margin:0 auto;text-align:center;">
      <p class="section-label" style="color:rgba(74,222,90,.7);">// 08 — Incluido en los tres planes</p>
      <h2 class="section-title" style="color:var(--zm-white);">Aquí es donde tu pauta deja de desperdiciarse</h2>
      <p class="section-sub" style="color:rgba(255,255,255,.5);margin:14px auto 0;">Una agencia te entrega mensajes y ahí termina. Los planes incluyen Zentro Med, el sistema donde vive la agenda y el WhatsApp del consultorio. Es lo que convierte ese mensaje en una cita, y lo que nos permite decirte cuántos pacientes te trajimos de verdad.</p>
    </div>
    <div class="reveal" style="display:flex;justify-content:center;gap:32px;flex-wrap:wrap;margin:36px 0;text-align:center;">
      <div><div class="stat-n2">4 de 10</div><div class="stat-l2">mensajes de pauta llegan fuera de horario</div></div>
      <div><div class="stat-n2">&lt;1 min</div><div class="stat-l2">tarda Zen en contestarlos</div></div>
      <div><div class="stat-n2">1 de 5</div><div class="stat-l2">citas se cae sin confirmación automática</div></div>
      <div><div class="stat-n2"><span>$0</span></div><div class="stat-l2">extra: viene en los tres planes</div></div>
    </div>
    <div class="fx-grid reveal-group">
      <div class="fx-card" style="background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.08);">
        <div class="fx-icon"><i data-lucide="calendar-check"></i></div>
        <div class="fx-title" style="color:var(--zm-white);">Agenda y citas</div>
        <div class="fx-desc" style="color:rgba(255,255,255,.5);">La cita se crea sola desde el chat y sin dobles reservas.</div>
      </div>
      <div class="fx-card" style="background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.08);">
        <div class="fx-icon"><i data-lucide="message-circle"></i></div>
        <div class="fx-title" style="color:var(--zm-white);">WhatsApp del consultorio</div>
        <div class="fx-desc" style="color:rgba(255,255,255,.5);">Todos los mensajes en una bandeja que ve tu equipo.</div>
      </div>
      <div class="fx-card" style="background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.08);">
        <div class="fx-icon"><i data-lucide="bot"></i></div>
        <div class="fx-title" style="color:var(--zm-white);">Zen contestando de noche</div>
        <div class="fx-desc" style="color:rgba(255,255,255,.5);">Responde precios y agenda aunque el consultorio esté cerrado.</div>
      </div>
      <div class="fx-card" style="background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.08);">
        <div class="fx-icon"><i data-lucide="receipt"></i></div>
        <div class="fx-title" style="color:var(--zm-white);">Expediente y cobros</div>
        <div class="fx-desc" style="color:rgba(255,255,255,.5);">Ficha por paciente, presupuestos y link de pago.</div>
      </div>
    </div>
    <div class="reveal" style="text-align:center;margin-top:32px;">
      <a href="/" class="btn btn-ghost-dark">Ver todo lo que hace el sistema →</a>
    </div>
  </div>
</section>

<!-- 09 — PREGUNTAS -->
<section class="faq" id="preguntas">
  <div class="wrap">
    <div class="faq-header reveal">
      <p class="section-label">// 09 — Preguntas</p>
      <h2 class="section-title">Lo que preguntan antes de contratar</h2>
      <p class="section-sub" style="margin:0 auto 8px;text-align:center;">El diagnóstico es gratis y sin compromiso: revisamos tu ciudad, tu competencia y tu agenda actual antes de proponerte un plan.</p>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-dark btn-sm" style="margin-top:8px;">Hablar con un estratega</a>
    </div>
    <div class="faq-grid">
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Me voy a ver como charlatán por hacer publicidad?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Es la duda que más escuchamos y es legítima: está en juego tu reputación profesional. Nuestro trabajo es que te veas profesional, no llamativo. No publicamos promesas de resultados clínicos, no usamos antes y después engañosos, no inventamos testimonios y no prometemos curas. Cada pieza pasa por tu aprobación antes de salir, y lo que no te representa no se publica.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Por qué incluyen el sistema de gestión en el precio?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Porque sin él la pauta no funciona. Si generamos 40 mensajes al mes y nadie los contesta a tiempo, tiramos tu dinero. El sistema es lo que hace que esos mensajes se vuelvan citas y que podamos medir cuántos pacientes te trajimos de verdad. No es un extra de venta: es el requisito para que esto sirva.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Cuánto debo invertir en pauta además del plan?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Para un consultorio en una ciudad mediana, entre $3,000 y $8,000 pesos al mes es un punto de partida razonable. Ese dinero se paga directo a Meta o Google y no cobramos comisión sobre él. En el diagnóstico te decimos el rango que tiene sentido para tu ciudad y tu competencia.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Los anuncios y las cuentas quedan a mi nombre?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí, todo. La cuenta publicitaria, el píxel, las páginas de aterrizaje y los datos históricos son tuyos desde el primer día. Nosotros trabajamos con acceso, no con propiedad. Si un día te vas, revocas el acceso y te quedas con el activo completo, incluido el aprendizaje acumulado de las campañas.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Qué pasa si ya tengo una agencia?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Es común y no hay que apurar nada. En el diagnóstico revisamos qué se hizo, qué está funcionando y qué no, y te decimos con honestidad si vale la pena mover algo. Si tu agencia va bien encaminada, te lo decimos. Si el problema no es la pauta sino que los mensajes se quedan sin contestar, eso también te lo decimos, porque es lo que más vemos.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Puedo pausar el servicio un mes?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Al ser suscripción mensual puedes pausar avisando con 30 días, por ejemplo si te vas de vacaciones o si tu agenda ya está llena. Al pausar, las campañas se apagan y el sistema del consultorio se mantiene: no pierdes historial, pacientes ni conversaciones. Al reactivar, retomamos con el aprendizaje que ya tenían los anuncios.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Funciona para mi especialidad y mi ciudad?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Depende más de tu ciudad, tu competencia y tu capacidad de atención que de la especialidad en sí. Hoy trabajamos con odontología, dermatología, ortopedia, oftalmología, psicología y medicina estética. En el diagnóstico te decimos claro si aplica, y si creemos que no vale la pena en tu caso, te lo decimos antes de cobrarte.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Quién aprueba el contenido antes de publicarse?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Tú, siempre. Cada pieza llega a tu bandeja de aprobación con la vista previa de cómo se va a publicar. Apruebas, comentas o pides cambios, y nada sale sin tu visto bueno. Lo que no te representa no se publica, aunque tenga buen rendimiento.</div></div>
      </div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="wrap">
    <p class="section-label" style="color:rgba(14,124,74,.7);margin-bottom:16px;">// Empieza hoy</p>
    <h2>Empieza con un diagnóstico,<br><span>no con un contrato.</span></h2>
    <p>Revisamos tu ciudad, tu especialidad y tu agenda, y te decimos si vale la pena invertir en pauta o si primero conviene ordenar el seguimiento.</p>
    <div class="cta-btns">
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'mkt_cta_final'});">Agendar diagnóstico gratis</a>
      <a href="/" class="btn btn-ghost-light btn-lg">Ver solo el sistema</a>
    </div>
    <p class="cta-note">// Sin contratos · Sin permanencia · Cancela con 30 días de aviso</p>
    <p style="max-width:820px;margin:36px auto 0;font-size:10.5px;line-height:1.8;color:var(--zm-muted2);font-family:'IBM Plex Mono',monospace;">Los precios de marketing no incluyen la inversión publicitaria en Meta ni en Google, que se paga directo a la plataforma y sobre la cual no cobramos comisión. El valor del plan del sistema de gestión incluido se descuenta una sola vez por cuenta. Las cifras de resultados son de clientes activos en sus primeros 90 días y varían según ciudad, especialidad, ticket promedio y capacidad de atención. No garantizamos un número de pacientes nuevos. La instalación se cobra una sola vez al inicio y no es reembolsable una vez entregada. Sin permanencia: puedes cancelar con 30 días de aviso y los activos publicitarios quedan en tus cuentas. Zentro Med es software de gestión comercial y no es un sistema de expediente clínico.</p>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="foot-i">
      <span style="color:var(--zm-muted2);">© 2026 Zentro Labs · <a href="https://zentrolabs.com">zentrolabs.com</a></span>
      <span><a href="https://zentrolabs.com/privacidad.html">Privacidad</a> · <a href="https://zentrolabs.com/terminos.html">Términos</a> · <a href="mailto:hello@zentrolabs.com">hello@zentrolabs.com</a></span>
    </div>
  </div>
</footer>

<!-- WHATSAPP FLOAT -->
<a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="wa-float" aria-label="Escríbenos por WhatsApp">
  <img src="https://cdn.simpleicons.org/whatsapp/ffffff" width="26" height="26" alt="WhatsApp">
</a>

<!-- MOBILE STICKY CTA -->
<div class="mob-cta">
  <div class="mob-cta-info">
    <span class="mob-cta-price">Diagnóstico gratis</span>
    <span class="mob-cta-sub">Sin costo · Sin compromiso</span>
  </div>
  <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-green" style="font-size:13px;padding:10px 16px;flex-shrink:0;" onclick="if(typeof gtag!=='undefined')gtag('event','mobile_sticky_cta_click',{event_category:'cta',event_label:'mkt_sticky_bar_mobile'});">Agendar →</a>
</div>
`;
