// Static content for the Zentro Med Marketing landing (src/app/marketing/page.tsx).
// Sibling to src/app/landing-content.ts — same raw-HTML-string architecture,
// same landing.css design system, same LANDING_BEHAVIOR_SCRIPT (mobile menu,
// FAQ accordion, scroll-reveal, currency switcher — all generic DOM-query
// based, nothing landing-page-specific, so it's imported rather than
// duplicated). Uses an indigo accent (#818cf8/#a5b4fc) instead of the CRM
// root landing's green, to read as "a related but separate service" —
// same typography/spacing/card patterns, different accent, matching how
// the CRM root landing's own cross-sell section already introduces this
// same indigo for Zentro Med Marketing.

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
      <a href="/marketing" class="logo">
        <img src="/zentro-isotipo.png" alt="" style="height:26px;width:26px;">
        <span class="logo-text">zentro</span>
        <span class="logo-badge" style="background:rgba(129,140,248,.15);color:#818cf8;">Med Marketing</span>
      </a>
      <div class="nav-r">
        <a href="#por-que" class="nav-link">Por qué Zentro</a>
        <a href="#como-funciona" class="nav-link">Cómo funciona</a>
        <a href="#planes" class="nav-link">Planes</a>
        <a href="#faq" class="nav-link">Preguntas</a>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="nav-login" aria-label="Auditoría gratis por WhatsApp">
          <img src="https://cdn.simpleicons.org/whatsapp/818cf8" width="16" height="16" alt="" style="display:block;">
          <span class="nav-login-text">Auditoría gratis</span>
        </a>
        <a href="#planes" class="btn btn-sm nav-cta-btn" style="background:#1e1b4b;color:#fff;">Empezar →</a>
        <button class="mob-menu-btn" onclick="zmToggleMobMenu()" aria-label="Abrir menú" aria-expanded="false" id="mobMenuBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <div class="mob-menu-panel" id="mobMenuPanel">
    <a href="#por-que" class="mob-menu-link" onclick="zmCloseMobMenu()">Por qué Zentro</a>
    <a href="#como-funciona" class="mob-menu-link" onclick="zmCloseMobMenu()">Cómo funciona</a>
    <a href="#planes" class="mob-menu-link" onclick="zmCloseMobMenu()">Planes</a>
    <a href="#faq" class="mob-menu-link" onclick="zmCloseMobMenu()">Preguntas</a>
    <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="mob-menu-link" onclick="zmCloseMobMenu()">Auditoría gratis</a>
    <a href="#planes" class="btn btn-sm mob-menu-cta" style="background:#1e1b4b;color:#fff;" onclick="zmCloseMobMenu()">Empezar →</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <div class="hero-eyebrow">
      <span class="pill-dark" style="background:rgba(129,140,248,.12);color:#a5b4fc;border-color:rgba(129,140,248,.25);"><span class="dot-green" style="background:#818cf8;"></span>Marketing para consultorios</span>
      <span class="pill-dark" style="background:rgba(245,158,11,.1);color:#fcd34d;border-color:rgba(245,158,11,.2);">⚡ Auditoría lista en 24h · sin compromiso</span>
    </div>
    <h1>Tu equipo de marketing para atraer<br><span style="color:#a5b4fc;">pacientes nuevos</span>, sin contratar personal.</h1>
    <p class="hero-sub">Estrategia, contenido, campañas en Meta y Google, y reportes — gestionados por un equipo dedicado a consultorios médicos. <strong style="color:rgba(255,255,255,.85);">Tu Zentro CRM viene incluido</strong>, sin pagar dos veces.</p>
    <div class="hero-proof">
      <div class="proof-avatars">
        <div class="proof-av" style="background:#e0e7ff;color:#4338ca;">LV</div>
        <div class="proof-av" style="background:#dbeafe;color:#1d4ed8;">CE</div>
        <div class="proof-av" style="background:#f3e8ff;color:#7e22ce;">AM</div>
        <div class="proof-av" style="background:rgba(129,140,248,.2);color:#818cf8;">+</div>
      </div>
      <span class="proof-stars">★★★★★</span>
      <span class="proof-text">Parte de los <strong>+120 negocios</strong> que ya crecen con Zentro Labs</span>
    </div>
    <div class="hero-ctas">
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-lg" style="background:#818cf8;color:#1e1b4b;" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'mkt_hero_primary'});">Solicitar auditoría gratis →</a>
      <a href="#planes" class="btn btn-ghost-light btn-lg">Ver planes</a>
    </div>
    <p class="hero-note">// En 24h recibes tu diagnóstico · Sin costo · Sin compromiso</p>

    <div class="reveal" style="max-width:900px;margin:36px auto 0;">
      <img
        src="/landing/marketing-dashboard.png"
        width="1680"
        height="954"
        alt="Dashboard de Zentro Med Marketing mostrando ROAS, pacientes nuevos, costo por lead y canales activos en Meta Ads, Google Ads, Instagram y TikTok"
        style="width:100%;height:auto;display:block;"
        loading="eager"
        fetchpriority="high"
      >
    </div>
  </div>
</section>

<!-- STATS BAR -->
<div class="stats-bar" style="background:var(--zm-night);border-color:rgba(255,255,255,.07);">
  <div class="wrap">
    <div class="stats-bar-inner">
      <div class="stat-item">
        <div class="stat-n2" style="color:#a5b4fc;"><span>3.2x</span></div>
        <div class="stat-l2">ROAS promedio en campañas activas*</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2" style="color:#a5b4fc;"><span>−54%</span></div>
        <div class="stat-l2">reducción en costo por paciente potencial*</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2" style="color:#a5b4fc;"><span>5 días</span></div>
        <div class="stat-l2">configuración inicial garantizada†</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2" style="color:#a5b4fc;"><span>+41%</span></div>
        <div class="stat-l2">incremento en citas agendadas · primer trimestre*</div>
      </div>
    </div>
  </div>
  <p class="stats-note">* Basado en promedio de clientes activos de Zentro Labs (todas las industrias). Los resultados varían según especialidad, ciudad y presupuesto de pauta. No garantizamos métricas específicas.<br>† Configuración de cuentas y canales en 5 días hábiles. La activación de campañas está sujeta a aprobación de Meta y Google — un proceso externo que puede tomar de 5 a 14 días adicionales, y que revisa con especial atención a los anunciantes del sector salud.</p>
</div>

<!-- TRUST STRIP -->
<section style="padding:32px 0;border-bottom:1px solid var(--zm-line);">
  <div class="wrap">
    <div class="trust-inner">
      <span class="trust-label">Trabajamos con</span>
      <div class="trust-logos" style="filter:none;">
        <div class="trust-logo" style="color:var(--zm-ink2);"><img src="https://cdn.simpleicons.org/meta/818cf8" width="24" height="24" alt="Meta Ads" style="display:block;">Meta Ads</div>
        <div class="trust-logo" style="color:var(--zm-ink2);"><img src="https://cdn.simpleicons.org/googleads/818cf8" width="24" height="24" alt="Google Ads" style="display:block;">Google Ads</div>
        <div class="trust-logo" style="color:var(--zm-ink2);"><img src="https://cdn.simpleicons.org/instagram/818cf8" width="24" height="24" alt="Instagram" style="display:block;">Instagram</div>
        <div class="trust-logo" style="color:var(--zm-ink2);"><img src="https://cdn.simpleicons.org/whatsapp/818cf8" width="24" height="24" alt="WhatsApp Business" style="display:block;">WhatsApp Business</div>
      </div>
    </div>
  </div>
</section>

<!-- POR QUÉ ZENTRO (comparación) -->
<section class="diff-section" id="por-que">
  <div class="wrap">
    <div class="diff-header reveal">
      <p class="section-label">// Por qué Zentro</p>
      <h2 class="section-title">Suscripción vs. agencia tradicional vs. hacerlo tú mismo</h2>
    </div>
    <div class="reveal" style="overflow-x:auto;margin-top:32px;">
      <table style="width:100%;min-width:640px;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid var(--zm-line);">
            <th style="text-align:left;padding:12px 10px;color:var(--zm-muted);font-weight:700;"></th>
            <th style="text-align:left;padding:12px 10px;color:#818cf8;font-weight:800;">Zentro Med Marketing</th>
            <th style="text-align:left;padding:12px 10px;color:var(--zm-muted);font-weight:700;">Agencia tradicional</th>
            <th style="text-align:left;padding:12px 10px;color:var(--zm-muted);font-weight:700;">Hacerlo tú mismo</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--zm-line);">
            <td style="padding:14px 10px;color:var(--zm-ink2);font-weight:600;">Tiempo hasta la primera campaña</td>
            <td style="padding:14px 10px;color:var(--zm-ink);font-weight:700;">Configuración en 5 días†</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">3–6 semanas</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">Depende de tu tiempo libre</td>
          </tr>
          <tr style="border-bottom:1px solid var(--zm-line);">
            <td style="padding:14px 10px;color:var(--zm-ink2);font-weight:600;">Costo mensual estimado</td>
            <td style="padding:14px 10px;color:var(--zm-ink);font-weight:700;">$249–$749 USD</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">$1,500–$4,000 USD</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">$300–$800 USD (freelancer part-time)</td>
          </tr>
          <tr style="border-bottom:1px solid var(--zm-line);">
            <td style="padding:14px 10px;color:var(--zm-ink2);font-weight:600;">Conoce políticas de publicidad en salud</td>
            <td style="padding:14px 10px;color:var(--zm-ink);font-weight:700;">Sí — evita rechazos de Meta/Google por claims médicos</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">Rara vez especializada en salud</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">Aprende a la fuerza, con campañas rechazadas</td>
          </tr>
          <tr style="border-bottom:1px solid var(--zm-line);">
            <td style="padding:14px 10px;color:var(--zm-ink2);font-weight:600;">Tu CRM de pacientes</td>
            <td style="padding:14px 10px;color:var(--zm-ink);font-weight:700;">Incluido en el plan, sin pagar aparte</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">No incluido</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">No incluido</td>
          </tr>
          <tr style="border-bottom:1px solid var(--zm-line);">
            <td style="padding:14px 10px;color:var(--zm-ink2);font-weight:600;">Reportes y métricas</td>
            <td style="padding:14px 10px;color:var(--zm-ink);font-weight:700;">Dashboard en tiempo real</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">Informe mensual, a veces</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">Sin reportes estructurados</td>
          </tr>
          <tr>
            <td style="padding:14px 10px;color:var(--zm-ink2);font-weight:600;">Compromisos contractuales</td>
            <td style="padding:14px 10px;color:var(--zm-ink);font-weight:700;">Sin contratos · Cancela cuando quieras</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">Contrato de 6–12 meses</td>
            <td style="padding:14px 10px;color:var(--zm-muted);">Ninguno, pero tampoco continuidad</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- PROBLEMAS -->
<section class="problems" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// El problema</p>
      <h2 class="section-title">Tu agenda no debería depender de la suerte</h2>
    </div>
    <div class="reveal" style="max-width:900px;margin:0 auto 40px;">
      <img
        src="/landing/vs-comparison.png"
        width="1680"
        height="954"
        alt="Comparación entre un consultorio sin marketing gestionado, con caos y agenda en declive, y un consultorio con Zentro Med Marketing, con campañas activas y pacientes nuevos creciendo"
        style="width:100%;height:auto;display:block;"
        loading="lazy"
      >
    </div>
    <div class="prob-grid reveal-group">
      <div class="prob-card">
        <div class="prob-icon">
          <i data-lucide="trending-down"></i>
        </div>
        <div class="prob-title">Tu agenda depende 100% del boca a boca</div>
        <div class="prob-desc">Sin un canal propio de atracción, cada mes empieza de cero — dependes de que alguien te recomiende, no de un sistema que trabaje por ti.</div>
        <span class="prob-tag">Crecimiento impredecible</span>
      </div>
      <div class="prob-card">
        <div class="prob-icon">
          <i data-lucide="help-circle"></i>
        </div>
        <div class="prob-title">No sabes cuánto te cuesta cada paciente nuevo</div>
        <div class="prob-desc">Sin métricas claras, es imposible saber si lo que inviertes en atraer pacientes realmente vale la pena — o si estás perdiendo dinero sin darte cuenta.</div>
        <span class="prob-tag">Gasto sin visibilidad</span>
      </div>
      <div class="prob-card">
        <div class="prob-icon">
          <i data-lucide="eye-off"></i>
        </div>
        <div class="prob-title">Tu competencia ya está en Instagram y Google</div>
        <div class="prob-desc">Mientras tu consultorio espera referidos, otros ya están apareciendo primero cuando un paciente potencial busca ayuda — y se quedan con esa cita.</div>
        <span class="prob-tag">Visibilidad perdida</span>
      </div>
    </div>
  </div>
</section>

<!-- CÓMO FUNCIONA -->
<section class="problems" id="como-funciona">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// Cómo funciona</p>
      <h2 class="section-title">De cero a campañas activas, en 4 pasos</h2>
    </div>
    <div class="reveal" style="max-width:900px;margin:0 auto 40px;">
      <img
        src="/landing/hero-product.png"
        width="1680"
        height="954"
        alt="Equipo de Zentro Med Marketing — estratega, ads manager, content creator, CRM y agenda, y WhatsApp con IA — activo en 5 días"
        style="width:100%;height:auto;display:block;"
        loading="lazy"
      >
    </div>
    <div class="prob-grid reveal-group">
      <div class="prob-card">
        <span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#818cf8;margin-bottom:8px;">01</span>
        <div class="prob-title">Auditoría gratuita</div>
        <div class="prob-desc">Revisamos tu presencia digital actual, tu competencia y tu potencial de crecimiento — sin costo y sin compromiso.</div>
      </div>
      <div class="prob-card">
        <span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#818cf8;margin-bottom:8px;">02</span>
        <div class="prob-title">Estrategia + plan</div>
        <div class="prob-desc">Definimos objetivos, presupuesto sugerido y el mix de canales (Meta, Google, contenido) según tu especialidad y ciudad.</div>
      </div>
      <div class="prob-card">
        <span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#818cf8;margin-bottom:8px;">03</span>
        <div class="prob-title">Configuración en 5 días†</div>
        <div class="prob-desc">Cuentas publicitarias, píxeles, tu CRM y tu WhatsApp quedan conectados y listos para lanzar campañas.</div>
      </div>
      <div class="prob-card">
        <span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#818cf8;margin-bottom:8px;">04</span>
        <div class="prob-title">Crecimiento mensual</div>
        <div class="prob-desc">Optimizamos campañas cada semana, te entregamos reportes claros y ajustamos la estrategia según lo que realmente funciona.</div>
      </div>
    </div>
  </div>
</section>

<!-- QUÉ INCLUYE -->
<section class="problems" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// Tu suscripción incluye</p>
      <h2 class="section-title">Todo lo que necesitas para crecer, en un solo lugar</h2>
    </div>
    <div class="prob-grid reveal-group">
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="file-text"></i></div>
        <div class="prob-title">Contenido educativo para pacientes</div>
        <div class="prob-desc">Piezas y stories pensadas para explicar tus servicios sin sonar a venta agresiva — el tono correcto para salud.</div>
      </div>
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="target"></i></div>
        <div class="prob-title">Campañas en Meta Ads y Google Ads</div>
        <div class="prob-desc">Configuradas, optimizadas y ajustadas semanalmente por un equipo que conoce las políticas de publicidad en salud.</div>
      </div>
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="bar-chart-3"></i></div>
        <div class="prob-title">Dashboard de métricas en tiempo real</div>
        <div class="prob-desc">ROAS, costo por paciente potencial y citas agendadas, siempre visibles — sin esperar un informe mensual.</div>
      </div>
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="globe"></i></div>
        <div class="prob-title">Sitio o mini-sitio con agendamiento</div>
        <div class="prob-desc">Una página propia optimizada para convertir visitas en citas agendadas, no solo en visitas.</div>
      </div>
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="message-circle"></i></div>
        <div class="prob-title">WhatsApp con IA, sobre tu mismo CRM</div>
        <div class="prob-desc">Los pacientes que llegan por tus campañas caen directo en el mismo WhatsApp y CRM que ya usas — nada duplicado.</div>
      </div>
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="calendar-check"></i></div>
        <div class="prob-title">Sesiones de estrategia mensuales</div>
        <div class="prob-desc">Revisamos resultados contigo y ajustamos el rumbo — no es una campaña que corre sola sin que nadie la mire.</div>
      </div>
    </div>
  </div>
</section>

<!-- POR ESPECIALIDAD -->
<section class="problems">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// Especialidades</p>
      <h2 class="section-title">Cada especialidad se anuncia distinto. Nosotros ya sabemos cómo.</h2>
      <p class="section-sub">Meta y Google tienen reglas distintas según qué tratas — conocerlas de antemano evita rechazos de campaña y meses perdidos.</p>
    </div>
    <div class="prob-grid reveal-group">
      <div class="prob-card">
        <div class="prob-title">Dermatología estética</div>
        <span class="prob-tag" style="background:rgba(239,68,68,.1);color:#dc2626;border-color:rgba(239,68,68,.2);">Restricción alta</span>
        <div class="prob-desc" style="margin-top:10px;">
          <ul style="margin:0;padding-left:16px;line-height:1.6;">
            <li>Fotos de antes/después con límites bajo las políticas vigentes de Meta para tratamientos como Botox o rellenos — usamos contenido educativo y testimonios en texto en su lugar.</li>
            <li>Segmentación 18+ obligatoria y sin remarketing por audiencias personalizadas de salud.</li>
          </ul>
        </div>
      </div>
      <div class="prob-card">
        <div class="prob-title">Medicina estética</div>
        <span class="prob-tag" style="background:rgba(239,68,68,.1);color:#dc2626;border-color:rgba(239,68,68,.2);">Restricción alta</span>
        <div class="prob-desc" style="margin-top:10px;">
          <ul style="margin:0;padding-left:16px;line-height:1.6;">
            <li>La categoría más regulada de las cuatro — evitamos mensajes que exploten inseguridades, construyendo campañas alrededor de confianza y resultados.</li>
            <li>Mismo límite de remarketing y edad mínima que dermatología estética.</li>
          </ul>
        </div>
      </div>
      <div class="prob-card">
        <div class="prob-title">Odontología</div>
        <span class="prob-tag" style="background:rgba(74,222,90,.1);color:#16a34a;border-color:rgba(74,222,90,.2);">Restricción baja</span>
        <div class="prob-desc" style="margin-top:10px;">
          <ul style="margin:0;padding-left:16px;line-height:1.6;">
            <li>Se trata mayormente como categoría estándar de negocio local — foco en SEO local y campañas de conversión directa a cita.</li>
            <li>Cuidado con frases tipo "¿tienes dientes amarillos?" (violan política de atributos personales).</li>
          </ul>
        </div>
      </div>
      <div class="prob-card">
        <div class="prob-title">Ortopedia y fisioterapia</div>
        <span class="prob-tag" style="background:rgba(74,222,90,.1);color:#16a34a;border-color:rgba(74,222,90,.2);">Restricción baja</span>
        <div class="prob-desc" style="margin-top:10px;">
          <ul style="margin:0;padding-left:16px;line-height:1.6;">
            <li>Tratada como servicio de salud general, sin límites de antes/después ni edad mínima de segmentación.</li>
            <li>El reto real es el ciclo de decisión más largo, no las restricciones publicitarias.</li>
          </ul>
        </div>
      </div>
    </div>
    <p class="reveal" style="text-align:center;margin-top:32px;font-size:13px;color:var(--zm-muted);max-width:640px;margin-left:auto;margin-right:auto;">¿Tu especialidad no está aquí? Trabajamos con cualquier especialidad médica — antes de tu primera campaña auditamos las políticas publicitarias específicas de tu categoría, así evitamos rechazos desde el día uno.</p>
    <!-- Nota interna: las restricciones de antes/después y límites de remarketing citadas arriba se basan en reportes de cumplimiento de terceros, no en texto citado directamente de Meta (sus páginas de políticas bloquean el scraping). Confirmar manualmente en el Meta Business Help Center antes de considerarlas definitivas. -->
  </div>
</section>

<!-- CROSS-SELL: CRM INCLUIDO -->
<section class="solution" style="background:var(--zm-night);">
  <div class="wrap">
    <div class="solution-grid reverse">
      <div class="solution-visual">
        <img
          src="/landing/crm-dashboard.png"
          width="1680"
          height="954"
          alt="Zentro CRM — WhatsApp, agenda y pipeline de pacientes, incluido en tu plan de Zentro Med Marketing"
          style="width:100%;height:auto;display:block;"
          loading="lazy"
        >
      </div>
      <div class="solution-copy">
        <p class="section-label" style="color:#a5b4fc;">// Sin pagar dos veces</p>
        <h2 class="section-title" style="color:var(--zm-white);">¿Ya tienes Zentro CRM? No pagas dos veces.</h2>
        <p class="section-sub" style="color:rgba(255,255,255,.5);">Cada plan de Zentro Med Marketing incluye tu suscripción de Zentro CRM al nivel correspondiente. Si ya la tienes activa por separado, el valor de tu plan actual se descuenta del precio de Marketing — nunca pagas lo mismo dos veces. Si aún no la tienes, se activa automáticamente sobre la misma cuenta.</p>
        <div style="border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px 18px;margin-top:20px;background:rgba(255,255,255,.03);">
          <div style="font-size:13px;font-weight:800;color:var(--zm-white);">Zentro CRM</div>
          <div style="font-size:12.5px;color:rgba(255,255,255,.55);margin-top:4px;">WhatsApp, agenda, pacientes e IA — también disponible solo, desde $39/mes</div>
        </div>
        <a href="https://med.zentrolabs.com/#planes" class="btn btn-lg" style="background:#818cf8;color:#1e1b4b;margin-top:20px;">Conocer Zentro CRM →</a>
      </div>
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section class="testi">
  <div class="wrap">
    <div class="testi-header reveal">
      <p class="section-label">// Resultados reales</p>
      <h2 class="section-title">Lo que dicen nuestros clientes</h2>
    </div>
    <div class="testi-grid reveal-group">
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"En dos meses las campañas de Meta Ads ya se pagaban solas. Lo que más valoro es que entienden las restricciones de publicidad en estética — nunca tuvimos un anuncio rechazado."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          +3.1x ROAS en Meta Ads · Mes 2
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#e0e7ff;color:#4338ca;">LV</div>
          <div>
            <div class="testi-name">Dra. Lucía V.</div>
            <div class="testi-role">Dermatóloga · Medellín</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Pasamos de 3 a 15 pacientes por semana en el primer mes. La configuración fue rápida y el equipo entendió exactamente qué necesitaba un consultorio de ortopedia."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          De 3 a 15 pacientes/semana · Mes 1
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dbeafe;color:#1d4ed8;">CE</div>
          <div>
            <div class="testi-name">Dr. Carlos E.</div>
            <div class="testi-role">Ortopedista · Cali</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"El dashboard en tiempo real me cambió la forma de ver el marketing del consultorio — ya sé exactamente cuánto me cuesta cada paciente nuevo, algo que antes no tenía forma de medir."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          −54% costo por paciente potencial · Google Ads
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#f3e8ff;color:#7e22ce;">AM</div>
          <div>
            <div class="testi-name">Dra. Ana M.</div>
            <div class="testi-role">Odontóloga · Ciudad de México</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="planes">
  <div class="wrap">
    <div class="pricing-header reveal">
      <span style="display:inline-block;background:rgba(129,140,248,.1);color:#818cf8;border:1px solid rgba(129,140,248,.25);border-radius:20px;padding:5px 14px;font-size:11.5px;font-weight:700;margin-bottom:14px;">🚀 Precio de lanzamiento — válido para los primeros 50 consultorios inscritos</span>
      <p class="section-label">// Planes</p>
      <h2 class="section-title">Un plan para cada etapa de crecimiento</h2>
    </div>
    <div class="plans-grid reveal-group" style="max-width:920px;">

      <!-- MED STARTER -->
      <div class="plan-card">
        <span class="plan-badge" style="background:rgba(129,140,248,.1);color:#818cf8;border-color:rgba(129,140,248,.25);">Med Starter</span>
        <div class="plan-name">Med Starter</div>
        <div class="plan-price"><span style="text-decoration:line-through;color:var(--zm-muted2);font-size:16px;font-weight:600;margin-right:6px;">$298</span><sup class="price-sym">$</sup><span class="price-amt">249</span><sub>/mes</sub></div>
        <div class="plan-note">+ setup $99 · Incluye tu CRM Profesional (valor $79)</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>8 piezas de contenido al mes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>4 sets de stories al mes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>1 campaña de Meta Ads gestionada</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Landing de especialidad con SEO local</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Reporte mensual automático</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Soporte por WhatsApp en 48h</div>
        </div>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="plan-btn" style="background:rgba(129,140,248,.1);color:#818cf8;" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'mkt_starter'});">Elegir Med Starter →</a>
        <p class="plan-fine">// Sin contratos · Cancela cuando quieras</p>
      </div>

      <!-- MED GROWTH -->
      <div class="plan-card featured" style="border-color:rgba(129,140,248,.5);">
        <div class="plan-chip" style="background:#818cf8;color:#1e1b4b;">⭐ Recomendado</div>
        <div class="plan-name">Med Growth</div>
        <div class="plan-price"><span style="text-decoration:line-through;color:var(--zm-muted2);font-size:16px;font-weight:600;margin-right:6px;">$498</span><sup class="price-sym">$</sup><span class="price-amt">399</span><sub>/mes</sub></div>
        <div class="plan-note">+ setup $199 · Incluye tu CRM Clínica (valor $149)</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Starter, más:</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>12 piezas + 3 reels al mes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Meta Ads + Google Ads con A/B testing</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Mini-sitio completo con agendamiento</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Dashboard actualizado semanalmente</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Sesión de estrategia mensual (30 min)</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Soporte por WhatsApp en 24h</div>
        </div>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="plan-btn" style="background:#818cf8;color:#1e1b4b;" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'mkt_growth'});">Elegir Med Growth →</a>
        <p class="plan-fine">// Sin contratos · Cancela cuando quieras</p>
      </div>

      <!-- MED PREMIUM -->
      <div class="plan-card dark-card">
        <span class="plan-badge" style="background:rgba(129,140,248,.15);color:#a5b4fc;border-color:rgba(129,140,248,.3);">Med Premium</span>
        <div class="plan-name">Med Premium</div>
        <div class="plan-price"><span style="text-decoration:line-through;color:rgba(255,255,255,.3);font-size:16px;font-weight:600;margin-right:6px;">$899</span><sup class="price-sym">$</sup><span class="price-amt">749</span><sub>/mes</sub></div>
        <div class="plan-note">+ setup $299 · Incluye tu CRM Clínica (valor $149)</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Growth, más:</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>20 piezas + 6 reels/stories mensuales</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Meta + Google + TikTok Ads + remarketing</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>SEO local avanzado por especialidad</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>2 sesiones de estrategia mensuales</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Account manager exclusivo (resp. 4h)</div>
        </div>
        <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="plan-btn" style="background:#818cf8;color:#1e1b4b;" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'mkt_premium'});">Elegir Med Premium →</a>
        <p class="plan-fine">// Sin contratos · Cancela cuando quieras</p>
      </div>

    </div>
    <div style="max-width:680px;margin:28px auto 0;text-align:center;">
      <p style="font-size:13px;color:var(--zm-muted);line-height:1.7;">El presupuesto de pauta publicitaria (lo que pagas directo a Meta o Google) <strong>no está incluido</strong> en la suscripción — va desde tu propia cuenta y tú tienes control total. La suscripción cubre estrategia, gestión, contenido y optimización. Así no hay conflicto de interés: nos va bien cuando a tu consultorio le va bien.</p>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq" id="faq">
  <div class="wrap">
    <div class="faq-header reveal">
      <p class="section-label">// Preguntas frecuentes</p>
      <h2 class="section-title">Todo lo que quieres saber</h2>
    </div>
    <div class="faq-grid">
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿El presupuesto de anuncios está incluido en la suscripción?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">No. Tu suscripción cubre estrategia, gestión, contenido y optimización. El presupuesto que se invierte directamente en Meta o Google va desde tu propia cuenta publicitaria, bajo tu control total — así evitamos cualquier conflicto de interés entre lo que nos pagas a nosotros y lo que gastas en pauta.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">Ya tengo Zentro CRM por separado, ¿pago dos veces?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">No. El valor de tu plan actual de Zentro CRM se descuenta del precio de tu plan de Marketing — nunca pagas lo mismo dos veces. Todo corre sobre la misma cuenta.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Cumplen con las políticas de publicidad médica de Meta y Google?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Antes de tu primera campaña auditamos las políticas específicas de tu especialidad (las reglas cambian bastante entre, por ejemplo, medicina estética y odontología) para evitar rechazos y cuentas suspendidas desde el día uno.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Cuánto tiempo hasta ver los primeros resultados?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">La configuración toma 5 días hábiles, pero la activación de campañas depende de la aprobación de Meta y Google — un proceso externo que puede tomar de 5 a 14 días adicionales, especialmente para anunciantes del sector salud. Los primeros datos de rendimiento suelen verse en las primeras 2 a 4 semanas de campaña activa.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Necesito dar mi tarjeta para el trial de 7 días?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">La auditoría inicial de 24h no requiere tarjeta ni compromiso alguno — es un diagnóstico gratuito. Solo pedimos datos de pago al activar un plan de suscripción.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Trabajan con cualquier especialidad?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Ya tenemos experiencia directa en dermatología, medicina estética, odontología, ortopedia y fisioterapia — y para cualquier otra especialidad, auditamos sus políticas publicitarias específicas antes de la primera campaña.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Puedo cambiar de plan o cancelar después?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. No hay contratos de permanencia — puedes subir, bajar o cancelar tu plan cuando quieras. Solo el setup inicial no es reembolsable, ya que corresponde a trabajo de configuración ya realizado.</div></div>
      </div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="wrap">
    <p class="section-label" style="color:rgba(129,140,248,.7);margin-bottom:16px;">// Empieza hoy</p>
    <h2>Solicita tu auditoría gratis<br><span style="color:#a5b4fc;">y decide con datos, no con suposiciones.</span></h2>
    <p>Diagnóstico en 24h, sin costo y sin compromiso. Tu Zentro CRM viene incluido en cualquier plan.</p>
    <div class="cta-btns">
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-lg" style="background:#818cf8;color:#1e1b4b;" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'mkt_cta_final'});">Solicitar auditoría gratis →</a>
      <a href="#planes" class="btn btn-ghost-light btn-lg">Ver planes</a>
    </div>
    <div class="reveal" style="max-width:300px;aspect-ratio:4/3;border:1px dashed rgba(255,255,255,.2);border-radius:12px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:11.5px;text-align:center;padding:16px;margin:32px auto 0;">// Ilustración pendiente — profesional de salud revisando un reporte de crecimiento (4:3)</div>
    <p class="cta-note">// Sin tarjeta para la auditoría · Sin contratos · Cancela cuando quieras</p>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="foot-i">
      <span style="color:rgba(255,255,255,.3);">© 2026 Zentro Labs · <a href="https://zentrolabs.com">zentrolabs.com</a></span>
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
    <span class="mob-cta-price">Auditoría gratis</span>
    <span class="mob-cta-sub">Sin costo · Diagnóstico en 24h</span>
  </div>
  <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn" style="background:#818cf8;color:#1e1b4b;font-size:13px;padding:10px 16px;flex-shrink:0;" onclick="if(typeof gtag!=='undefined')gtag('event','mobile_sticky_cta_click',{event_category:'cta',event_label:'mkt_sticky_bar_mobile'});">Empezar →</a>
</div>
`;
