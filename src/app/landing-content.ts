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
    <p class="hero-sub">Zentro Med confirma cada cita por WhatsApp, agenda sola y te trae de vuelta a los pacientes que dejaron de venir. <strong style="color:rgba(255,255,255,.85);">Sin contratar a nadie más.</strong></p>
    <div class="hero-ctas">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'hero_primary'});">Empezar gratis · sin tarjeta</a>
      <a href="#producto" class="btn btn-ghost-light btn-lg">Ver el producto · 3 min</a>
    </div>
    <p class="hero-note">// WhatsApp y Zen incluidos en la prueba · Listo en 24 horas</p>

    <!-- Hero UI Widgets — muestra contexto del producto sin necesitar imagen -->
    <p style="text-align:center;font-size:10.5px;color:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace;margin-bottom:8px;">// Ejemplos ilustrativos del producto</p>
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
<div class="stats-bar" style="background:var(--zm-night);border-color:rgba(255,255,255,.07);">
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
        <div class="leak-num" style="color:#dc2626;">1 de 5</div>
        <div class="leak-num-label">Pacientes con cita no se presenta</div>
        <div class="leak-title">El paciente no llega y nadie lo llamó</div>
        <div class="leak-text">Confirmar una por una consume la mañana de recepción, así que se deja de hacer. El hueco queda vacío y el ingreso de esa hora no se recupera.</div>
        <div class="leak-fix">
          <span class="leak-fix-label">Cómo se cierra</span>
          <div class="leak-fix-text">Confirmación por WhatsApp 24 horas antes, en todos los planes, sin que nadie se acuerde.</div>
        </div>
      </div>
      <div class="leak-card">
        <div class="leak-num" style="color:#b45309;">5×</div>
        <div class="leak-num-label">Más caro recuperarlo que retenerlo</div>
        <div class="leak-title">El paciente que no agendó su siguiente cita</div>
        <div class="leak-text">Sale del consultorio sin fecha, y sin seguimiento simplemente desaparece del radar. Nadie decide perderlo: se pierde por omisión.</div>
        <div class="leak-fix">
          <span class="leak-fix-label">Cómo se cierra</span>
          <div class="leak-fix-text">Detecta quién no ha vuelto en 30, 60 o 90 días y le escribe un mensaje personalizado.</div>
        </div>
      </div>
      <div class="leak-card">
        <div class="leak-num" style="color:#1d4ed8;">3</div>
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
<section class="solution" id="zen-preview">
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
    <p style="text-align:center;margin-top:20px;font-size:11.5px;color:var(--zm-muted2);font-family:'JetBrains Mono',monospace;">// La infraestructura de Zen va incluida — no necesitas cuentas propias en ningún proveedor de IA</p>
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

    <div class="reveal" style="margin-top:56px;background:var(--zm-night);border-radius:22px;padding:clamp(28px,4vw,44px);">
      <p class="section-label" style="color:rgba(74,222,90,.6);text-align:center;">// También en tu teléfono</p>
      <h3 style="text-align:center;font-size:clamp(20px,2.4vw,28px);font-weight:800;color:var(--zm-white);letter-spacing:-.03em;margin-bottom:10px;">Entre paciente y paciente, sin sentarte a la computadora</h3>
      <p style="text-align:center;font-size:14px;color:rgba(255,255,255,.5);max-width:600px;margin:0 auto 28px;line-height:1.7;">La app de Android muestra lo que necesitas junto al sillón: quién está en consulta, qué citas faltan por confirmar y qué presupuestos siguen sin respuesta.</p>
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
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Agenda y página de citas</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Seguimiento de pacientes</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Presupuestos y cobros</div>
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
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span><span class="pf-ai-num">Zen redacta y tú apruebas</span> · 300 al mes <span class="pf-ai-pill">IA</span></span></div>
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
      <p style="font-size:13px;color:var(--zm-muted);line-height:1.7;"><strong>La prueba sí incluye Zen:</strong> 100 mensajes de WhatsApp y 50 respuestas de Zen, de cortesía — para que veas funcionar lo que promete esta página antes de pagar. Al terminar los 30 días eliges plan; si no eliges, tu cuenta pasa a solo lectura y conservas tus datos. Nunca cobramos sin que actives un plan.</p>
    </div>
  </div>
</section>

<!-- CROSS-SELL: ZENTRO MED MARKETING -->
<section class="solution" id="marketing" style="background:var(--zm-night);padding-top:clamp(64px,9vw,100px);padding-bottom:clamp(64px,9vw,100px);">
  <div class="wrap">
    <div class="reveal" style="max-width:700px;margin:0 auto;text-align:center;">
      <p class="section-label" style="color:#a5b4fc;">// 06 — Zentro Med Marketing</p>
      <h2 class="section-title" style="color:var(--zm-white);">El sistema ordena tu agenda. <span style="color:#a5b4fc;">Marketing la llena.</span></h2>
      <p class="section-sub" style="color:rgba(255,255,255,.5);margin:14px auto 0;">Un servicio aparte y opcional: un equipo que gestiona tus campañas de Meta y Google Ads y produce el contenido, para traerte pacientes que hoy no te conocen. Incluye el sistema de gestión en el precio, sobre tu misma cuenta, sin migrar nada.</p>
    </div>
    <div class="reveal-group marketing-plans-grid">
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;">
        <div style="font-size:13px;font-weight:800;color:var(--zm-white);margin-bottom:6px;">Med Starter</div>
        <div style="font-size:22px;font-weight:800;color:#a5b4fc;margin-bottom:8px;">$324<span style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;"> USD/mes + $129 instalación</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;">Incluye el sistema Profesional (valor $79) + 1 campaña activa en Meta Ads + contenido mensual</div>
      </div>
      <div style="background:rgba(99,102,241,.1);border:2px solid rgba(129,140,248,.5);border-radius:16px;padding:22px;position:relative;">
        <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#818cf8;color:#1e1b4b;font-size:9px;font-weight:800;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;">Recomendado</div>
        <div style="font-size:13px;font-weight:800;color:var(--zm-white);margin-bottom:6px;">Med Growth</div>
        <div style="font-size:22px;font-weight:800;color:#a5b4fc;margin-bottom:8px;">$519<span style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;"> USD/mes + $259 instalación</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.55);line-height:1.6;">Incluye el sistema Clínica (valor $149) + Meta y Google Ads + página de aterrizaje por especialidad</div>
      </div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;">
        <div style="font-size:13px;font-weight:800;color:var(--zm-white);margin-bottom:6px;">Med Premium</div>
        <div style="font-size:22px;font-weight:800;color:#a5b4fc;margin-bottom:8px;">$974<span style="font-size:12px;color:rgba(255,255,255,.4);font-weight:600;"> USD/mes + $389 instalación</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;">Incluye el sistema Clínica (valor $149) + posicionamiento local + ejecutivo de cuenta dedicado</div>
      </div>
    </div>
    <div class="reveal" style="text-align:center;margin-top:36px;">
      <a href="/marketing" class="btn btn-lg" style="background:#818cf8;color:#1e1b4b;" onclick="if(typeof gtag!=='undefined')gtag('event','cross_sell_click',{event_category:'cta',event_label:'crm_to_maas'});">Conocer Zentro Med Marketing →</a>
      <p style="margin-top:12px;font-size:12px;color:rgba(255,255,255,.35);font-family:'JetBrains Mono',monospace;">// Si ya tienes un plan del sistema, su valor se descuenta del precio de Marketing — nunca pagas dos veces</p>
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
        <p style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Hoy · 2 min</p>
        <div class="step-title">Activa tu cuenta</div>
        <div class="step-desc">Sin tarjeta. Entras y ya tienes agenda, pacientes y el tope de cortesía de WhatsApp y Zen.</div>
      </div>
      <div class="how-step">
        <div class="step-num">2</div>
        <p style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">En 24 horas</p>
        <div class="step-title">Un estratega lo configura</div>
        <div class="step-desc">Le cuentas cómo funciona tu consultorio en una llamada. Él deja WhatsApp, agenda y recordatorios listos.</div>
      </div>
      <div class="how-step">
        <div class="step-num">3</div>
        <p style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Día 2</p>
        <div class="step-title">Tu equipo entra</div>
        <div class="step-desc">Recepción, doctores y administración usan la misma bandeja y la misma agenda, con permisos por rol.</div>
      </div>
      <div class="how-step">
        <div class="step-num">4</div>
        <p style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:var(--zm-g3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Día 30</p>
        <div class="step-title">Compara tus números</div>
        <div class="step-desc">Cuenta cuántas citas se te cayeron este mes contra el anterior. Con ese dato decides si sigues.</div>
      </div>
    </div>
  </div>
</section>

<!-- 08 — TESTIMONIALS -->
<section class="testi">
  <div class="wrap">
    <div class="testi-header reveal">
      <p class="section-label">// 08 — Consultorios que ya lo usan</p>
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

<!-- 09 — FAQ -->
<section class="faq" id="preguntas">
  <div class="wrap">
    <div class="faq-header reveal">
      <p class="section-label">// 09 — Preguntas</p>
      <h2 class="section-title">Lo que preguntan antes de decidir</h2>
      <p class="section-sub" style="margin:0 auto 8px;text-align:center;">Si te falta algo, escríbenos por WhatsApp y te responde una persona.</p>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-dark btn-sm" style="margin-top:8px;">Hablar con un estratega</a>
    </div>
    <div class="faq-grid">
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Qué incluye exactamente la prueba de 30 días?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Agenda, página pública de citas, seguimiento de pacientes, presupuestos y cobros, más un tope de cortesía de 100 mensajes de WhatsApp y 50 respuestas de Zen. La idea es que puedas ver funcionar la confirmación automática antes de pagar. No pedimos tarjeta y no cobramos nada de forma automática.</div></div>
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
    <p style="max-width:820px;margin:36px auto 0;font-size:10.5px;line-height:1.8;color:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace;">La reducción del 54% en citas perdidas es el promedio de nuestros clientes activos en sus primeros 90 días; los resultados varían según especialidad y volumen de pacientes. La activación en 24 horas cubre CRM, agenda, WhatsApp y Zen. Cada plan incluye una cuota mensual de respuestas de Zen, ampliable desde $5 USD por cada 1,000 adicionales. Zentro Med es software de gestión comercial: no es un sistema de expediente clínico ni de facturación tributaria de un país específico. Los precios de marketing no incluyen la inversión publicitaria en Meta ni Google. Los datos se almacenan cifrados en tránsito y en reposo conforme a la Ley 1581 de 2012.</p>
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
document.addEventListener('DOMContentLoaded', function() { zmRoiUpdate(); });

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
