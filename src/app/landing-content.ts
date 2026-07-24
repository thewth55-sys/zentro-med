// Static content for the public marketing landing (src/app/page.tsx).
// Also used verbatim by src/app/crm/page.tsx — /crm redirects to / now
// that both pages share one design (see crm/page.tsx's own comment).
// Split out from the page component so the ~40KB of embedded
// CSS/HTML/script string constants aren't all resident in the
// same module as the component + its imports — keeps each
// module's build-time footprint smaller (webpack processes/GCs
// modules more granularly), which matters on memory-constrained
// build containers (see next.config.ts's cpus:1 comment for the
// full history of this project's Docker build memory tuning).

export const STRUCTURED_DATA = {
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
      "@id": "https://med.zentrolabs.com/#service",
      name: "CRM Comercial para Consultorios",
      provider: { "@id": "https://med.zentrolabs.com/#organization" },
      description:
        "Software de gestión comercial para consultorios: CRM de contactos, agenda online 24/7, WhatsApp con IA y automatizaciones. Marketing digital disponible por separado bajo Zentro Med Marketing.",
      serviceType: "Software CRM para Salud",
      areaServed: ["CO", "MX", "AR", "CL", "PE", "GT"],
    },
  ],
};

export const LANDING_BODY_HTML = `
<!-- NAV -->
<nav>
  <div class="wrap">
    <div class="nav-i">
      <a href="/" class="logo">
        <img src="/zentro-isotipo.png" alt="" style="height:26px;width:26px;">
        <span class="logo-text">zentro</span>
        <span class="logo-badge">Med</span>
      </a>
      <div class="nav-r">
        <a href="#como" class="nav-link">Cómo funciona</a>
        <a href="#planes" class="nav-link">Planes</a>
        <a href="#marketing" class="nav-link">Marketing</a>

        <!-- Currency Switcher -->
        <div class="curr-switch" id="currSwitch">
          <button class="curr-btn" onclick="zmToggleCurr(event)" aria-label="Cambiar moneda">
            <span id="currFlag">🇺🇸</span>
            <span id="currCode">USD</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="curr-dropdown">
            <button class="curr-opt curr-active" data-curr="USD" onclick="zmSetCurr('USD')">
              <span class="curr-flag">🇺🇸</span><span class="curr-name">USD</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="MXN" onclick="zmSetCurr('MXN')">
              <span class="curr-flag">🇲🇽</span><span class="curr-name">MXN</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="COP" onclick="zmSetCurr('COP')">
              <span class="curr-flag">🇨🇴</span><span class="curr-name">COP</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="ARS" onclick="zmSetCurr('ARS')">
              <span class="curr-flag">🇦🇷</span><span class="curr-name">ARS</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="GTQ" onclick="zmSetCurr('GTQ')">
              <span class="curr-flag">🇬🇹</span><span class="curr-name">GTQ</span><span class="curr-sym">Q</span>
            </button>
          </div>
        </div>

        <a href="/login" class="nav-login" aria-label="Iniciar sesión">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          <span class="nav-login-text">Iniciar sesión</span>
        </a>
        <a href="/signup" class="btn btn-green btn-sm">Probar 30 días gratis →</a>
        <button class="mob-menu-btn" onclick="zmToggleMobMenu()" aria-label="Abrir menú" aria-expanded="false" id="mobMenuBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <div class="mob-menu-panel" id="mobMenuPanel">
    <a href="#como" class="mob-menu-link" onclick="zmCloseMobMenu()">Cómo funciona</a>
    <a href="#planes" class="mob-menu-link" onclick="zmCloseMobMenu()">Planes</a>
    <a href="#marketing" class="mob-menu-link" onclick="zmCloseMobMenu()">Marketing</a>
    <a href="/login" class="mob-menu-link" onclick="zmCloseMobMenu()">Iniciar sesión</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <div class="hero-eyebrow">
      <span class="pill-dark"><span class="dot-green"></span>El CRM hecho para consultorios médicos</span>
      <span class="pill-dark" style="background:rgba(245,158,11,.1);color:#fcd34d;border-color:rgba(245,158,11,.2);">⚡ 30 días gratis · sin tarjeta</span>
    </div>
    <h1>Tu consultorio, organizado.<br><span class="green">Sin caos administrativo.</span></h1>
    <p class="hero-sub">WhatsApp, agenda, pacientes e IA en un solo lugar — para que dejes de perder citas y pacientes por falta de seguimiento. <strong style="color:rgba(255,255,255,.85);">Sin contratar personal extra.</strong></p>
    <div class="hero-proof">
      <div class="proof-avatars">
        <div class="proof-av" style="background:#dcfce7;color:#15803d;">DR</div>
        <div class="proof-av" style="background:#dbeafe;color:#1d4ed8;">DL</div>
        <div class="proof-av" style="background:#f3e8ff;color:#7e22ce;">CE</div>
        <div class="proof-av" style="background:rgba(74,222,90,.2);color:var(--zm-g);">+</div>
      </div>
      <span class="proof-stars">★★★★★</span>
      <span class="proof-text"><strong>+80 consultorios</strong> ya gestionan con Zentro Med</span>
    </div>
    <div class="hero-ctas">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'hero_primary'});">Probar 30 días gratis →</a>
      <a href="#planes" class="btn btn-ghost-light btn-lg">Ver planes</a>
    </div>
    <p class="hero-note">// Sin tarjeta · Configuración en 24h · Cancela cuando quieras</p>

    <!-- Hero UI Widgets — muestra contexto del producto sin necesitar imagen -->
    <p style="text-align:center;font-size:10.5px;color:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace;margin-bottom:8px;">// Ejemplos ilustrativos del producto</p>
    <div class="hero-widgets">
      <!-- Widget: cita confirmada (CRM) -->
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(74,222,90,.1);">
          <svg viewBox="0 0 24 24" stroke="var(--zm-g)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>
        </div>
        <div>
          <div class="hw-title">Cita confirmada</div>
          <div class="hw-sub">Dr. Martínez · Hoy 3:00pm · WhatsApp ✓</div>
        </div>
      </div>
      <!-- Widget: reactivación automática (CRM) -->
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(59,130,246,.1);">
          <svg viewBox="0 0 24 24" stroke="#60a5fa"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </div>
        <div>
          <div class="hw-title">Reactivación automática</div>
          <div class="hw-sub">12 pacientes sin cita en 90 días · mensaje enviado</div>
        </div>
      </div>
      <!-- Widget: no-shows reducidos -->
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(37,211,102,.1);">
          <img src="https://cdn.simpleicons.org/whatsapp/25D366" width="15" height="15" alt="WA" style="display:block;">
        </div>
        <div>
          <div class="hw-title">Recordatorio enviado</div>
          <div class="hw-sub">−54% no-shows en promedio*</div>
        </div>
      </div>
    </div>

    <!-- MOCKUP: bandeja de WhatsApp del CRM -->
    <div class="mockui reveal" style="max-width:820px;margin:36px auto 0;">
      <div class="mockui-bar">
        <span class="mockui-bardot" style="background:#ef4444;"></span>
        <span class="mockui-bardot" style="background:#f59e0b;"></span>
        <span class="mockui-bardot" style="background:#22c55e;"></span>
        <span class="mockui-url">app.zentrolabs.com/inbox</span>
      </div>
      <div class="mockui-body">
        <div class="mockui-inbox">
          <div class="mockui-row active">
            <div class="mockui-avatar" style="background:#dcfce7;color:#15803d;">MR</div>
            <div class="mockui-row-txt"><div class="mockui-row-name">María R.</div><div class="mockui-row-msg">Perfecto, ahí estaré 👍</div></div>
            <span class="mockui-row-time">10:42</span>
          </div>
          <div class="mockui-row">
            <div class="mockui-avatar" style="background:#dbeafe;color:#1d4ed8;">JC</div>
            <div class="mockui-row-txt"><div class="mockui-row-name">Julián C.</div><div class="mockui-row-msg">¿Tienen cupo mañana?</div></div>
            <span class="mockui-row-time">09:15</span>
            <span class="mockui-row-dot"></span>
          </div>
          <div class="mockui-row">
            <div class="mockui-avatar" style="background:#f3e8ff;color:#7e22ce;">AL</div>
            <div class="mockui-row-txt"><div class="mockui-row-name">Ana L.</div><div class="mockui-row-msg">Gracias por el recordatorio</div></div>
            <span class="mockui-row-time">Ayer</span>
          </div>
        </div>
        <div class="mockui-chat">
          <div class="mockui-bubble in">Hola, ¿me confirman mi cita del jueves 3pm?</div>
          <div class="mockui-bubble auto">🤖 ¡Claro! Tu cita con Dr. Martínez está confirmada para el jueves a las 3:00pm. Te escribimos 24h antes para recordarte.</div>
          <div class="mockui-bubble in">Perfecto, ahí estaré 👍</div>
        </div>
      </div>
    </div>
    <p class="mockui-caption">// Así se ve la bandeja de WhatsApp de Zentro CRM</p>

  </div>
</section>

<!-- STATS BAR -->
<div class="stats-bar" style="background:var(--zm-night);border-color:rgba(255,255,255,.07);">
  <div class="wrap">
    <div class="stats-bar-inner">
      <div class="stat-item">
        <div class="stat-n2"><span>+80</span></div>
        <div class="stat-l2">consultorios usan Zentro CRM</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2"><span>−54%</span></div>
        <div class="stat-l2">reducción de no-shows con WhatsApp IA*</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2">24h</div>
        <div class="stat-l2">activación del CRM y agenda†</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2"><span>30</span></div>
        <div class="stat-l2">días de prueba, sin tarjeta</div>
      </div>
    </div>
  </div>
  <p class="stats-note">* Promedio de clientes activos en los primeros 90 días. Resultados individuales varían según especialidad y volumen de pacientes. No garantizamos métricas específicas.<br>† Activación del CRM y agenda en 24h. WhatsApp, IA y automatizaciones se activan al elegir un plan pago (Esencial, Profesional o Clínica).</p>
</div>

<!-- TRUST STRIP -->
<div class="trust-section">
  <div class="wrap">
    <div class="trust-inner">
      <span class="trust-label">Integrado con</span>
      <div class="trust-logos">
        <div class="trust-logo"><img src="https://cdn.simpleicons.org/whatsapp/4ade5a" width="28" height="28" alt="WhatsApp" style="display:block;">WhatsApp Cloud API</div>
        <div class="trust-div"></div>
        <div class="trust-logo"><img src="https://cdn.simpleicons.org/googlecalendar/4ade5a" width="28" height="28" alt="Google Calendar" style="display:block;">Google Calendar<span style="font-size:9px;color:rgba(255,255,255,.3);margin-left:2px;">· Profesional+</span></div>
      </div>
    </div>
  </div>
</div>

<!-- DIFERENCIADOR: CRM PURO -->
<section class="diff-section">
  <div class="wrap">
    <div class="diff-header reveal">
      <p class="section-label" style="color:rgba(74,222,90,.6);">// Por qué Zentro CRM</p>
      <h2 class="section-title" style="color:var(--zm-white);">Construido para consultorios.<br>No reciclado de un CRM de ventas.</h2>
      <p class="section-sub" style="color:rgba(255,255,255,.45);margin:12px auto 0;">La mayoría de consultorios organiza pacientes en WhatsApp, Excel o un cuaderno. Zentro CRM reemplaza los tres — sin la curva de aprendizaje de un CRM genérico.</p>
    </div>
    <div class="diff-cols reveal-group">

      <div class="diff-col diff-col-good">
        <div class="diff-col-label">
          <div class="diff-icon">✓</div>
          <span>Zentro CRM</span>
        </div>
        <ul class="diff-list">
          <li class="diff-item">
            <div class="diff-dot">✓</div>
            <span class="diff-item-text"><strong>WhatsApp compartido</strong> con historial completo por paciente, para todo el equipo</span>
          </li>
          <li class="diff-item">
            <div class="diff-dot">✓</div>
            <span class="diff-item-text"><strong>Agenda online 24/7</strong> sincronizada con Google Calendar — los pacientes agendan solos</span>
          </li>
          <li class="diff-item">
            <div class="diff-dot">✓</div>
            <span class="diff-item-text"><strong>IA</strong> que responde y agenda automáticamente, con traspaso a humano cuando se necesita <span style="color:rgba(255,255,255,.35);font-size:11px;">(Profesional y Clínica)</span></span>
          </li>
          <li class="diff-item">
            <div class="diff-dot">✓</div>
            <span class="diff-item-text">Recordatorios automáticos en todos los planes; <strong>automatización de reactivación</strong> sin que nadie tenga que acordarse <span style="color:rgba(255,255,255,.35);font-size:11px;">(Profesional y Clínica)</span></span>
          </li>
          <li class="diff-item">
            <div class="diff-dot">✓</div>
            <span class="diff-item-text">Un solo lugar para todo el equipo, <strong>con roles y permisos</strong> por persona</span>
          </li>
        </ul>
      </div>

    </div>
    <!-- Comparación visual: caos disperso vs. bandeja organizada -->
    <div class="reveal" style="max-width:860px;margin:32px auto 0;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="border-radius:16px;border:1px solid rgba(239,68,68,.15);background:rgba(239,68,68,.03);">
        <div class="mockui-chaos">
          <span class="mockui-chaos-chip" style="--r:-4deg;">📓 Libreta de citas</span>
          <span class="mockui-chaos-chip" style="--r:3deg;">💬 WhatsApp personal</span>
          <span class="mockui-chaos-chip" style="--r:-2deg;">📊 Excel desordenado</span>
          <span class="mockui-chaos-chip" style="--r:5deg;">🗒️ Notas sueltas</span>
        </div>
        <p class="mockui-caption" style="color:rgba(239,68,68,.5);">// Antes: información en 4 lugares distintos</p>
      </div>
      <div class="mockui">
        <div class="mockui-bar">
          <span class="mockui-bardot" style="background:#ef4444;"></span>
          <span class="mockui-bardot" style="background:#f59e0b;"></span>
          <span class="mockui-bardot" style="background:#22c55e;"></span>
          <span class="mockui-url">Zentro CRM</span>
        </div>
        <div class="mockui-agenda">
          <div class="mockui-agenda-row"><span class="mockui-agenda-time">9:00</span><span class="mockui-agenda-name">Ana L.</span><span class="mockui-agenda-pill ok">Confirmada</span></div>
          <div class="mockui-agenda-row"><span class="mockui-agenda-time">10:30</span><span class="mockui-agenda-name">Julián C.</span><span class="mockui-agenda-pill pending">Pendiente</span></div>
          <div class="mockui-agenda-row"><span class="mockui-agenda-time">15:00</span><span class="mockui-agenda-name">María R.</span><span class="mockui-agenda-pill ok">Confirmada</span></div>
        </div>
      </div>
    </div>

    <div class="diff-bottom reveal">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'differentiator'});">Probar 30 días gratis →</a>
      <p class="diff-price-note">// Sin tarjeta · Setup en 24h · Cancela cuando quieras</p>
    </div>
  </div>
</section>

<!-- PROBLEMS -->
<section class="problems">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// El problema</p>
      <h2 class="section-title">Los 3 problemas que frenan tu consultorio</h2>
      <p class="section-sub">Si tu agenda depende del boca a boca y tu WhatsApp es un caos, no estás solo.</p>
    </div>
    <div class="prob-grid reveal-group">
      <div class="prob-card">
        <div class="prob-icon">
          <i data-lucide="user-x"></i>
        </div>
        <div class="prob-title">Pacientes que no regresan</div>
        <div class="prob-desc">Sin seguimiento automático, el paciente que no agenda su próxima cita simplemente desaparece. Recuperarlo después cuesta 5 veces más que retenerlo.</div>
        <span class="prob-tag">Pérdida de retención</span>
      </div>
      <div class="prob-card">
        <div class="prob-icon">
          <i data-lucide="message-circle-warning"></i>
        </div>
        <div class="prob-title">WhatsApp desbordado</div>
        <div class="prob-desc">Confirmaciones manuales, citas por mensaje, recordatorios uno a uno. El WhatsApp del consultorio se convierte en un caos que consume horas cada día.</div>
        <span class="prob-tag">Caos operativo</span>
      </div>
      <div class="prob-card">
        <div class="prob-icon">
          <i data-lucide="folder-x"></i>
        </div>
        <div class="prob-title">Información dispersa en 3 lugares</div>
        <div class="prob-desc">El historial del paciente vive en WhatsApp, la cita en una libreta y el cobro en otro sistema. Nadie del equipo ve el cuadro completo.</div>
        <span class="prob-tag">Datos fragmentados</span>
      </div>
    </div>
  </div>
</section>

<!-- SOLUTION: CRM -->
<section class="solution" id="como">
  <div class="wrap">
    <div class="solution-grid">
      <div class="solution-visual">
        <!-- MOCKUP: agenda del día -->
        <div class="mockui">
          <div class="mockui-bar">
            <span class="mockui-bardot" style="background:#ef4444;"></span>
            <span class="mockui-bardot" style="background:#f59e0b;"></span>
            <span class="mockui-bardot" style="background:#22c55e;"></span>
            <span class="mockui-url">app.zentrolabs.com/agenda</span>
          </div>
          <div class="mockui-agenda">
            <div class="mockui-agenda-row"><span class="mockui-agenda-time">8:30</span><span class="mockui-agenda-name">Carlos E.</span><span class="mockui-agenda-pill ok">Confirmada</span></div>
            <div class="mockui-agenda-row"><span class="mockui-agenda-time">9:15</span><span class="mockui-agenda-name">Lucía V.</span><span class="mockui-agenda-pill ok">Confirmada</span></div>
            <div class="mockui-agenda-row"><span class="mockui-agenda-time">11:00</span><span class="mockui-agenda-name">Rodrigo M.</span><span class="mockui-agenda-pill pending">Pendiente</span></div>
            <div class="mockui-agenda-row"><span class="mockui-agenda-time">15:30</span><span class="mockui-agenda-name">Diana P.</span><span class="mockui-agenda-pill ok">Confirmada</span></div>
          </div>
        </div>
        <p class="mockui-caption">// Agenda de hoy · Zentro CRM</p>
        <div>
          <p class="sol-tag">// Zentro Med CRM</p>
          <p class="sol-title">La operación de tu consultorio, organizada</p>
        </div>
        <div class="feature-row">
          <div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="feat-text"><strong>WhatsApp compartido</strong> — Toda la comunicación del consultorio centralizada, con respuestas automáticas para citas y recordatorios.</div>
        </div>
        <div class="feature-row">
          <div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="feat-text"><strong>Seguimiento de contactos</strong> — Nuevo prospecto → primera cita → seguimiento → reactivación. Sin que nadie se pierda en el camino.</div>
        </div>
        <div class="feature-row">
          <div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="feat-text"><strong>Agenda online 24/7</strong> — Los pacientes agendan solos. Recordatorio automático 24h antes. Sin llamadas manuales.</div>
        </div>
        <div class="feature-row">
          <div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="feat-text"><strong>Perfil del contacto</strong> — Historial de citas, comunicaciones y notas de seguimiento por persona. Accesible desde cualquier dispositivo. <span style="color:rgba(255,255,255,.35);font-size:12px;">(No es historia clínica)</span></div>
        </div>
        <div class="feature-row">
          <div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="feat-text"><strong>Cotizaciones y cobros</strong> — Genera propuestas de servicio y registra pagos desde el mismo sistema que la agenda.</div>
        </div>
      </div>
      <div class="solution-copy">
        <p class="section-label">// CRM para consultorios</p>
        <h2 class="section-title">Un sistema que trabaja mientras tú consultas</h2>
        <p class="section-sub">Zentro Med gestiona la parte comercial y operativa del consultorio para que tú te concentres en el paciente. No en el WhatsApp.</p>
        <div class="benefit-list">
          <div class="benefit-item">
            <div class="benefit-num">1</div>
            <div class="benefit-text">
              <h3>Reducción de no-shows</h3>
              <p>Los recordatorios automáticos por WhatsApp reducen los no-shows en un 54% en promedio.* Sin que nadie tenga que llamar.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">2</div>
            <div class="benefit-text">
              <h3>Más reactivaciones</h3>
              <p>Identifica pacientes que no han vuelto en 30, 60 o 90 días y reactívalos automáticamente con un mensaje personalizado.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">3</div>
            <div class="benefit-text">
              <h3>Equipo alineado</h3>
              <p>Médicos, recepcionistas y administrativos ven lo mismo en tiempo real. Sin hojas de cálculo ni cuadernos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SOLUTION: IA -->
<section class="solution" id="ia" style="background:#f8faf9;">
  <div class="wrap">
    <div class="solution-grid reverse">
      <div class="solution-visual">
        <div class="mockui-chat" style="gap:10px;">
          <div class="mockui-bubble in">Hola, ¿tienen cita disponible esta semana y cuánto cuesta la consulta?</div>
          <div class="mockui-bubble auto">🤖 Sí — tengo espacio el jueves 10:00am o viernes 4:00pm. La consulta general cuesta $80.000. ¿Cuál te queda mejor?</div>
          <div class="mockui-bubble in">Viernes 4pm está perfecto</div>
          <div class="mockui-bubble auto">🤖 Listo, quedas agendada el viernes 4:00pm con el Dr. Martínez. Te escribo 24h antes para confirmar.</div>
          <div class="mockui-bubble in">Otra cosa, ¿me puede ver algo que me está doliendo hace días o mejor voy directo?</div>
          <div class="mockui-bubble auto">🤖 Eso lo debe evaluar directamente el Dr. Martínez — te conecto con él ahora mismo para que te oriente. 👨‍⚕️</div>
        </div>
        <p class="mockui-caption" style="margin-top:14px;">// Incluida en tu plan — no necesitas cuentas propias en OpenAI ni Anthropic</p>
      </div>
      <div class="solution-copy">
        <p class="section-label">// Tu agente de IA en WhatsApp</p>
        <h2 class="section-title">Un agente que contesta, agenda y sabe cuándo pasarte el chat</h2>
        <p class="section-sub">Zentro Med pone la infraestructura de IA — el agente responde preguntas frecuentes, confirma o reagenda citas, y transfiere la conversación a una persona del equipo apenas el caso lo requiere.</p>
        <div class="benefit-list">
          <div class="benefit-item">
            <div class="benefit-num">1</div>
            <div class="benefit-text">
              <h3>Responde con el contexto de tu consultorio</h3>
              <p>Configuras precios, horarios y preguntas frecuentes una vez; el agente los usa en cada conversación.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">2</div>
            <div class="benefit-text">
              <h3>Agenda dentro de la misma conversación</h3>
              <p>Confirma, reagenda o cancela citas sin que nadie del equipo tenga que intervenir manualmente.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">3</div>
            <div class="benefit-text">
              <h3>Sabe cuándo pasarte el chat</h3>
              <p>Si el paciente pregunta algo clínico o fuera de guion, el agente transfiere la conversación a una persona — no improvisa.</p>
            </div>
          </div>
        </div>
        <p style="font-size:12px;color:var(--zm-muted2);font-family:'JetBrains Mono',monospace;line-height:1.7;margin-top:4px;">// Esencial incluye hasta 300 borradores/mes; Profesional hasta 2.000 respuestas/mes; Clínica hasta 6.000 respuestas/mes. En Esencial el agente redacta un borrador que revisas antes de enviar; en Profesional y Clínica responde y agenda de forma autónoma, 24/7. ¿Necesitas más? Puedes ampliar tu cuota sin cambiar de plan.</p>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES OVERVIEW -->
<section class="problems" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// Todo lo que incluye</p>
      <h2 class="section-title">Un sistema, no seis pestañas abiertas</h2>
      <p class="section-sub">Esto es lo que vive dentro de Zentro CRM — sin herramientas sueltas que mantener por separado.</p>
    </div>
    <div class="fx-grid reveal-group">
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="calendar-check"></i></div>
        <div class="fx-title">Agenda inteligente</div>
        <div class="fx-desc">Agenda online 24/7 con página pública de citas, sincronizada con Google Calendar, y recordatorio automático 24h antes de cada cita.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="users"></i></div>
        <div class="fx-title">Gestión de pacientes</div>
        <div class="fx-desc">Pipeline visual desde primer contacto hasta paciente recurrente, con seguimiento y reactivación automática de quienes dejaron de agendar.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="receipt"></i></div>
        <div class="fx-title">Presupuestos y cobros</div>
        <div class="fx-desc">Genera cotizaciones y registra pagos sin salir del sistema — todo queda ligado a la ficha del paciente y a su cita.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="history"></i></div>
        <div class="fx-title">Historial del paciente</div>
        <div class="fx-desc">Cada contacto tiene su ficha con citas pasadas, comunicaciones y notas de seguimiento, accesible para todo el equipo. <span style="color:var(--zm-muted2);font-size:12px;">(No es historia clínica)</span></div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="building-2"></i></div>
        <div class="fx-title">Multi-consultorio y multi-clínica</div>
        <div class="fx-desc">Administra la agenda de varios profesionales o varias sedes desde una sola cuenta, con vistas y permisos filtrados por consultorio.</div>
        <span class="fx-tag">Clínica</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="message-circle"></i></div>
        <div class="fx-title">WhatsApp compartido</div>
        <div class="fx-desc">Bandeja de equipo con historial completo por paciente — el mismo hilo de conversación, visible para todo el consultorio.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
    </div>
  </div>
</section>

<!-- MID-PAGE CTA STRIP -->
<div class="mid-cta reveal">
  <div class="wrap">
    <div class="mid-cta-inner">
      <div>
        <p class="mid-cta-pre">// ¿Convencido hasta aquí?</p>
        <p class="mid-cta-head">Empieza gratis hoy — suma WhatsApp, IA y automatizaciones al elegir tu plan.</p>
      </div>
      <a href="/signup" class="btn btn-green btn-lg" style="flex-shrink:0;" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'mid_page'});">Probar 30 días gratis →</a>
    </div>
  </div>
</div>

<!-- HOW IT WORKS -->
<section class="how">
  <div class="wrap">
    <div class="how-header reveal">
      <p class="section-label">// Cómo funciona</p>
      <h2 class="section-title">De cero a consultorio digital en una semana</h2>
    </div>
    <div class="how-steps reveal-group">
      <div class="how-step">
        <div class="step-num">1</div>
        <div class="step-title">Prueba gratis</div>
        <div class="step-desc">Activa tu cuenta en 2 minutos. 30 días con funciones básicas, sin tarjeta.</div>
      </div>
      <div class="how-step">
        <div class="step-num">2</div>
        <div class="step-title">Setup en 24h</div>
        <div class="step-desc">Tu estratega configura WhatsApp, agenda y CRM. Tú solo nos dices cómo funciona tu consultorio.</div>
      </div>
      <div class="how-step">
        <div class="step-num">3</div>
        <div class="step-title">Tu equipo lo adopta</div>
        <div class="step-desc">Recepción, médicos y administrativos usan el mismo sistema. Automatizaciones activas desde el día 1.</div>
      </div>
      <div class="how-step">
        <div class="step-num">4</div>
        <div class="step-title">Menos caos, más seguimiento</div>
        <div class="step-desc">Recordatorios y reactivaciones corren solas. Tú decides cuándo — si quieres — sumar Zentro Med Marketing.</div>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="planes">
  <div class="wrap">
    <div class="pricing-header reveal">
      <p class="section-label">// Planes</p>
      <h2 class="section-title">Un CRM. Un plan gratis. Tres niveles pagos.</h2>
    </div>
    <p class="pricing-sub-note">// Sin setup · Sin permanencia · Cancela cuando quieras</p>
    <div class="reveal fitme-grid">
      <div style="border:1px solid var(--zm-line);border-radius:12px;padding:14px 16px;background:var(--zm-surface);">
        <div style="font-size:11px;font-weight:800;color:var(--zm-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">¿Es para mí? — Prueba gratuita</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Quieres ver cómo se siente el sistema antes de pagar — sin WhatsApp ni IA todavía.</div>
      </div>
      <div style="border:1px solid var(--zm-line);border-radius:12px;padding:14px 16px;background:var(--zm-surface);">
        <div style="font-size:11px;font-weight:800;color:var(--zm-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">¿Es para mí? — Esencial</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Trabajas solo o con 1 persona más, y solo necesitas ordenar WhatsApp y la agenda.</div>
      </div>
      <div style="border:1px solid var(--zm-g-mid);border-radius:12px;padding:14px 16px;background:#f0fdf4;">
        <div style="font-size:11px;font-weight:800;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">¿Es para mí? — Profesional</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Tienes recepcionista y quieres que la IA y las automatizaciones hagan el seguimiento por ti.</div>
      </div>
      <div style="border:1px solid var(--zm-line);border-radius:12px;padding:14px 16px;background:var(--zm-surface);">
        <div style="font-size:11px;font-weight:800;color:var(--zm-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">¿Es para mí? — Clínica</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Varios especialistas o sedes, y necesitas roles, API o integraciones propias.</div>
      </div>
    </div>
    <div class="plans-grid reveal-group">

      <!-- PRUEBA GRATUITA -->
      <div class="plan-card">
        <span class="plan-badge badge-free">30 días gratis</span>
        <div class="plan-name">Prueba gratuita</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="0">0</span><sub>/mes</sub></div>
        <div class="plan-note">Sin tarjeta de crédito</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Pipeline de pacientes (CRM)</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Agenda de citas online 24/7</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Perfil del contacto (citas + notas)</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Cotizaciones y cobros</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>1 usuario incluido</div>
        </div>
        <a href="/signup" class="plan-btn btn-plan-free" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_trial'});">Empezar gratis →</a>
        <p class="plan-fine">// Sin tarjeta · Cancela cuando quieras</p>
      </div>

      <!-- ESENCIAL -->
      <div class="plan-card">
        <span class="plan-badge badge-crm">Esencial</span>
        <div class="plan-name">Zentro CRM Esencial</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="49">49</span><sub>/mes</sub></div>
        <div class="plan-note">1 usuario incluido · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span> por usuario extra</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Bandeja de WhatsApp (Cloud API)</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Agenda + página pública de citas</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Contactos y pipeline de pacientes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Recordatorio automático 24h antes de cada cita</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Cotizaciones y recibos de cobro en PDF</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Hasta 1.000 pacientes activos</div>
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span><span class="pf-ai-num">Borradores de respuesta con IA</span> · hasta 300 al mes incluidos <span class="pf-ai-pill">IA</span></span></div>
          <div class="pf" style="color:var(--zm-muted2);"><div class="pf-check" style="background:var(--zm-line2);"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>Automatizaciones y campañas de difusión</div>
        </div>
        <a href="/signup?plan=esencial" class="plan-btn btn-plan-crm" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_esencial'});">Elegir Esencial →</a>
        <p class="plan-fine">// Factura mensual · Cancela cuando quieras</p>
      </div>

      <!-- PROFESIONAL -->
      <div class="plan-card featured">
        <div class="plan-chip">⭐ Más popular</div>
        <div class="plan-name">Zentro CRM Profesional</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="99">99</span><sub>/mes</sub></div>
        <div class="plan-note">3 usuarios incluidos · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span> por usuario extra</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Esencial, más:</div>
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span><span class="pf-ai-num">IA 24/7 con base de conocimiento</span> y traspaso a humano · hasta 2.000 respuestas/mes incluidas <span class="pf-ai-pill">IA</span></span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Automatizaciones personalizables: recordatorios, seguimiento y reactivación por plantilla</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Campañas de difusión por WhatsApp</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Sincronización con Google Calendar</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Mini-sitio propio del consultorio</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Hasta 5.000 pacientes activos</div>
        </div>
        <a href="/signup?plan=profesional" class="plan-btn btn-plan-pop" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_profesional'});">Elegir Profesional →</a>
        <p class="plan-fine">// Factura mensual · Cancela cuando quieras</p>
      </div>

      <!-- CLINICA -->
      <div class="plan-card dark-card">
        <span class="plan-badge badge-pro">Clínica</span>
        <div class="plan-name">Zentro CRM Clínica</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="149">149</span><sub>/mes</sub></div>
        <div class="plan-note">5 usuarios incluidos · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span> por usuario extra</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Profesional, más:</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Pacientes activos ilimitados</span></div>
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span><span class="pf-new">IA de alto volumen</span> · hasta 6.000 respuestas/mes incluidas <span class="pf-ai-pill">IA</span></span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">API pública + webhooks para tus propias integraciones</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Multi-profesional y multi-consultorio avanzado</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Roles, invitaciones y auditoría de equipo</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Soporte prioritario + onboarding asistido</div>
        </div>
        <a href="/signup?plan=clinica" class="plan-btn btn-plan-pro" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_clinica'});">Elegir Clínica →</a>
        <p class="plan-fine">// Factura mensual · Cancela cuando quieras</p>
      </div>

    </div>
    <div style="max-width:680px;margin:28px auto 0;text-align:center;">
      <p style="font-size:13px;color:var(--zm-muted);line-height:1.7;">La <strong>Prueba gratuita</strong> dura 30 días, sin tarjeta, con funciones básicas de agenda y pipeline de pacientes. Si tu consultorio necesita WhatsApp, IA o automatizaciones, elige <strong>Esencial, Profesional o Clínica</strong> — son planes pagos desde el primer día, sin período de prueba extendido. Si no activas un plan al terminar tu prueba gratuita, tu cuenta pasa a solo lectura; nunca te cobramos sin que actives un plan primero.</p>
    </div>
    <p style="text-align:center;margin-top:20px;font-size:12px;color:var(--zm-muted2);font-family:'JetBrains Mono',monospace;line-height:1.8;">
      <span style="color:rgba(167,139,250,.7);">IA</span> = auto-respuestas + redacción asistida en WhatsApp, con infraestructura de IA gestionada por Zentro — no necesitas cuentas propias en OpenAI ni Anthropic. Cada plan incluye una cantidad mensual de respuestas de IA (ver detalle en cada plan); si tu consultorio la supera, puedes ampliarla desde $5 USD por cada 1.000 respuestas adicionales, sin cambiar de plan.<br>
      Zentro CRM es software de gestión comercial. No incluye gestión de campañas publicitarias — eso es <a href="#marketing" style="color:var(--zm-g3);font-weight:700;">Zentro Med Marketing</a>, un servicio aparte y opcional.<br>
      Zentro Med no es un software de historia clínica ni de facturación tributaria.
    </p>
  </div>
</section>

<!-- CROSS-SELL: ZENTRO MED MARKETING (después de ver el precio del CRM, para que no se confunda con él) -->
<section class="solution" id="marketing" style="background:var(--zm-night);padding-top:clamp(64px,9vw,100px);padding-bottom:clamp(64px,9vw,100px);">
  <div class="wrap">
    <div class="reveal" style="max-width:700px;margin:0 auto;text-align:center;">
      <p class="section-label" style="color:#a5b4fc;">// Ya tienes tu CRM. ¿Y si además quieres pacientes nuevos?</p>
      <h2 class="section-title" style="color:var(--zm-white);">Esto es <span style="color:#a5b4fc;">Zentro Med Marketing</span> — un servicio aparte, opcional.</h2>
      <p class="section-sub" style="color:rgba(255,255,255,.5);margin:14px auto 0;">No es otro nivel del CRM ni un cobro escondido: es un equipo que gestiona campañas de Meta Ads, Google Ads y contenido para traerte pacientes nuevos, si tu agenda depende hoy del boca a boca. Corre sobre la misma bandeja de WhatsApp Cloud API y el mismo calendario sincronizado con Google Calendar de tu CRM actual — no migras nada, no duplicas herramientas.</p>
    </div>
    <div class="reveal-group" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:920px;margin:40px auto 0;">
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;">
        <div style="font-size:13px;font-weight:800;color:var(--zm-white);margin-bottom:6px;">Med Starter</div>
        <div style="font-size:22px;font-weight:800;color:#a5b4fc;margin-bottom:8px;">$249<span style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;"> USD/mes + setup $99</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;">Incluye tu CRM Profesional (valor $99) + 1 campaña activa en Meta Ads + contenido mensual</div>
      </div>
      <div style="background:rgba(99,102,241,.1);border:2px solid rgba(129,140,248,.5);border-radius:16px;padding:22px;position:relative;">
        <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#818cf8;color:#1e1b4b;font-size:9px;font-weight:800;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Recomendado</div>
        <div style="font-size:13px;font-weight:800;color:var(--zm-white);margin-bottom:6px;">Med Growth</div>
        <div style="font-size:22px;font-weight:800;color:#a5b4fc;margin-bottom:8px;">$399<span style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;"> USD/mes + setup $99</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.55);line-height:1.6;">Incluye tu CRM Clínica (valor $149) + Meta + Google Ads + landing de especialidad</div>
      </div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;">
        <div style="font-size:13px;font-weight:800;color:var(--zm-white);margin-bottom:6px;">Med Premium</div>
        <div style="font-size:22px;font-weight:800;color:#a5b4fc;margin-bottom:8px;">$599<span style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;"> USD/mes + setup $149</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;">Incluye tu CRM Clínica (valor $149) + SEO local + account manager dedicado</div>
      </div>
    </div>
    <div class="reveal" style="text-align:center;margin-top:36px;">
      <a href="https://zentrolabs.com/landing" class="btn btn-lg" style="background:#818cf8;color:#1e1b4b;" onclick="if(typeof gtag!=='undefined')gtag('event','cross_sell_click',{event_category:'cta',event_label:'crm_to_maas'});">Conocer Zentro Med Marketing →</a>
      <p style="margin-top:12px;font-size:12px;color:rgba(255,255,255,.35);font-family:'JetBrains Mono',monospace;">// Si ya tienes el CRM, el valor de tu plan se descuenta del precio de Marketing — nunca pagas dos veces</p>
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
        <p class="testi-quote">"Antes perdía al menos 8 citas por semana por no-shows. Con los recordatorios de WhatsApp de Zentro Med ese número bajó a casi cero en el primer mes."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          −87% no-shows · Mes 1
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dcfce7;color:#15803d;">DR</div>
          <div>
            <div class="testi-name">Dr. Rodrigo M.</div>
            <div class="testi-role">Médico general · Bogotá</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"La automatización de reactivación me devolvió pacientes que llevaban meses sin volver. No tuve que escribirle a nadie manualmente."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          +35% citas de reactivación · Mes 2
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dbeafe;color:#1d4ed8;">DL</div>
          <div>
            <div class="testi-name">Dra. Lucía V.</div>
            <div class="testi-role">Dermatóloga · Medellín</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Empecé solo con el CRM para ordenar la agenda. A los 3 meses activé Zentro Med Marketing sobre la misma cuenta — sin migrar nada ni perder historial."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          CRM → Marketing sin perder historial · Mes 3
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#f3e8ff;color:#7e22ce;">CE</div>
          <div>
            <div class="testi-name">Dr. Carlos E.</div>
            <div class="testi-role">Ortopedista · Cali</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq">
  <div class="wrap">
    <div class="faq-header reveal">
      <p class="section-label">// Preguntas frecuentes</p>
      <h2 class="section-title">Todo lo que necesitas saber</h2>
    </div>
    <div class="faq-grid">
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿El CRM maneja datos de pacientes de forma segura?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Los datos se almacenan con cifrado en tránsito y en reposo, cumpliendo la Ley 1581 de 2012 (habeas data) para el tratamiento de datos de contacto. Zentro Med es una herramienta de gestión comercial — gestiona citas, contactos y comunicaciones de negocio. No es un sistema de historia clínica; los datos clínicos de tus pacientes son tu responsabilidad exclusiva como profesional de salud. Si un paciente te envía una foto o documento por WhatsApp (por ejemplo, un examen), ese archivo queda guardado en la conversación igual que cualquier mensaje — te recomendamos no solicitar ni conservar ahí información clínica sensible, y borrarla del hilo si la recibes.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Funciona para especialistas, no solo médicos generales?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Trabajamos con dermatología, ortopedia, odontología, psicología, oftalmología, medicina estética y más. El CRM se adapta a tu especialidad: plantillas de WhatsApp, campos del pipeline y flujos de automatización configurables por tipo de consulta.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Necesito contratar marketing para usar el CRM?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">No. El CRM funciona 100% independiente — ningún plan requiere contratar marketing. Si más adelante quieres atraer pacientes nuevos con campañas gestionadas, existe Zentro Med Marketing como servicio aparte y opcional, sobre la misma cuenta.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Qué pasa cuando termina el trial de 30 días?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Tu prueba gratuita corre 30 días con funciones básicas (agenda y pipeline de pacientes). Si quieres WhatsApp, IA o automatizaciones, eliges el plan pago que se ajuste a tu consultorio (Esencial, Profesional o Clínica) y sigues sin perder tu información. Si no decides, tu cuenta pasa a solo lectura — nunca te cobramos sin que actives un plan primero.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Puedo cancelar cuando quiera?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Sin contratos ni penalidades. Eres dueño de todos tus datos, accesos y activos digitales desde el día uno — al cancelar simplemente revocas nuestro acceso colaborador. No te dejamos rehén de nada.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Funciona si ya tengo otro sistema de citas?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí, podemos hacer la transición gradual. Tu estratega revisa tu setup actual y define el plan de migración para que no pierdas ninguna cita ni información durante el cambio.</div></div>
      </div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="wrap">
    <p class="section-label" style="color:rgba(74,222,90,.6);margin-bottom:16px;">// Empieza hoy</p>
    <h2>Tu consultorio merece<br><span>pacientes que regresen.</span></h2>
    <p>30 días de prueba gratis con funciones básicas. Sin tarjeta. Configuración en 24 horas.</p>
    <div class="cta-btns">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'cta_final'});">Probar 30 días gratis →</a>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-ghost-light btn-lg">Hablar con un estratega</a>
    </div>
    <p class="cta-note">// Sin tarjeta · Sin contratos · Cancela cuando quieras</p>
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
    <span class="mob-cta-price">30 días gratis</span>
    <span class="mob-cta-sub">sin tarjeta · Solo CRM, sin compromisos</span>
  </div>
  <a href="/signup" class="btn btn-green" style="font-size:13px;padding:10px 16px;flex-shrink:0;" onclick="if(typeof gtag!=='undefined')gtag('event','mobile_sticky_cta_click',{event_category:'cta',event_label:'sticky_bar_mobile'});">Empezar →</a>
</div>
`;

export const LANDING_BEHAVIOR_SCRIPT = `
/* ── MOBILE MENU ── */
function zmToggleMobMenu() {
  const panel = document.getElementById('mobMenuPanel');
  const btn = document.getElementById('mobMenuBtn');
  const open = panel.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function zmCloseMobMenu() {
  document.getElementById('mobMenuPanel').classList.remove('open');
  document.getElementById('mobMenuBtn').setAttribute('aria-expanded', 'false');
}

/* ── FAQ ── */
function zmToggleFaq(el) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => { i.classList.remove('open'); i.setAttribute('aria-expanded','false'); });
  if (!isOpen) { el.classList.add('open'); el.setAttribute('aria-expanded','true'); }
}

/* ── SCROLL REVEAL ── */
(function() {
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal, .reveal-group').forEach(function(el) { obs.observe(el); });
})();

/* ── LUCIDE ICONS ── */
(function pollForLucide() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    return;
  }
  setTimeout(pollForLucide, 50);
})();

/* ── CURRENCY SWITCHER ── */
var ZM_CURR = {
  USD: { sym:'$', rate:1,    flag:'🇺🇸', label:'USD' },
  MXN: { sym:'$', rate:17.5, flag:'🇲🇽', label:'MXN' },
  COP: { sym:'$', rate:4100, flag:'🇨🇴', label:'COP' },
  ARS: { sym:'$', rate:1050, flag:'🇦🇷', label:'ARS' },
  GTQ: { sym:'Q', rate:7.75, flag:'🇬🇹', label:'GTQ' }
};

function zmFmtAmt(usd, c) {
  if (usd === 0) return '0';
  var val = Math.round(usd * c.rate);
  return val.toLocaleString('en-US');
}

function zmToggleCurr(e) {
  e.stopPropagation();
  document.getElementById('currSwitch').classList.toggle('open');
}

function zmSetCurr(code) {
  var c = ZM_CURR[code];
  // Update amounts
  document.querySelectorAll('.price-amt').forEach(el => {
    el.textContent = zmFmtAmt(parseFloat(el.dataset.usd), c);
  });
  // Update symbols
  document.querySelectorAll('.price-sym').forEach(el => el.textContent = c.sym);
  // Update currency labels
  document.querySelectorAll('.price-curr-label').forEach(el => el.textContent = code);
  // Update button
  document.getElementById('currFlag').textContent = c.flag;
  document.getElementById('currCode').textContent = code;
  // Close & mark active
  document.getElementById('currSwitch').classList.remove('open');
  document.querySelectorAll('.curr-opt').forEach(el =>
    el.classList.toggle('curr-active', el.dataset.curr === code)
  );
}
`;
