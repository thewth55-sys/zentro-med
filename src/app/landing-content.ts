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
        <a href="#producto" class="nav-link">Producto</a>
        <a href="/zen" class="nav-link">Zen</a>
        <a href="#planes" class="nav-link">Planes</a>
        <a href="#marketing" class="nav-link">Marketing</a>
        <a href="#preguntas" class="nav-link">Preguntas</a>

        <!-- Currency Switcher -->
        <div class="curr-switch" id="currSwitch">
          <button class="curr-btn" onclick="zmToggleCurr(event)" aria-label="Cambiar moneda">
            <img id="currFlag" class="curr-flag-img" src="https://flagcdn.com/20x15/us.png" width="16" height="12" alt="">
            <span id="currCode">USD</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="curr-dropdown">
            <button class="curr-opt curr-active" data-curr="USD" onclick="zmSetCurr('USD')">
              <img class="curr-flag-img" src="https://flagcdn.com/20x15/us.png" width="16" height="12" alt=""><span class="curr-name">USD</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="MXN" onclick="zmSetCurr('MXN')">
              <img class="curr-flag-img" src="https://flagcdn.com/20x15/mx.png" width="16" height="12" alt=""><span class="curr-name">MXN</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="COP" onclick="zmSetCurr('COP')">
              <img class="curr-flag-img" src="https://flagcdn.com/20x15/co.png" width="16" height="12" alt=""><span class="curr-name">COP</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="ARS" onclick="zmSetCurr('ARS')">
              <img class="curr-flag-img" src="https://flagcdn.com/20x15/ar.png" width="16" height="12" alt=""><span class="curr-name">ARS</span><span class="curr-sym">$</span>
            </button>
            <button class="curr-opt" data-curr="GTQ" onclick="zmSetCurr('GTQ')">
              <img class="curr-flag-img" src="https://flagcdn.com/20x15/gt.png" width="16" height="12" alt=""><span class="curr-name">GTQ</span><span class="curr-sym">Q</span>
            </button>
          </div>
        </div>

        <a href="/login" class="nav-login" aria-label="Iniciar sesión">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          <span class="nav-login-text">Iniciar sesión</span>
        </a>
        <a href="/signup" class="btn btn-green btn-sm nav-cta-btn">Empezar gratis →</a>
        <button class="mob-menu-btn" onclick="zmToggleMobMenu()" aria-label="Abrir menú" aria-expanded="false" id="mobMenuBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <div class="mob-menu-panel" id="mobMenuPanel">
    <a href="#producto" class="mob-menu-link" onclick="zmCloseMobMenu()">Producto</a>
    <a href="/zen" class="mob-menu-link" onclick="zmCloseMobMenu()">Zen</a>
    <a href="#planes" class="mob-menu-link" onclick="zmCloseMobMenu()">Planes</a>
    <a href="#marketing" class="mob-menu-link" onclick="zmCloseMobMenu()">Marketing</a>
    <a href="#preguntas" class="mob-menu-link" onclick="zmCloseMobMenu()">Preguntas</a>
    <a href="/login" class="mob-menu-link" onclick="zmCloseMobMenu()">Iniciar sesión</a>
    <a href="/signup" class="btn btn-green btn-sm mob-menu-cta" onclick="zmCloseMobMenu()">Empezar gratis →</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <div class="hero-eyebrow">
      <span class="pill-dark"><span class="dot-green"></span>+80 consultorios · 7 países</span>
    </div>
    <h1>Que no se pierda ni una<br><span class="green">cita que ya tenías agendada.</span></h1>
    <p class="hero-sub">Zentro Med confirma cada cita por WhatsApp, agenda sola y te trae de vuelta a los pacientes que dejaron de venir. <strong style="color:var(--zm-ink);">Sin contratar a nadie más.</strong></p>
    <div class="hero-ctas">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'hero_primary'});">Empezar gratis · sin tarjeta</a>
      <a href="#producto" class="btn btn-ghost-light btn-lg">Ver el producto · 3 min</a>
    </div>
    <p class="hero-note">// WhatsApp y Zen incluidos en la prueba · Listo en 24 horas</p>

    <!-- Hero UI Widgets — muestra contexto del producto sin necesitar imagen -->
    <p style="text-align:center;font-size:10.5px;color:var(--zm-muted2);font-family:'IBM Plex Mono',monospace;margin-bottom:8px;">// Ejemplos ilustrativos del producto</p>
    <div class="hero-widgets">
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(74,222,90,.1);">
          <svg viewBox="0 0 24 24" stroke="var(--zm-g)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>
        </div>
        <div>
          <div class="hw-title">Cita confirmada</div>
          <div class="hw-sub">Zen · Hoy 3:00pm · WhatsApp ✓</div>
        </div>
      </div>
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(59,130,246,.1);">
          <svg viewBox="0 0 24 24" stroke="#60a5fa"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </div>
        <div>
          <div class="hw-title">Reactivación automática</div>
          <div class="hw-sub">12 pacientes sin cita en 90 días · mensaje enviado</div>
        </div>
      </div>
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(37,211,102,.1);">
          <img src="https://cdn.simpleicons.org/whatsapp/25D366" width="15" height="15" alt="WA" style="display:block;">
        </div>
        <div>
          <div class="hw-title">Recordatorio enviado</div>
          <div class="hw-sub">−54% citas perdidas en promedio*</div>
        </div>
      </div>
    </div>

    <!-- REAL PRODUCT SCREENSHOT: panel de control -->
    <div class="reveal" style="max-width:900px;margin:36px auto 0;">
      <img
        src="/landing/hero-dashboard-preview.webp"
        width="1536"
        height="1024"
        alt="Panel de Zentro Med mostrando conversaciones activas, pacientes nuevos, ingresos cobrados y la agenda del día"
        style="width:100%;height:auto;display:block;border-radius:16px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);"
        loading="eager"
        fetchpriority="high"
      >
    </div>
    <p class="mockui-caption">// Así se ve tu panel de control en Zentro Med</p>
  </div>
</section>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="wrap">
    <div class="stats-bar-inner">
      <div class="stat-item">
        <div class="stat-n2"><span>+80</span></div>
        <div class="stat-l2">consultorios activos en 7 países</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2"><span>54%</span></div>
        <div class="stat-l2">menos citas perdidas con recordatorios</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2">24h</div>
        <div class="stat-l2">de la cuenta nueva al sistema configurado</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2"><span>30</span></div>
        <div class="stat-l2">días de prueba, sin tarjeta, con Zen</div>
      </div>
    </div>
  </div>
  <p class="stats-note">* Promedio de clientes activos en los primeros 90 días. Resultados individuales varían según especialidad y volumen de pacientes. No garantizamos métricas específicas.<br>† Activación del CRM y agenda en 24h. WhatsApp y Zen se activan al elegir un plan pago (Esencial, Profesional o Clínica), o durante el tope de cortesía de la prueba gratuita.</p>
</div>

<!-- 01 — FUGAS -->
<section class="problems" id="fugas">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 01 — Dónde se va el dinero</p>
      <h2 class="section-title">Tres fugas que ya están costándote dinero este mes</h2>
      <p class="section-sub">Ninguna es un problema de esfuerzo. Las tres son problemas de seguimiento, y el seguimiento es exactamente lo que un sistema hace mejor que una persona ocupada.</p>
    </div>
    <div class="leak-grid reveal-group">
      <div class="leak-card">
        <div class="leak-num" style="color:#B3382C;">1 de 5</div>
        <div class="leak-num-label">Pacientes con cita no se presenta</div>
        <div class="leak-title">El paciente no llega y nadie lo llamó</div>
        <div class="leak-text">Confirmar una por una consume la mañana de recepción, así que se deja de hacer. El hueco queda vacío y el ingreso de esa hora no se recupera.</div>
        <div class="leak-fix">
          <span class="leak-fix-label">Cómo se cierra</span>
          <div class="leak-fix-text">Confirmación por WhatsApp 24 horas antes, en todos los planes, sin que nadie se acuerde.</div>
        </div>
      </div>
      <div class="leak-card">
        <div class="leak-num" style="color:#B4740A;">5×</div>
        <div class="leak-num-label">Más caro recuperarlo que retenerlo</div>
        <div class="leak-title">El paciente que no agendó su siguiente cita</div>
        <div class="leak-text">Sale del consultorio sin fecha, y sin seguimiento simplemente desaparece del radar. Nadie decide perderlo: se pierde por omisión.</div>
        <div class="leak-fix">
          <span class="leak-fix-label">Cómo se cierra</span>
          <div class="leak-fix-text">Detecta quién no ha vuelto en 30, 60 o 90 días y le escribe un mensaje personalizado.</div>
        </div>
      </div>
      <div class="leak-card">
        <div class="leak-num" style="color:#22588F;">3</div>
        <div class="leak-num-label">Lugares distintos con la misma info</div>
        <div class="leak-title">La información no está donde se necesita</div>
        <div class="leak-text">El historial en WhatsApp, la cita en una libreta, el cobro en otro sistema. Nadie del equipo ve el cuadro completo y todos preguntan dos veces.</div>
        <div class="leak-fix">
          <span class="leak-fix-label">Cómo se cierra</span>
          <div class="leak-fix-text">Una bandeja compartida y una ficha por paciente, con roles y permisos por persona.</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 02 — ROI CALCULATOR -->
<section class="solution" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 02 — La cuenta, hecha</p>
      <h2 class="section-title">Una consulta recuperada al mes ya paga el plan</h2>
      <p class="section-sub">No hay que creernos nada: la aritmética es la de tu propio consultorio. Ajusta el valor de tu consulta y cuántas citas se te caen al mes.</p>
    </div>
    <div class="reveal roi-card" data-roi data-roi-ratio="0.875" id="roiHome">
      <div class="roi-inner">
        <div class="roi-inputs">
          <div class="roi-row">
            <div class="roi-row-head"><span class="roi-row-num">01</span><span class="roi-row-label">Citas que se te caen al mes</span></div>
            <input class="roi-input" type="number" min="0" step="1" value="8" data-roi-citas oninput="zmRoiUpdate()">
          </div>
          <div class="roi-row">
            <div class="roi-row-head"><span class="roi-row-num">02</span><span class="roi-row-label">Valor de tu consulta</span></div>
            <input class="roi-input" type="number" min="0" step="50" value="1200" data-roi-valor oninput="zmRoiUpdate()">
          </div>
          <div class="roi-static">
            <span class="roi-row-head"><span class="roi-row-num">03</span><span class="roi-row-label">Se pierden hoy</span></span>
            <span class="roi-static-val" data-roi-perdidas>$9,600</span>
          </div>
          <div class="roi-static">
            <span class="roi-row-head"><span class="roi-row-num">04</span><span class="roi-row-label">Con recordatorios automáticos</span></span>
            <span class="roi-static-val">54% menos</span>
          </div>
        </div>
        <div class="roi-results">
          <div class="roi-final">
            <div class="roi-final-label">Recuperas al mes</div>
            <div class="roi-final-val" data-roi-recupera>$8,400</div>
            <span class="roi-final-multiple">10× el plan Esencial</span>
          </div>
        </div>
      </div>
    </div>
    <p class="roi-assumptions">SUPUESTOS: 8 CITAS PERDIDAS AL MES · $1,200 POR CONSULTA · 54% MENOS AUSENCIAS CON RECORDATORIOS, PROMEDIO DE CLIENTES ACTIVOS EN SUS PRIMEROS 90 DÍAS.</p>
  </div>
</section>

<!-- 03 — CONOCE A ZEN -->
<section class="solution" id="zen-preview" style="background:var(--zm-dark-panel);">
  <div class="wrap">
    <div class="solution-grid">
      <div class="solution-visual" style="padding:0;overflow:hidden;">
        <div class="mockui" style="border-radius:0;border:none;">
          <div class="mockui-chat-header">
            <div class="mockui-chat-contact">
              <div class="mockui-avatar" style="background:#dcfce7;color:#15803d;">LG</div>
              <div>
                <div class="mockui-chat-name">Laura G.</div>
                <div class="mockui-chat-meta">Domingo, 11:04 p.m.</div>
              </div>
            </div>
            <span class="mockui-status-pill active">Activo</span>
          </div>
          <div class="mockui-chat" style="min-height:260px;">
            <div class="mockui-bubble in">Hola, ¿tienen cita para limpieza esta semana? ¿Cuánto cuesta?</div>
            <span class="mockui-bubble-time">11:04 p.m.</span>
            <div class="mockui-bubble auto" style="align-self:flex-end;border-bottom-left-radius:14px;border-bottom-right-radius:4px;">Hola Laura. La limpieza dental cuesta $500 y dura 45 minutos. Tengo lunes 8 a las 10:00 a.m. o miércoles 10 a las 4:30 p.m. ¿Cuál te acomoda?</div>
            <span class="mockui-bubble-time" style="align-self:flex-end;">11:04 p.m.</span>
            <div class="mockui-bubble in">El lunes a las 10 me sirve</div>
            <span class="mockui-bubble-time">11:06 p.m.</span>
            <div class="mockui-bubble auto" style="align-self:flex-end;border-bottom-left-radius:14px;border-bottom-right-radius:4px;">Listo, quedó el lunes 8 de septiembre a las 10:00 a.m. Te confirmo un día antes por aquí.</div>
            <span class="mockui-bubble-tag done" style="align-self:flex-end;">✓ Cita creada · lunes 8, 10:00 a.m.</span>
          </div>
        </div>
        <p class="mockui-caption" style="padding-bottom:16px;">// Zen en WhatsApp — sin intervención</p>
      </div>
      <div class="solution-copy">
        <p class="section-label">// 03 — Conoce a Zen</p>
        <h2 class="section-title">Zen es la recepcionista que nunca se va a comer</h2>
        <p class="section-sub">Contesta WhatsApp a las once de la noche, agenda dentro de la misma conversación y te pasa el chat en cuanto la pregunta se vuelve clínica. Y dentro del sistema, le hablas y hace el trabajo.</p>
        <div class="benefit-list">
          <div class="benefit-item">
            <div class="benefit-num">1</div>
            <div class="benefit-text">
              <h3>Habla como tu consultorio</h3>
              <p>Configuras precios, horarios y preguntas frecuentes una vez. Zen los usa en cada conversación, sin inventar nada.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">2</div>
            <div class="benefit-text">
              <h3>Agenda dentro del chat</h3>
              <p>Confirma, mueve o cancela citas sin que nadie del equipo intervenga, y la cita aparece en tu calendario.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">3</div>
            <div class="benefit-text">
              <h3>Sabe cuándo llamarte</h3>
              <p>Si la pregunta es clínica o sale de lo que tiene configurado, pasa la conversación a una persona del equipo.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">4</div>
            <div class="benefit-text">
              <h3>Nunca actúa sin permiso</h3>
              <p>Dentro del sistema te propone las acciones y espera tu confirmación antes de mover una cita o enviar un cobro.</p>
            </div>
          </div>
        </div>
        <a href="/zen" class="btn btn-dark" style="margin-top:8px;">Ver todo lo que hace Zen →</a>
      </div>
    </div>

    <div class="reveal" style="max-width:420px;margin:56px auto 0;">
      <div class="voice-card">
        <div class="voice-mic">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </div>
        <div class="voice-label">Zen por voz · con las manos ocupadas</div>
        <p class="voice-quote">"Agenda a Kenia el jueves a las once y mándale el link de cobro"</p>
        <div class="voice-actions-label">Zen va a hacer</div>
        <div class="voice-actions">
          <div class="voice-action">
            <span class="voice-action-num">1</span>
            <span class="voice-action-text">Mover cita a jueves 10 · 11:00</span>
          </div>
          <div class="voice-action">
            <span class="voice-action-num">2</span>
            <span class="voice-action-text">Enviar link de cobro por $1,150</span>
          </div>
        </div>
        <div class="voice-btns">
          <button class="voice-confirm-btn" type="button">Confirmar ambas</button>
        </div>
      </div>
    </div>
    <p style="text-align:center;margin-top:20px;font-size:11.5px;color:rgba(255,255,255,.4);font-family:'IBM Plex Mono',monospace;">// La infraestructura de Zen va incluida — no necesitas cuentas propias en ningún proveedor de IA</p>
  </div>
</section>

<!-- 04 — QUÉ INCLUYE -->
<section class="problems" style="background:var(--zm-surface);" id="producto">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 04 — Qué incluye</p>
      <h2 class="section-title">Un sistema, no seis pestañas abiertas</h2>
      <p class="section-sub">Reemplaza la libreta, el WhatsApp personal y la hoja de cálculo. No es expediente clínico, y es a propósito: así funciona igual en odontología, dermatología o psicología, en siete países, sin atarte al formato clínico ni fiscal de uno solo.</p>
    </div>
    <div class="fx-grid reveal-group">
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="calendar-check"></i></div>
        <div class="fx-title">Agenda en línea, día y noche</div>
        <div class="fx-desc">Página pública de citas, sincronización con Google Calendar y recordatorio automático el día previo.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="message-circle"></i></div>
        <div class="fx-title">WhatsApp compartido</div>
        <div class="fx-desc">Bandeja de equipo con el hilo completo por paciente, visible para todo el consultorio.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="users"></i></div>
        <div class="fx-title">Seguimiento de pacientes</div>
        <div class="fx-desc">Del primer contacto al paciente que regresa, con reactivación automática de quienes dejaron de agendar.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="receipt"></i></div>
        <div class="fx-title">Presupuestos y cobros</div>
        <div class="fx-desc">Genera presupuestos y registra pagos ligados a la ficha y a la cita, con recibo en PDF.</div>
        <span class="fx-tag">Todos los planes</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="bot"></i></div>
        <div class="fx-title">Zen contestando solo</div>
        <div class="fx-desc">Responde y agenda de forma autónoma las 24 horas, con la información de tu consultorio y traspaso a una persona.</div>
        <span class="fx-tag">Profesional y Clínica</span>
      </div>
      <div class="fx-card">
        <div class="fx-icon"><i data-lucide="building-2"></i></div>
        <div class="fx-title">Varios doctores y sedes</div>
        <div class="fx-desc">Administra la agenda de varios profesionales o consultorios desde una cuenta, con permisos por sede.</div>
        <span class="fx-tag">Clínica</span>
      </div>
    </div>

    <div class="reveal" style="margin-top:56px;background:var(--zm-surface);border:1px solid var(--zm-line);border-radius:22px;padding:clamp(28px,4vw,44px);">
      <p class="section-label" style="text-align:center;">// También en tu teléfono</p>
      <h3 style="text-align:center;font-size:clamp(20px,2.4vw,28px);font-weight:800;color:var(--zm-ink);letter-spacing:-.03em;margin-bottom:10px;">Entre paciente y paciente, sin sentarte a la computadora</h3>
      <p style="text-align:center;font-size:14px;color:var(--zm-muted);max-width:600px;margin:0 auto 28px;line-height:1.7;">La app de Android muestra lo que necesitas junto al sillón: quién está en consulta, qué citas faltan por confirmar y qué presupuestos siguen sin respuesta.</p>
      <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;">
        <span class="pill-dark">📎 Cobro por link en tres toques</span>
        <span class="pill-dark">🎙️ Zen por voz</span>
        <span class="pill-dark">🦷 Odontograma en la palma</span>
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
        <p class="mid-cta-head">Empieza gratis hoy — con WhatsApp y Zen incluidos en la prueba.</p>
      </div>
      <a href="/signup" class="btn btn-green btn-lg" style="flex-shrink:0;" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'mid_page'});">Empezar gratis →</a>
    </div>
  </div>
</div>

<!-- 05 — PLANES -->
<section class="pricing" id="planes">
  <div class="wrap">
    <div class="pricing-header reveal">
      <p class="section-label">// 05 — Planes del sistema</p>
      <h2 class="section-title">Si recuperas una consulta al mes, el plan ya se pagó</h2>
      <p class="section-sub" style="max-width:640px;margin:12px auto 0;">Sin costo de instalación, sin permanencia y sin cobro automático al terminar la prueba.</p>
    </div>
    <div class="reveal fitme-grid">
      <div style="border:1px solid var(--zm-line);border-radius:12px;padding:14px 16px;background:var(--zm-surface);">
        <div style="font-size:11px;font-weight:800;color:var(--zm-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Quieres probarlo antes de pagar</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Ves cómo se siente el sistema, con Zen y WhatsApp de cortesía, antes de decidir.</div>
      </div>
      <div style="border:1px solid var(--zm-line);border-radius:12px;padding:14px 16px;background:var(--zm-surface);">
        <div style="font-size:11px;font-weight:800;color:var(--zm-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Trabajas solo o con una persona más</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Solo necesitas ordenar WhatsApp y la agenda, con Zen redactando tus borradores.</div>
      </div>
      <div style="border:1px solid var(--zm-g-mid);border-radius:12px;padding:14px 16px;background:#f0fdf4;">
        <div style="font-size:11px;font-weight:800;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Tienes recepción y quieres que el seguimiento corra solo</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Zen contesta y agenda por su cuenta, con reactivación automática de pacientes.</div>
      </div>
      <div style="border:1px solid var(--zm-line);border-radius:12px;padding:14px 16px;background:var(--zm-surface);">
        <div style="font-size:11px;font-weight:800;color:var(--zm-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Varios especialistas o consultorios</div>
        <div style="font-size:12.5px;color:var(--zm-ink2);line-height:1.5;">Necesitas roles, API o conexiones propias, con Zen de alto volumen.</div>
      </div>
    </div>
    <div class="plans-grid reveal-group">

      <!-- PRUEBA GRATUITA -->
      <div class="plan-card">
        <span class="plan-badge badge-free">30 días gratis</span>
        <div class="plan-name">Prueba</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="0">0</span><sub>/ 30 días</sub></div>
        <div class="plan-note">1 usuario · sin tarjeta</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Agenda y página de reserva personalizable</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Hasta 10 pacientes activos</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Presupuestos, cobros y anticipo al reservar</div>
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span>WhatsApp y Zen <span class="pf-ai-num">con tope de cortesía</span> <span class="pf-ai-pill">IA</span></span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Tus datos se conservan al terminar</div>
        </div>
        <a href="/signup" class="plan-btn btn-plan-free" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_trial'});">Empezar gratis →</a>
        <p class="plan-fine">// Sin tarjeta · Cancela cuando quieras</p>
      </div>

      <!-- ESENCIAL -->
      <div class="plan-card">
        <span class="plan-badge badge-crm">Esencial</span>
        <div class="plan-name">Zentro Med Esencial</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="39">39</span><sub>/ mes</sub></div>
        <div class="plan-note">1 usuario · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span> por usuario extra</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Bandeja de WhatsApp Cloud API</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Recordatorio automático 24h antes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Hasta 1,000 pacientes activos</div>
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span><span class="pf-ai-num">Zen contestando solo</span> · 300 respuestas/mes <span class="pf-ai-pill">IA</span></span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Página de reserva personalizable y horarios por consultorio</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Cobro de anticipo y formulario de admisión de pacientes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Recibos y presupuestos en PDF</div>
        </div>
        <a href="/signup?plan=esencial" class="plan-btn btn-plan-crm" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_esencial'});">Elegir Esencial →</a>
        <p class="plan-fine">// 7 de cada 10 eligen este · Cancela cuando quieras</p>
      </div>

      <!-- PROFESIONAL -->
      <div class="plan-card featured">
        <div class="plan-chip">⭐ Más popular</div>
        <div class="plan-name">Zentro Med Profesional</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="79">79</span><sub>/ mes</sub></div>
        <div class="plan-note">3 usuarios · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span> por usuario extra</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Esencial</div>
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span><span class="pf-ai-num">Zen contestando solo</span> · 2,000 respuestas/mes <span class="pf-ai-pill">IA</span></span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Reactivación automática de pacientes</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Campañas por WhatsApp</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Google Calendar y mini-sitio propio</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Hasta 5,000 pacientes activos</div>
        </div>
        <a href="/signup?plan=profesional" class="plan-btn btn-plan-pop" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_profesional'});">Elegir Profesional →</a>
        <p class="plan-fine">// Factura mensual · Cancela cuando quieras</p>
      </div>

      <!-- CLINICA -->
      <div class="plan-card dark-card">
        <span class="plan-badge badge-pro">Clínica</span>
        <div class="plan-name">Zentro Med Clínica</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="149">149</span><sub>/ mes</sub></div>
        <div class="plan-note">5 usuarios · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span> por usuario extra</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Profesional</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Pacientes activos ilimitados</span></div>
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span><span class="pf-new">Zen de alto volumen</span> · 6,000 respuestas/mes <span class="pf-ai-pill">IA</span></span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">API pública y conexiones propias</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Roles, invitaciones y auditoría</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Soporte prioritario y acompañamiento</div>
        </div>
        <a href="/signup?plan=clinica" class="plan-btn btn-plan-pro" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'crm_clinica'});">Elegir Clínica →</a>
        <p class="plan-fine">// Factura mensual · Cancela cuando quieras</p>
      </div>

    </div>
    <div style="max-width:680px;margin:28px auto 0;text-align:center;">
      <p style="font-size:13px;color:var(--zm-muted);line-height:1.7;"><strong>La prueba sí incluye Zen:</strong> WhatsApp sin límite de mensajes y 30 respuestas de Zen al mes, de cortesía — para que veas funcionar lo que promete esta página antes de pagar. También incluye tu página de reserva personalizable, cobro de anticipo al reservar y hasta 10 pacientes activos. Al terminar los 30 días eliges plan; si no eliges, tu cuenta pasa a solo lectura y conservas tus datos. Nunca cobramos sin que actives un plan.</p>
    </div>
  </div>
</section>

<!-- CROSS-SELL: ZENTRO MED MARKETING -->
<section class="solution" id="marketing" style="background:var(--zm-white);padding-top:clamp(64px,9vw,100px);padding-bottom:clamp(64px,9vw,100px);">
  <div class="wrap">
    <div class="reveal" style="max-width:700px;margin:0 auto;text-align:center;">
      <p class="section-label">// 06 — Zentro Med Marketing</p>
      <h2 class="section-title">El sistema ordena tu agenda. <span class="green">Marketing la llena.</span></h2>
      <p class="section-sub" style="margin:14px auto 0;">Un servicio aparte y opcional: un equipo que gestiona tus campañas de Meta y Google Ads y produce el contenido, para traerte pacientes que hoy no te conocen. Incluye el sistema de gestión en el precio, sobre tu misma cuenta, sin migrar nada.</p>
    </div>
    <div class="reveal-group marketing-plans-grid">
      <div style="background:var(--zm-white);border:1px solid var(--zm-line);border-radius:16px;padding:22px;">
        <div style="font-size:13px;font-weight:800;color:var(--zm-ink);margin-bottom:6px;">Med Starter</div>
        <div style="font-size:22px;font-weight:800;color:var(--zm-ink);margin-bottom:8px;">$324<span style="font-size:12px;color:var(--zm-muted);font-weight:600;"> USD/mes + $129 instalación</span></div>
        <div style="font-size:12px;color:var(--zm-muted);line-height:1.6;">Incluye el sistema Profesional (valor $79) + 1 campaña activa en Meta Ads + contenido mensual</div>
      </div>
      <div style="background:var(--zm-ink);border:2px solid var(--zm-g3);border-radius:16px;padding:22px;position:relative;">
        <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--zm-g3);color:var(--zm-white);font-size:9px;font-weight:800;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Recomendado</div>
        <div style="font-size:13px;font-weight:800;color:var(--zm-white);margin-bottom:6px;">Med Growth</div>
        <div style="font-size:22px;font-weight:800;color:var(--zm-g-mid);margin-bottom:8px;">$519<span style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;"> USD/mes + $259 instalación</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.55);line-height:1.6;">Incluye el sistema Clínica (valor $149) + Meta y Google Ads + página de aterrizaje por especialidad</div>
      </div>
      <div style="background:var(--zm-white);border:1px solid var(--zm-line);border-radius:16px;padding:22px;">
        <div style="font-size:13px;font-weight:800;color:var(--zm-ink);margin-bottom:6px;">Med Premium</div>
        <div style="font-size:22px;font-weight:800;color:var(--zm-ink);margin-bottom:8px;">$974<span style="font-size:12px;color:var(--zm-muted);font-weight:600;"> USD/mes + $389 instalación</span></div>
        <div style="font-size:12px;color:var(--zm-muted);line-height:1.6;">Incluye el sistema Clínica (valor $149) + posicionamiento local + ejecutivo de cuenta dedicado</div>
      </div>
    </div>
    <div class="reveal" style="text-align:center;margin-top:36px;">
      <a href="/marketing" class="btn btn-green btn-lg" onclick="if(typeof gtag!=='undefined')gtag('event','cross_sell_click',{event_category:'cta',event_label:'crm_to_maas'});">Conocer Zentro Med Marketing →</a>
      <p style="margin-top:12px;font-size:12px;color:var(--zm-muted2);font-family:'IBM Plex Mono',monospace;">// Si ya tienes un plan del sistema, su valor se descuenta del precio de Marketing — nunca pagas dos veces</p>
    </div>
  </div>
</section>

<!-- 07 — PUESTA EN MARCHA -->
<section class="how">
  <div class="wrap">
    <div class="how-header reveal">
      <p class="section-label">// 07 — Puesta en marcha</p>
      <h2 class="section-title">Tú explicas cómo trabajas. Nosotros lo configuramos.</h2>
      <p class="section-sub" style="margin:0 auto;text-align:center;">Un estratega deja WhatsApp, agenda y automatizaciones funcionando en 24 horas. Tu única tarea es la llamada.</p>
    </div>
    <div class="how-steps reveal-group">
      <div class="how-step">
        <div class="step-num">1</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Hoy · 2 min</p>
        <div class="step-title">Activa tu cuenta</div>
        <div class="step-desc">Sin tarjeta. Entras y ya tienes agenda, pacientes y el tope de cortesía de WhatsApp y Zen.</div>
      </div>
      <div class="how-step">
        <div class="step-num">2</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">En 24 horas</p>
        <div class="step-title">Un estratega lo configura</div>
        <div class="step-desc">Le cuentas cómo funciona tu consultorio en una llamada. Él deja WhatsApp, agenda y recordatorios listos.</div>
      </div>
      <div class="how-step">
        <div class="step-num">3</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Día 2</p>
        <div class="step-title">Tu equipo entra</div>
        <div class="step-desc">Recepción, doctores y administración usan la misma bandeja y la misma agenda, con permisos por rol.</div>
      </div>
      <div class="how-step">
        <div class="step-num">4</div>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Día 30</p>
        <div class="step-title">Compara tus números</div>
        <div class="step-desc">Cuenta cuántas citas se te cayeron este mes contra el anterior. Con ese dato decides si sigues.</div>
      </div>
    </div>
  </div>
</section>

<!-- 08 — APP MÓVIL + GOOGLE CALENDAR -->
<section class="appcal">
  <div class="wrap">
    <div class="appcal-header reveal">
      <p class="section-label">// 08 — Tu consultorio, en tu bolsillo</p>
      <h2 class="section-title">La agenda te sigue a donde vayas</h2>
      <p class="section-sub" style="margin:0 auto;text-align:center;">Revisa citas, contesta WhatsApp y confirma pagos desde el celular — y todo lo que agendes cae directo en el Google Calendar que ya usas.</p>
    </div>
    <div class="appcal-panel reveal">
      <div class="appcal-copy">
        <span class="appcal-soon">PRÓXIMAMENTE</span>
        <p class="appcal-copy-title">La app para iPhone y Android</p>
        <div class="appcal-badges">
          <span class="store-badge" aria-disabled="true">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M18.7 12.3c0-3.1 2.5-4.6 2.6-4.7-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-.9 0-2.4-1.1-4-1.1-2 0-3.9 1.2-4.9 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.7 3 1.5-.1 2.1-1 3.9-1s2.3 1 3.9 1c1.6 0 2.7-1.5 3.7-3 .8-1.1 1.4-2.4 1.8-3.7-2.3-1-2.6-4.4-2.2-4.3zM15.9 3.2c.8-1 1.3-2.3 1.2-3.7-1.2.1-2.6.8-3.4 1.8-.8.9-1.4 2.2-1.2 3.6 1.3.1 2.6-.7 3.4-1.7z"/></svg>
            <span class="lines"><span>Próximamente en</span><span>App Store</span></span>
          </span>
          <span class="store-badge" aria-disabled="true">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M3.6 2.4c-.4.4-.6.9-.6 1.6v16c0 .7.2 1.2.6 1.6l.1.1L13 12.4v-.2L3.7 2.3l-.1.1z"/><path d="M16.1 15.5l-3.1-3.1v-.2l3.1-3.1 3.5 2c1 .6 1 1.5 0 2.1z" opacity=".85"/><path d="M16.1 8.5l-3.1 3.1L3.7 2.3c.3-.3.9-.4 1.5-.1z" opacity=".65"/><path d="M13 12.4l3.1 3.1-10.9 6.2c-.6.3-1.1.2-1.5-.1z" opacity=".65"/></svg>
            <span class="lines"><span>Próximamente en</span><span>Google Play</span></span>
          </span>
        </div>
        <div class="calendar-chip">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4.5" width="18" height="16" rx="2.5" fill="#fff" stroke="#0E7C4A" stroke-width="1.4"/><path d="M3 9.5H21" stroke="#0E7C4A" stroke-width="1.4"/><path d="M8 3v3M16 3v3" stroke="#0E7C4A" stroke-width="1.4" stroke-linecap="round"/><rect x="6.5" y="12" width="4" height="4" rx="1" fill="#0E7C4A"/></svg>
          Sincronizado con Google Calendar
        </div>
      </div>
      <div class="appcal-visual">
        <div class="appcal-phone">
          <p class="ph-label">HOY &middot; TUS CITAS</p>
          <div class="appcal-row"><span class="n">Paulina Vega</span><span class="t">10:30</span></div>
          <div class="appcal-row"><span class="n">Gerardo Solís</span><span class="t">11:15</span></div>
          <div class="appcal-cal">
            <div class="cal-top"><span>Google Calendar</span><span style="font-weight:400;color:var(--zm-muted);">Sept</span></div>
            <div class="cal-line"><span class="cal-dot"></span>10:30 — Limpieza &middot; Paulina</div>
            <div class="cal-line"><span class="cal-dot"></span>11:15 — Consulta &middot; Gerardo</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 09 — INTEGRACIONES DE PAGO -->
<section class="paystrip">
  <div class="wrap">
    <div class="paystrip-header reveal">
      <p class="section-label">// 09 — Cómo te pagan</p>
      <h2 class="section-title">Cobra con lo que tus pacientes ya usan</h2>
      <p class="section-sub" style="margin:0 auto;text-align:center;">Conecta la pasarela que ya tienes — los cobros y su estatus se reflejan solos en la ficha del paciente.</p>
    </div>
    <div class="paystrip-row reveal-group">
      <div class="paystrip-card">
        <div class="paystrip-mark clip">
          <svg height="720" viewBox="0 0 720 720" width="720" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd" transform="matrix(7.2028812,0,0,7.2028812,-7.2028812,-0.28811525)"><path d="M 100.95,16.86 C 100.91,7.57 93.36,0.04 84.05,0.04 c -2.31,0 -4.57,0.44 -6.52,1.31 L 15.95,27.5 C 7.17,31.21 1,39.91 1,50.02 V 83.1 c 0,9.33 7.57,16.9 16.9,16.9 2.37,0 4.62,-0.49 6.67,-1.37 L 85.89,72.59 c 8.84,-3.68 15.07,-12.41 15.07,-22.57 z" fill="#fc4c02"/><g fill="#ffffff"><path d="M 44.3,63.3 C 43.58,63.3 43,62.66 43,61.86 V 31.44 C 43,30.65 43.58,30 44.3,30 c 0.72,0 1.3,0.65 1.3,1.44 v 30.42 c 0,0.8 -0.58,1.44 -1.3,1.44 z"/><path d="M 55.6,61.94 V 38.16 c 0,-0.81 -0.58,-1.46 -1.3,-1.46 -0.72,0 -1.3,0.65 -1.3,1.46 v 23.78 c 0,0.81 0.58,1.46 1.3,1.46 0.72,0 1.3,-0.65 1.3,-1.46 z"/><path d="M 55.6,31.34 V 31.26 C 55.6,30.57 55.02,30 54.3,30 53.58,30 53,30.57 53,31.26 v 0.08 c 0,0.7 0.58,1.26 1.3,1.26 0.72,0 1.3,-0.56 1.3,-1.26 z"/><path d="m 35.27,60.09 c 0.57,-0.57 0.57,-1.49 0,-2.06 -0.58,-0.57 -1.51,-0.57 -2.08,0 -4.24,4.2 -11.13,4.2 -15.37,0 -4.24,-4.21 -4.24,-11.05 0,-15.25 2.05,-2.04 4.78,-3.16 7.68,-3.16 2.91,0 5.64,1.12 7.69,3.16 0.57,0.57 1.5,0.57 2.08,0 0.57,-0.57 0.57,-1.5 0,-2.07 -2.61,-2.59 -6.08,-4.01 -9.77,-4.01 -3.69,0 -7.15,1.42 -9.76,4.01 -5.39,5.35 -5.39,14.04 0,19.38 2.69,2.68 6.23,4.01 9.77,4.01 3.53,0 7.07,-1.33 9.76,-4.01 z"/><path d="M 65.92,69.24 V 50.37 c 0,-5.93 4.83,-10.76 10.78,-10.76 5.95,0 10.78,4.83 10.78,10.76 0,5.94 -4.83,10.76 -10.78,10.76 -3.43,0 -5.75,-1.3 -5.77,-1.31 -0.69,-0.41 -1.59,-0.18 -1.99,0.52 -0.41,0.69 -0.17,1.58 0.52,1.99 0.12,0.07 2.98,1.71 7.24,1.71 7.56,0 13.7,-6.13 13.7,-13.67 C 90.4,42.83 84.26,36.7 76.7,36.7 69.15,36.7 63,42.83 63,50.37 v 18.87 c 0,0.81 0.65,1.46 1.46,1.46 0.8,0 1.46,-0.65 1.46,-1.46 z"/></g></g></svg>
        </div>
        <p class="paystrip-cap">Cobro por link</p>
      </div>
      <div class="paystrip-card">
        <div class="paystrip-mark">
          <svg viewBox="0 0 1048.82 425.2" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .cls-1 { fill: #0a0080; }
      .cls-1, .cls-2, .cls-3 { stroke-width: 0px; }
      .cls-2 { fill: #fff; }
      .cls-3 { fill: #00bcff; }
    </style>
  </defs>
  <path class="cls-3" d="m274.38,116.94c-77.83,0-140.91,40.36-140.91,90.15s63.09,94.05,140.91,94.05,140.91-44.27,140.91-94.05-63.09-90.15-140.91-90.15Z"/>
  <path class="cls-2" d="m228.53,179.22c-.07.14-1.45,1.56-.55,2.71,2.18,2.78,8.91,4.38,15.72,2.85,4.05-.91,9.25-5.04,14.28-9.03,5.45-4.33,10.86-8.67,16.3-10.39,5.76-1.83,9.45-1.05,11.89-.31,2.67.8,5.82,2.56,10.84,6.32,9.45,7.1,47.43,40.26,54,45.99,5.28-2.39,30.47-12.56,62.39-19.6-2.78-17.02-13.01-33.25-28.72-45.99-21.89,9.19-50.42,14.7-76.58,1.93-.13-.05-14.29-6.75-28.25-6.42-20.75.48-29.74,9.46-39.25,18.97l-12.05,12.99Z"/>
  <path class="cls-2" d="m349.44,220.97c-.45-.4-44.67-39.09-54.69-46.62-5.8-4.35-9.02-5.46-12.41-5.89-1.76-.23-4.2.1-5.9.57-4.66,1.27-10.75,5.34-16.16,9.63-5.6,4.46-10.88,8.66-15.79,9.76-6.26,1.4-13.91-.25-17.4-2.61-1.41-.95-2.41-2.05-2.89-3.16-1.29-2.99,1.09-5.38,1.48-5.78l12.2-13.2c1.42-1.41,2.85-2.83,4.31-4.23-3.94.51-7.58,1.52-11.12,2.5-4.42,1.24-8.68,2.42-12.98,2.42-1.8,0-11.42-1.58-13.25-2.07-11.05-3.02-23.56-5.97-38.04-12.73-17.35,12.91-28.65,28.77-32,46.56,2.49.66,9.02,2.15,10.71,2.52,39.26,8.73,51.49,17.72,53.71,19.6,2.4-2.67,5.87-4.36,9.73-4.36,4.35,0,8.26,2.19,10.64,5.56,2.25-1.78,5.35-3.3,9.36-3.29,1.82,0,3.71.34,5.62.98,4.43,1.52,6.72,4.47,7.9,7.14,1.48-.67,3.31-1.17,5.46-1.16,2.12,0,4.32.48,6.53,1.44,7.24,3.11,8.36,10.22,7.71,15.58.52-.06,1.04-.08,1.56-.08,8.58,0,15.56,6.98,15.56,15.57,0,2.66-.68,5.16-1.86,7.35,2.34,1.31,8.29,4.28,13.52,3.62,4.17-.53,5.76-1.95,6.32-2.76.39-.55.8-1.2.42-1.66l-11.08-12.3s-1.82-1.73-1.22-2.39c.62-.68,1.75.3,2.55.96,5.64,4.71,12.52,11.81,12.52,11.81.12.08.57.98,3.12,1.43,2.19.39,6.07.17,8.76-2.04.67-.56,1.35-1.25,1.93-1.97-.05.04-.09.08-.13.1,2.84-3.63-.32-7.29-.32-7.29l-12.93-14.52s-1.85-1.71-1.22-2.4c.56-.6,1.75.3,2.56.98,4.09,3.42,9.88,9.23,15.42,14.66,1.09.79,5.96,3.8,12.41-.43,3.92-2.57,4.7-5.73,4.59-8.1-.27-3.15-2.73-5.4-2.73-5.4l-17.66-17.76s-1.87-1.59-1.21-2.4c.54-.68,1.75.3,2.55.96,5.62,4.71,20.86,18.68,20.86,18.68.22.15,5.48,3.9,11.99-.24,2.33-1.49,3.81-3.73,3.94-6.34.22-4.52-2.96-7.2-2.96-7.2Z"/>
  <path class="cls-2" d="m263.76,243.48c-2.74-.03-5.74,1.6-6.13,1.36-.22-.14.17-1.24.42-1.88.27-.63,3.87-11.48-4.92-15.25-6.73-2.89-10.85.36-12.26,1.83-.37.38-.54.35-.58-.13-.14-1.96-1.01-7.24-6.82-9.02-8.3-2.54-13.64,3.25-14.99,5.35-.61-4.73-4.61-8.4-9.5-8.41-5.32,0-9.64,4.3-9.65,9.63,0,5.32,4.31,9.64,9.64,9.64,2.59,0,4.93-1.03,6.66-2.69.06.05.08.14.05.32-.41,2.39-1.15,11.04,7.92,14.57,3.64,1.41,6.73.36,9.29-1.43.76-.54.89-.31.78.41-.33,2.23.09,6.99,6.77,9.7,5.08,2.07,8.09-.04,10.07-1.87.86-.78,1.09-.65,1.14.56.24,6.44,5.59,11.56,12.09,11.57,6.7,0,12.13-5.41,12.13-12.1,0-6.7-5.42-12.06-12.12-12.13Z"/>
  <path class="cls-1" d="m274.35,113.21c-79.31,0-143.6,42.18-143.6,93.92,0,1.34-.02,5.03-.02,5.5,0,54.9,56.19,99.35,143.6,99.35s143.61-44.45,143.61-99.34v-5.51c0-51.74-64.29-93.92-143.59-93.92Zm137.12,83.51c-31.21,6.94-54.49,17.01-60.32,19.61-13.62-11.89-45.1-39.26-53.63-45.66-4.87-3.67-8.2-5.6-11.12-6.47-1.31-.4-3.12-.85-5.45-.85-2.17,0-4.5.39-6.93,1.17-5.51,1.75-11,6.11-16.31,10.33l-.27.22c-4.95,3.93-10.06,8-13.93,8.86-1.69.38-3.43.58-5.16.58-4.34,0-8.23-1.26-9.69-3.12-.24-.31-.08-.81.48-1.52l.07-.1,11.99-12.91c9.39-9.39,18.25-18.25,38.66-18.72.34-.01.68-.02,1.02-.02,12.7.01,25.4,5.69,26.83,6.36,11.91,5.81,24.21,8.76,36.56,8.77,12.85,0,26.11-3.17,40.05-9.58,14.56,12.24,24.21,26.99,27.15,43.06Zm-137.1-77.97c42.1,0,79.76,12.07,105.09,31.07-12.24,5.3-23.91,7.97-35.17,7.97-11.52-.01-23.03-2.78-34.21-8.23-.59-.28-14.61-6.89-29.2-6.9-.38,0-.77,0-1.15.01-17.14.4-26.8,6.49-33.29,11.82-6.31.16-11.76,1.68-16.61,3.03-4.33,1.2-8.06,2.24-11.7,2.24-1.5,0-4.2-.14-4.44-.15-4.18-.13-25.18-5.28-41.95-11.61,25.27-17.96,61.89-29.26,102.64-29.26Zm-107.61,33.01c17.51,7.16,38.76,12.7,45.48,13.13,1.87.12,3.87.34,5.87.34,4.46,0,8.91-1.25,13.21-2.45,2.54-.71,5.35-1.49,8.3-2.05-.79.77-1.58,1.56-2.37,2.35l-12.17,13.17c-.96.97-3.04,3.55-1.67,6.73.54,1.28,1.65,2.51,3.2,3.55,2.9,1.95,8.1,3.28,12.92,3.28,1.83,0,3.57-.18,5.15-.54,5.11-1.14,10.46-5.41,16.13-9.92,4.52-3.59,10.94-8.15,15.86-9.49,1.38-.37,3.06-.61,4.42-.61.41,0,.79.02,1.14.07,3.24.41,6.38,1.51,11.99,5.72,10,7.51,54.22,46.2,54.65,46.58.03.02,2.85,2.46,2.65,6.5-.11,2.26-1.36,4.26-3.54,5.65-1.89,1.2-3.83,1.81-5.8,1.81-2.96,0-4.99-1.39-5.13-1.48-.16-.13-15.31-14.03-20.89-18.7-.89-.74-1.75-1.4-2.62-1.4-.47,0-.88.2-1.16.55-.88,1.08.1,2.58,1.26,3.56l17.7,17.8s2.21,2.06,2.45,4.79c.14,2.95-1.27,5.42-4.2,7.34-2.09,1.38-4.2,2.07-6.27,2.07-2.72,0-4.63-1.24-5.05-1.53l-2.54-2.5c-4.64-4.57-9.43-9.29-12.94-12.21-.86-.71-1.77-1.37-2.64-1.37-.43,0-.82.16-1.12.48-.4.44-.68,1.24.32,2.57.4.55.89,1,.89,1l12.91,14.51c.1.13,2.66,3.17.29,6.19l-.46.58c-.39.42-.8.82-1.2,1.16-2.2,1.81-5.14,2-6.31,2-.63,0-1.22-.05-1.75-.15-1.27-.23-2.13-.58-2.55-1.07l-.16-.16c-.7-.73-7.21-7.38-12.6-11.87-.71-.6-1.6-1.34-2.51-1.34-.45,0-.85.18-1.17.52-1.06,1.17.54,2.91,1.22,3.55l11.01,12.15c-.01.11-.15.36-.41.74-.4.55-1.73,1.88-5.73,2.38-.48.06-.98.09-1.46.09-4.12,0-8.52-2-10.79-3.2,1.03-2.18,1.57-4.58,1.57-6.98,0-9.07-7.36-16.44-16.43-16.45-.19,0-.4,0-.59.01.29-4.14-.29-11.98-8.34-15.43-2.32-1-4.63-1.52-6.87-1.52-1.76,0-3.45.3-5.04.91-1.67-3.24-4.44-5.6-8.04-6.83-2-.69-3.98-1.04-5.9-1.04-3.35,0-6.44.99-9.19,2.94-2.64-3.28-6.62-5.22-10.81-5.22-3.67,0-7.2,1.47-9.81,4.06-3.43-2.62-17.03-11.26-53.44-19.53-1.74-.39-5.69-1.52-8.17-2.25,3.41-16.34,13.8-31.27,29.2-43.52Zm67.54,94.78l-.39-.35h-.4c-.32,0-.66.13-1.11.45-1.86,1.31-3.63,1.94-5.44,1.94-1,0-2.02-.2-3.04-.59-8.44-3.29-7.78-11.25-7.36-13.65.06-.49-.06-.86-.37-1.12l-.6-.49-.56.53c-1.65,1.59-3.8,2.45-6.06,2.45-4.83,0-8.77-3.93-8.76-8.77,0-4.83,3.94-8.76,8.78-8.75,4.37,0,8.09,3.28,8.64,7.65l.3,2.35,1.29-1.99c.14-.23,3.69-5.59,10.2-5.58,1.24,0,2.52.2,3.81.6,5.19,1.58,6.07,6.29,6.2,8.25.09,1.14.91,1.2,1.06,1.2.45,0,.78-.28,1.01-.53.98-1.02,3.11-2.72,6.45-2.72,1.53,0,3.15.37,4.83,1.09,8.25,3.54,4.51,14.02,4.47,14.13-.71,1.74-.74,2.5-.07,2.95l.32.15h.24c.37,0,.83-.16,1.6-.42,1.12-.39,2.81-.97,4.4-.97h0c6.21.07,11.26,5.13,11.26,11.26,0,6.2-5.06,11.24-11.27,11.24-6.07,0-11.01-4.73-11.23-10.74-.02-.52-.07-1.88-1.23-1.88-.47,0-.89.29-1.36.72-1.34,1.24-3.04,2.49-5.52,2.49-1.13,0-2.35-.26-3.64-.79-6.41-2.6-6.5-7-6.24-8.77.07-.47.09-.96-.23-1.35Zm40.07,48.88c-76.26,0-138.08-39.55-138.08-88.33,0-1.96.14-3.91.33-5.84.61.15,6.67,1.59,7.92,1.88,37.19,8.26,49.48,16.85,51.56,18.48-.7,1.69-1.07,3.51-1.07,5.35,0,7.69,6.25,13.95,13.93,13.95.86,0,1.72-.08,2.56-.24,1.16,5.66,4.86,9.95,10.51,12.15,1.65.63,3.32.96,4.97.96,1.06,0,2.13-.13,3.17-.39,1.05,2.65,3.39,5.96,8.65,8.09,1.84.74,3.68,1.13,5.47,1.13,1.46,0,2.89-.26,4.25-.76,2.52,6.13,8.51,10.2,15.19,10.2,4.43,0,8.68-1.8,11.78-4.99,2.65,1.48,8.25,4.15,13.91,4.16.73,0,1.41-.05,2.11-.13,5.62-.71,8.23-2.91,9.43-4.62.22-.3.41-.62.58-.95,1.32.38,2.78.69,4.46.7,3.07,0,6.01-1.05,8.99-3.21,2.93-2.11,5.01-5.14,5.31-7.72,0-.03,0-.07.01-.11.99.2,2,.3,3.01.3,3.16,0,6.27-.98,9.24-2.93,5.73-3.75,6.72-8.66,6.63-11.87,1.01.21,2.03.32,3.05.32,2.96,0,5.88-.89,8.65-2.66,3.55-2.27,5.69-5.75,6.02-9.79.21-2.75-.47-5.53-1.91-7.91,9.58-4.13,31.48-12.12,57.27-17.93.11,1.46.17,2.93.17,4.41,0,48.78-61.82,88.33-138.07,88.33Z"/>
  <g>
    <path class="cls-1" d="m910.26,142.12c-5.21-6.54-13.13-9.8-23.75-9.8s-18.53,3.27-23.74,9.8c-5.22,6.53-7.83,14.25-7.83,23.16s2.61,16.81,7.83,23.26c5.21,6.43,13.13,9.65,23.74,9.65s18.54-3.22,23.75-9.65c5.22-6.45,7.82-14.19,7.82-23.26s-2.6-16.63-7.82-23.16Zm-12.92,37.48c-2.53,3.35-6.15,5.04-10.89,5.04s-8.36-1.69-10.91-5.04c-2.55-3.35-3.82-8.13-3.82-14.32s1.27-10.95,3.82-14.29c2.55-3.34,6.19-5.01,10.91-5.01s8.35,1.67,10.89,5.01c2.53,3.34,3.8,8.11,3.8,14.29s-1.27,10.97-3.8,14.32Z"/>
    <path class="cls-1" d="m776.98,136.65c-5.29-2.68-11.34-4.03-18.15-4.03-10.47,0-17.86,2.73-22.17,8.18-2.71,3.49-4.22,7.95-4.58,13.37h15.65c.38-2.4,1.15-4.29,2.31-5.69,1.61-1.89,4.36-2.84,8.23-2.84,3.46,0,6.08.48,7.88,1.45,1.78.96,2.68,2.72,2.68,5.26,0,2.09-1.16,3.61-3.49,4.61-1.3.57-3.46,1.04-6.48,1.42l-5.55.68c-6.3.8-11.08,2.13-14.32,3.99-5.92,3.41-8.88,8.93-8.88,16.55,0,5.87,1.83,10.41,5.52,13.61,3.67,3.21,8.34,4.55,13.98,4.81,35.37,1.59,34.98-18.64,35.3-22.84v-23.27c0-7.47-2.65-12.55-7.93-15.25Zm-8.22,35.32c-.11,5.42-1.66,9.15-4.64,11.2-2.99,2.05-6.24,3.07-9.78,3.07-2.24,0-4.14-.63-5.7-1.85-1.56-1.23-2.34-3.24-2.34-6.01,0-3.1,1.28-5.39,3.83-6.88,1.51-.87,3.99-1.61,7.45-2.2l3.69-.69c1.84-.35,3.28-.73,4.34-1.13,1.07-.38,2.1-.9,3.13-1.55v6.03Z"/>
    <path class="cls-1" d="m696.32,146.48c4.05,0,7.01,1.25,8.94,3.75,1.31,1.84,2.13,3.93,2.45,6.24h17.45c-.95-8.81-4.03-14.95-9.24-18.43-5.22-3.47-11.9-5.21-20.07-5.21-9.61,0-17.15,2.95-22.61,8.84-5.46,5.9-8.2,14.15-8.2,24.75,0,9.38,2.47,17.04,7.42,22.93,4.95,5.89,12.66,8.84,23.14,8.84s18.42-3.53,23.76-10.61c3.35-4.38,5.23-9.03,5.62-13.94h-17.39c-.36,3.25-1.37,5.9-3.06,7.94-1.67,2.03-4.5,3.06-8.5,3.06-5.63,0-9.47-2.57-11.5-7.72-1.12-2.75-1.69-6.38-1.69-10.91s.57-8.54,1.69-11.43c2.12-5.39,6.05-8.1,11.79-8.1Z"/>
    <path class="cls-1" d="m660.36,132.83c-35.85,0-33.72,31.73-33.72,31.73v32.24h16.27v-30.23c0-4.96.63-8.62,1.86-11.01,2.23-4.23,6.6-6.35,13.1-6.35.49,0,1.13.03,1.92.07.79.04,1.69.11,2.73.23v-16.55c-.72-.05-1.19-.07-1.39-.1-.21-.02-.46-.03-.77-.03Z"/>
    <path class="cls-1" d="m613.6,144.85c-2.81-4.16-6.38-7.21-10.68-9.15-4.31-1.92-9.15-2.88-14.52-2.88-9.06,0-16.42,2.85-22.1,8.56-5.67,5.72-8.52,13.92-8.52,24.63,0,11.43,3.15,19.67,9.44,24.74,6.28,5.06,13.54,7.61,21.76,7.61,9.96,0,17.71-3.01,23.24-9.02,2.99-3.16,4.86-6.29,5.65-9.38h-17.26c-.68.98-1.41,1.81-2.22,2.46-2.3,1.89-5.42,2.47-9.09,2.47-3.47,0-6.2-.52-8.66-2.07-4.06-2.5-6.35-6.72-6.59-12.91h45.01c.06-5.34-.11-9.43-.54-12.27-.74-4.84-2.4-9.1-4.92-12.77Zm-39.15,14.38c.58-4.02,2.03-7.2,4.3-9.56,2.29-2.35,5.5-3.53,9.65-3.53,3.81,0,7.01,1.11,9.59,3.34,2.57,2.22,4,5.48,4.3,9.75h-27.83Z"/>
    <path class="cls-1" d="m525.46,132.61c-7.55,0-14.08,3.31-18.47,8.61-4.17-5.3-10.59-8.61-18.48-8.61-15.89,0-26.13,11.67-26.13,27.12v37.06h14.87v-37.41c0-6.83,4.62-11.55,11.27-11.55,9.8,0,10.81,8.13,10.81,11.55v37.41h14.87v-37.41c0-6.83,4.73-11.55,11.26-11.55,9.8,0,10.93,8.13,10.93,11.55v37.41h14.85v-37.06c0-15.93-9.56-27.12-25.79-27.12Z"/>
    <path class="cls-1" d="m833.71,124.7l-.02,17.43c-1.81-2.92-4.17-5.2-7.08-6.83-2.9-1.64-6.23-2.47-9.98-2.47-8.13,0-14.6,3.03-19.46,9.06-4.86,6.05-7.29,14.77-7.29,25.31,0,9.15,2.47,16.65,7.4,22.49,4.93,5.83,14.6,8.39,23.19,8.39,29.95,0,29.6-25.68,29.6-25.68v-59.11s-16.37-1.75-16.37,11.41Zm-3.13,55.04c-2.37,3.4-5.86,5.1-10.43,5.1s-7.98-1.72-10.23-5.13c-2.25-3.43-3.37-8.41-3.37-14.11,0-5.3,1.1-9.72,3.31-13.29,2.21-3.57,5.67-5.36,10.4-5.36,3.1,0,5.82.98,8.17,2.94,3.81,3.25,5.73,9.09,5.73,16.64,0,5.4-1.2,9.81-3.58,13.21Z"/>
  </g>
  <path class="cls-1" d="m496.75,221.66c-13.4-.63-20.16,2.56-24.57,5.93-6.09,4.65-9.8,11.53-9.8,22.52v56.51h7.88c2.11,0,4.22-.73,5.77-2.16,1.74-1.6,2.61-3.56,2.61-5.86v-21.12c1.92,3.31,4.45,5.74,7.65,7.32,3.03,1.41,6.53,2.12,10.51,2.12,7.49,0,13.64-2.98,18.41-8.97,4.78-6.15,7.17-14.15,7.17-24.06s-2.26-16.97-7.68-23.57c-4.38-5.34-11.04-8.35-17.94-8.66Zm5.55,46.38c-2.39,3.31-5.66,4.96-9.8,4.96-4.46,0-7.89-1.64-10.28-4.96-2.39-2.99-3.59-7.45-3.59-13.45,0-6.43,1.11-11.16,3.34-14.15,2.4-3.29,5.75-4.96,10.05-4.96s7.89,1.66,10.28,4.96c2.4,3.31,3.59,8.02,3.59,14.15,0,5.68-1.19,10.14-3.59,13.45Z"/>
  <path class="cls-1" d="m636.47,227.49c-5.53-4.19-11.18-6.38-20.89-6.12-9.86.27-17.03,3.03-21.49,9.07-4.46,6.05-6.68,13.95-6.68,23.68,0,8.33,1.68,15.04,5.04,20.17,3.37,5.1,7.4,8.6,12.1,10.47,4.68,1.89,9.42,2.28,14.2,1.19,4.77-1.11,8.57-3.84,11.39-8.24v3.99c-.32,5.03-1.53,8.8-3.63,11.32-2.13,2.5-4.47,4.04-7.06,4.59-2.56.54-5.16.24-7.73-.95-2.59-1.17-4.5-2.87-5.75-5.06h-17.14c4.44,13.34,12.41,19.23,26.77,20.27,23.16,1.67,30.54-17.94,30.52-28.52v-33.25c0-10.99-3.58-18.03-9.63-22.63Zm-6.81,32.66c-.63,3.68-1.64,6.4-3.06,8.12-2.97,4.08-7.6,5.53-13.84,4.37-6.27-1.19-9.4-7.2-9.4-18.03,0-5.03.93-9.51,2.82-13.45,1.88-3.91,5.47-5.89,10.79-5.89,3.91,0,6.89,1.42,8.92,4.24,2.04,2.83,3.34,6.05,3.88,9.67.55,3.61.5,7.27-.12,10.96Z"/>
  <path class="cls-1" d="m573.49,225.84c-5.29-2.67-11.34-4.03-18.15-4.03-10.47,0-17.85,2.73-22.15,8.19-2.7,3.48-4.22,7.94-4.58,13.36h15.65c.38-2.39,1.15-4.29,2.3-5.68,1.61-1.89,4.36-2.85,8.23-2.85,3.47,0,6.09.48,7.88,1.45,1.78.96,2.67,2.72,2.67,5.26,0,2.08-1.16,3.62-3.49,4.6-1.3.57-3.46,1.04-6.48,1.42l-5.54.67c-6.3.8-11.09,2.13-14.31,3.99-5.93,3.41-8.88,8.92-8.88,16.54,0,5.87,1.83,10.41,5.52,13.61,3.67,3.21,8.34,4.55,13.99,4.81,35.36,1.58,34.96-18.64,35.28-22.84v-23.27c0-7.46-2.63-12.54-7.92-15.24Zm-8.22,35.31c-.1,5.43-1.66,9.15-4.63,11.2-2.98,2.05-6.24,3.07-9.78,3.07-2.24,0-4.13-.63-5.7-1.85-1.56-1.23-2.34-3.23-2.34-6,0-3.1,1.28-5.39,3.83-6.87,1.52-.87,3.99-1.61,7.45-2.2l3.7-.68c1.84-.35,3.29-.72,4.33-1.12,1.07-.39,2.11-.91,3.14-1.56v6.03Z"/>
  <path class="cls-1" d="m707.61,230.97c-5.22-6.54-13.14-9.81-23.76-9.81s-18.52,3.26-23.73,9.81c-5.22,6.53-7.83,14.24-7.83,23.15s2.61,16.8,7.83,23.25c5.21,6.42,13.13,9.64,23.73,9.64s18.53-3.22,23.76-9.64c5.21-6.45,7.81-14.19,7.81-23.25s-2.6-16.62-7.81-23.15Zm-12.93,37.46c-2.53,3.36-6.15,5.05-10.87,5.05s-8.36-1.69-10.91-5.05c-2.56-3.35-3.83-8.12-3.83-14.31s1.27-10.95,3.83-14.29c2.54-3.34,6.18-5.01,10.91-5.01s8.35,1.67,10.87,5.01c2.53,3.34,3.79,8.1,3.79,14.29s-1.26,10.96-3.79,14.31Z"/>
</svg>
        </div>
        <p class="paystrip-cap">Tarjeta, transferencia y QR</p>
      </div>
      <div class="paystrip-card">
        <div class="paystrip-mark">
          <svg viewBox="0 0 120 60" fill-rule="evenodd" fill="#6772e5" xmlns="http://www.w3.org/2000/svg"><path d="M101.547 30.94c0-5.885-2.85-10.53-8.3-10.53-5.47 0-8.782 4.644-8.782 10.483 0 6.92 3.908 10.414 9.517 10.414 2.736 0 4.805-.62 6.368-1.494v-4.598c-1.563.782-3.356 1.264-5.632 1.264-2.23 0-4.207-.782-4.46-3.494h11.24c0-.3.046-1.494.046-2.046zM90.2 28.757c0-2.598 1.586-3.678 3.035-3.678 1.402 0 2.897 1.08 2.897 3.678zm-14.597-8.345c-2.253 0-3.7 1.057-4.506 1.793l-.3-1.425H65.73v26.805l5.747-1.218.023-6.506c.828.598 2.046 1.448 4.07 1.448 4.115 0 7.862-3.3 7.862-10.598-.023-6.667-3.816-10.3-7.84-10.3zm-1.38 15.84c-1.356 0-2.16-.483-2.713-1.08l-.023-8.53c.598-.667 1.425-1.126 2.736-1.126 2.092 0 3.54 2.345 3.54 5.356 0 3.08-1.425 5.38-3.54 5.38zm-16.4-17.196l5.77-1.24V13.15l-5.77 1.218zm0 1.747h5.77v20.115h-5.77zm-6.185 1.7l-.368-1.7h-4.966V40.92h5.747V27.286c1.356-1.77 3.655-1.448 4.368-1.195v-5.287c-.736-.276-3.425-.782-4.782 1.7zm-11.494-6.7L34.535 17l-.023 18.414c0 3.402 2.552 5.908 5.954 5.908 1.885 0 3.264-.345 4.023-.76v-4.667c-.736.3-4.368 1.356-4.368-2.046V25.7h4.368v-4.897h-4.37zm-15.54 10.828c0-.897.736-1.24 1.954-1.24a12.85 12.85 0 0 1 5.7 1.47V21.47c-1.908-.76-3.793-1.057-5.7-1.057-4.667 0-7.77 2.437-7.77 6.506 0 6.345 8.736 5.333 8.736 8.07 0 1.057-.92 1.402-2.207 1.402-1.908 0-4.345-.782-6.276-1.84v5.47c2.138.92 4.3 1.3 6.276 1.3 4.782 0 8.07-2.368 8.07-6.483-.023-6.85-8.782-5.632-8.782-8.207z"/></svg>
        </div>
        <p class="paystrip-cap">Tarjeta internacional</p>
      </div>
    </div>
  </div>
</section>

<!-- 10 — TESTIMONIALS -->
<section class="testi">
  <div class="wrap">
    <div class="testi-header reveal">
      <p class="section-label">// 10 — Consultorios que ya lo usan</p>
      <h2 class="section-title">Tres consultorios, tres números</h2>
      <p class="section-sub" style="margin:0 auto;text-align:center;">Cada cifra viene de la cuenta del propio consultorio, publicada con su autorización.</p>
    </div>
    <div class="testi-grid reveal-group">
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Antes perdía al menos 8 citas por semana. Con los recordatorios por WhatsApp ese número bajó a casi cero."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          −87% citas perdidas · Mes 1
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dcfce7;color:#15803d;">RM</div>
          <div>
            <div class="testi-name">Dr. Rodrigo M.</div>
            <div class="testi-role">Medicina general · Bogotá</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"La reactivación automática me devolvió pacientes que llevaban meses sin volver. No le escribí a nadie manualmente."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          +35% pacientes que volvieron · Mes 2
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dbeafe;color:#1d4ed8;">LV</div>
          <div>
            <div class="testi-name">Dra. Lucía V.</div>
            <div class="testi-role">Dermatología · Medellín</div>
          </div>
        </div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Empecé solo por ordenar la agenda. Terminé quitando la libreta, el Excel y el WhatsApp personal del consultorio."</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          3 herramientas reemplazadas
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#f3e8ff;color:#7e22ce;">CE</div>
          <div>
            <div class="testi-name">Dr. Carlos E.</div>
            <div class="testi-role">Ortopedia · Cali</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 11 — FAQ -->
<section class="faq" id="preguntas">
  <div class="wrap">
    <div class="faq-header reveal">
      <p class="section-label">// 11 — Preguntas</p>
      <h2 class="section-title">Lo que preguntan antes de decidir</h2>
      <p class="section-sub" style="margin:0 auto 8px;text-align:center;">Si te falta algo, escríbenos por WhatsApp y te responde una persona.</p>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-dark btn-sm" style="margin-top:8px;">Hablar con un estratega</a>
    </div>
    <div class="faq-grid">
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Qué incluye exactamente la prueba de 30 días?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Agenda, página de reserva personalizable, seguimiento de hasta 10 pacientes activos, presupuestos, cobros y anticipo al reservar, más WhatsApp sin límite de mensajes y un tope de cortesía de 30 respuestas de Zen al mes. La idea es que puedas ver funcionar la confirmación automática antes de pagar. No pedimos tarjeta y no cobramos nada de forma automática.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Qué hace Zen y qué no hace?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Zen contesta preguntas frecuentes con la información que tú configuras, agenda y mueve citas dentro de la conversación, y dentro del sistema ejecuta lo que le dictas después de que lo confirmas. No opina de temas clínicos: si la pregunta se sale de lo configurado, pasa la conversación a una persona del equipo.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Funciona para mi especialidad?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Trabajamos con odontología, dermatología, ortopedia, psicología, oftalmología y medicina estética, entre otras. Las plantillas de WhatsApp, los campos del seguimiento y las automatizaciones se configuran por tipo de consulta, así que el sistema se adapta a cómo trabajas tú y no al revés.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Es un sistema de expediente clínico?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">No, y es una decisión deliberada. Zentro gestiona la parte comercial y operativa: citas, pacientes, comunicaciones, presupuestos y cobros. Eso lo mantiene válido en varias especialidades y siete países, sin atarte al formato clínico o fiscal de uno solo. Tus notas viven en la ficha, pero no sustituyen el expediente que te exija tu normativa local.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Tengo que contratar Marketing para usar el sistema?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">No. Ningún plan lo requiere y el sistema funciona completo por su cuenta. Zentro Med Marketing es un servicio aparte para quien además quiere campañas gestionadas, y si ya pagas un plan del sistema, su valor se descuenta del precio de Marketing. Nunca pagas dos veces.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Puedo cancelar cuando quiera?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí, sin contratos ni penalidades. Tus datos, accesos y activos son tuyos desde el primer día; al cancelar simplemente revocas nuestro acceso. Puedes exportar tu información de pacientes y citas antes de irte, y tu cuenta pasa a solo lectura en vez de desaparecer.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Y si ya tengo otro sistema de citas?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">La transición es gradual y no tienes que apagar nada de golpe. Tu estratega revisa el setup actual, importa tus pacientes y define el plan de migración para que no pierdas ninguna cita ni información. Lo normal es correr los dos sistemas una o dos semanas hasta que el equipo se acomoda.</div></div>
      </div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="wrap">
    <p class="section-label" style="color:rgba(74,222,90,.6);margin-bottom:16px;">// Empieza hoy</p>
    <h2>Empieza hoy y cuenta<br><span>tus citas perdidas en 30 días.</span></h2>
    <p>Con WhatsApp y Zen incluidos en la prueba. Sin tarjeta, sin permanencia y con tus datos siempre tuyos.</p>
    <div class="cta-btns">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'cta_final'});">Empezar gratis · sin tarjeta</a>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-ghost-light btn-lg">Hablar con un estratega</a>
    </div>
    <p class="cta-note">// Sin tarjeta · Sin permanencia · Cancela cuando quieras</p>
    <p style="max-width:820px;margin:36px auto 0;font-size:10.5px;line-height:1.8;color:var(--zm-muted2);font-family:'IBM Plex Mono',monospace;">La reducción del 54% en citas perdidas es el promedio de nuestros clientes activos en sus primeros 90 días; los resultados varían según especialidad y volumen de pacientes. La activación en 24 horas cubre CRM, agenda, WhatsApp y Zen. Cada plan incluye una cuota mensual de respuestas de Zen, ampliable desde $5 USD por cada 1,000 adicionales. Zentro Med es software de gestión comercial: no es un sistema de expediente clínico ni de facturación tributaria de un país específico. Los precios de marketing no incluyen la inversión publicitaria en Meta ni Google. Los datos se almacenan cifrados en tránsito y en reposo conforme a la Ley 1581 de 2012.</p>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="foot-i">
      <span style="color:var(--zm-muted2);">© 2026 Zentro Labs · <a href="https://zentrolabs.com">zentrolabs.com</a></span>
      <span><a href="https://zentrolabs.com/privacidad.html">Privacidad</a> · <a href="/terminos">Términos</a> · <a href="mailto:hello@zentrolabs.com">hello@zentrolabs.com</a></span>
    </div>
  </div>
</footer>

<!-- ZOHO SALES IQ -->
<script>window.$zoho=window.$zoho || {};$zoho.salesiq=$zoho.salesiq||{ready:function(){}}</script><script id="zsiqscript" src="https://salesiq.zohopublic.com/widget?wc=siq095599e56261c52d8b320752d1a1226917c754ddd852bd872511517297602428" defer></script>

<!-- MOBILE STICKY CTA -->
<div class="mob-cta">
  <div class="mob-cta-info">
    <span class="mob-cta-price">30 días gratis</span>
    <span class="mob-cta-sub">sin tarjeta · WhatsApp y Zen incluidos</span>
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
  USD: { sym:'$', rate:1,    flagUrl:'https://flagcdn.com/20x15/us.png', label:'USD' },
  MXN: { sym:'$', rate:17.5, flagUrl:'https://flagcdn.com/20x15/mx.png', label:'MXN' },
  COP: { sym:'$', rate:4100, flagUrl:'https://flagcdn.com/20x15/co.png', label:'COP' },
  ARS: { sym:'$', rate:1050, flagUrl:'https://flagcdn.com/20x15/ar.png', label:'ARS' },
  GTQ: { sym:'Q', rate:7.75, flagUrl:'https://flagcdn.com/20x15/gt.png', label:'GTQ' }
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
  document.getElementById('currFlag').src = c.flagUrl;
  document.getElementById('currCode').textContent = code;
  // Close & mark active
  document.getElementById('currSwitch').classList.remove('open');
  document.querySelectorAll('.curr-opt').forEach(el =>
    el.classList.toggle('curr-active', el.dataset.curr === code)
  );
}

// Auto-selects the visitor's local currency on first paint, best-effort —
// ipwho.is (free, no API key, already approved for this exact purpose on
// the old /pricing page's local-currency estimate) resolves IP -> country.
// Only acts when that country maps to one of the currencies this switcher
// already supports; anything else (unmapped country, blocked/slow/failed
// request) is a silent no-op and the page just stays on USD, which is
// already the default. Never overrides a currency the visitor already
// picked by hand this session.
var ZM_GEO_CURRENCY = { MX: 'MXN', CO: 'COP', AR: 'ARS', GT: 'GTQ' };
var ZM_GEO_CACHE_KEY = 'zentro_geo_currency_v1';
function zmAutoDetectCurrency() {
  try {
    var cached = sessionStorage.getItem(ZM_GEO_CACHE_KEY);
    if (cached) {
      if (ZM_CURR[cached] && cached !== 'USD') zmSetCurr(cached);
      return;
    }
  } catch (e) { /* sessionStorage unavailable — just skip the cache */ }

  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timeout = controller ? setTimeout(function () { controller.abort(); }, 2500) : null;
  fetch('https://ipwho.is/', controller ? { signal: controller.signal } : {})
    .then(function (res) { return res.json(); })
    .then(function (geo) {
      if (timeout) clearTimeout(timeout);
      var currency = geo && geo.success !== false ? ZM_GEO_CURRENCY[geo.country_code] : null;
      try { sessionStorage.setItem(ZM_GEO_CACHE_KEY, currency || 'USD'); } catch (e) {}
      if (currency) zmSetCurr(currency);
    })
    .catch(function () { /* best-effort: stays on USD */ });
}

/* ── ROI CALCULATOR ──
   Each [data-roi] block owns two inputs (citas perdidas, valor de la
   consulta) and a fixed data-roi-ratio — the fraction of "lo perdido"
   that recordatorios + reactivación recuperan, tuned per page so the
   calculator's default render matches that page's own headline
   numbers. Only "se pierden hoy" and "recuperas al mes" recompute
   live; the "×" badge next to the plan is left as static editorial
   copy since it isn't a pure function of these two inputs. */
function zmRoiUpdate(root) {
  (root ? [root] : document.querySelectorAll('[data-roi]')).forEach(function(calc) {
    var citasEl = calc.querySelector('[data-roi-citas]');
    var valorEl = calc.querySelector('[data-roi-valor]');
    if (!citasEl || !valorEl) return;
    var citas = parseFloat(citasEl.value) || 0;
    var valor = parseFloat(valorEl.value) || 0;
    var ratio = parseFloat(calc.dataset.roiRatio) || 0;
    var perdidas = Math.round(citas * valor);
    var recupera = Math.round(perdidas * ratio);
    var perdidasEl = calc.querySelector('[data-roi-perdidas]');
    var recuperaEl = calc.querySelector('[data-roi-recupera]');
    if (perdidasEl) perdidasEl.textContent = '$' + perdidas.toLocaleString('en-US');
    if (recuperaEl) recuperaEl.textContent = '$' + recupera.toLocaleString('en-US');
  });
}
document.addEventListener('DOMContentLoaded', function() { zmRoiUpdate(); zmAutoDetectCurrency(); });

/* ── ESPECIALIDAD SWITCHER (nav dropdown on /especialidad/[slug]) ── */
function zmToggleEspSwitch(e) {
  e.stopPropagation();
  document.getElementById('espSwitch').classList.toggle('open');
}
document.addEventListener('click', function() {
  var el = document.getElementById('espSwitch');
  if (el) el.classList.remove('open');
});
`;
