// Static content for the Zen landing (src/app/zen/page.tsx).
// Sibling to src/app/landing-content.ts and src/app/marketing/marketing-content.ts
// — same raw-HTML-string architecture, same landing.css design system,
// same LANDING_BEHAVIOR_SCRIPT (mobile menu, FAQ accordion, scroll-reveal,
// ROI-calculator recompute — all generic DOM-query based, nothing
// landing-page-specific, so it's imported rather than duplicated). Uses
// the CRM root landing's own green accent since Zen is a feature of
// Zentro Med, not a separate paid service like Marketing.

export const ZEN_STRUCTURED_DATA = {
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
      "@type": "SoftwareApplication",
      "@id": "https://med.zentrolabs.com/zen/#software",
      name: "Zen",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      provider: { "@id": "https://med.zentrolabs.com/#organization" },
      description:
        "Copiloto de IA de Zentro Med: contesta WhatsApp, agenda citas dentro de la conversación y ejecuta acciones por voz dentro del sistema, siempre con confirmación humana. Incluido en el CRM, sin costo aparte.",
    },
  ],
};

export const ZEN_BODY_HTML = `
<!-- NAV -->
<nav>
  <div class="wrap">
    <div class="nav-i">
      <a href="/" class="logo">
        <img src="/zentro-isotipo.png" alt="" style="height:26px;width:26px;">
        <span class="logo-text">zentro</span>
        <span class="logo-badge">Zen</span>
      </a>
      <div class="nav-r">
        <a href="#como-funciona" class="nav-link">Cómo funciona</a>
        <a href="#comparacion" class="nav-link">La comparación honesta</a>
        <a href="#planes" class="nav-link">Planes</a>
        <a href="#preguntas" class="nav-link">Preguntas</a>
        <a href="/" class="nav-login" aria-label="Ver el CRM completo">
          <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
          <span class="nav-login-text">Ver el CRM completo</span>
        </a>
        <a href="/signup" class="btn btn-green btn-sm nav-cta-btn">Probar Zen gratis</a>
        <button class="mob-menu-btn" onclick="zmToggleMobMenu()" aria-label="Abrir menú" aria-expanded="false" id="mobMenuBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <div class="mob-menu-panel" id="mobMenuPanel">
    <a href="#como-funciona" class="mob-menu-link" onclick="zmCloseMobMenu()">Cómo funciona</a>
    <a href="#comparacion" class="mob-menu-link" onclick="zmCloseMobMenu()">La comparación honesta</a>
    <a href="#planes" class="mob-menu-link" onclick="zmCloseMobMenu()">Planes</a>
    <a href="#preguntas" class="mob-menu-link" onclick="zmCloseMobMenu()">Preguntas</a>
    <a href="/" class="mob-menu-link" onclick="zmCloseMobMenu()">Ver el CRM completo</a>
    <a href="/login" class="mob-menu-link" onclick="zmCloseMobMenu()">Iniciar sesión</a>
    <a href="/signup" class="btn btn-green btn-sm mob-menu-cta" onclick="zmCloseMobMenu()">Probar Zen gratis</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <div class="hero-eyebrow">
      <span class="pill-dark"><span class="dot-green"></span>Incluido en Zentro Med · no es un costo aparte</span>
    </div>
    <h1>La recepcionista que<br><span class="green">nunca se va a comer.</span></h1>
    <p class="hero-sub">Zen contesta WhatsApp a cualquier hora, agenda dentro de la misma conversación y te pasa el chat en cuanto la pregunta se vuelve clínica. Y dentro del sistema, le hablas y hace el trabajo.</p>
    <div class="hero-ctas">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'zen_hero_primary'});">Probar Zen gratis · sin tarjeta</a>
      <a href="#como-funciona" class="btn btn-ghost-light btn-lg">Ver una conversación real</a>
    </div>
    <p class="hero-note">// La prueba incluye 50 respuestas de Zen · Sin cuentas propias de IA</p>
  </div>
</section>

<!-- STATS BAR -->
<div class="stats-bar" style="background:var(--zm-night);border-color:rgba(255,255,255,.07);">
  <div class="wrap">
    <div class="stats-bar-inner">
      <div class="stat-item">
        <div class="stat-n2"><span>4 de 10</span></div>
        <div class="stat-l2">mensajes llegan fuera de horario</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2">&lt;1 min</div>
        <div class="stat-l2">en responder, a cualquier hora</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2"><span>6,000</span></div>
        <div class="stat-l2">respuestas al mes en el plan Clínica</div>
      </div>
      <div class="stat-item">
        <div class="stat-n2">$0</div>
        <div class="stat-l2">extra: va incluido en tu plan</div>
      </div>
    </div>
  </div>
</div>

<!-- 01 — POR QUÉ HACE FALTA -->
<section class="problems">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 01 — Por qué hace falta</p>
      <h2 class="section-title">El paciente escribe cuando tú no puedes contestar</h2>
      <p class="section-sub">Cuatro de cada diez mensajes llegan fuera del horario del consultorio, y quien busca una cita casi nunca escribe a un solo lugar. El primero que responde se queda al paciente.</p>
    </div>
    <div class="leak-grid reveal-group">
      <div class="leak-card">
        <div class="leak-num" style="color:var(--zm-g3);">4 de 10</div>
        <div class="leak-num-label">Mensajes llegan fuera de horario</div>
        <div class="leak-title">La consulta que llega a las once de la noche</div>
        <div class="leak-text">El paciente pregunta precio y disponibilidad cuando por fin tiene tiempo. Si nadie contesta hasta el día siguiente, la conversación ya se enfrió.</div>
      </div>
      <div class="leak-card">
        <div class="leak-num" style="color:#b45309;">3</div>
        <div class="leak-num-label">Consultorios consulta en promedio</div>
        <div class="leak-title">No te escribe solo a ti</div>
        <div class="leak-text">Quien busca una cita manda el mismo mensaje a varios lugares. El primero que responde con un horario concreto se queda con el paciente.</div>
      </div>
      <div class="leak-card">
        <div class="leak-num" style="color:#1d4ed8;">70%</div>
        <div class="leak-num-label">De los mensajes son la misma pregunta</div>
        <div class="leak-title">Precio, horario y dirección, otra vez</div>
        <div class="leak-text">Recepción contesta lo mismo decenas de veces al día. Es el trabajo más repetitivo del consultorio y el que menos criterio requiere.</div>
      </div>
    </div>
  </div>
</section>

<!-- 02 — ZEN EN WHATSAPP -->
<section class="solution" id="como-funciona">
  <div class="wrap">
    <div class="solution-grid">
      <div class="solution-visual" style="padding:0;overflow:hidden;">
        <div class="mockui" style="border-radius:0;border:none;">
          <div class="mockui-chat-header">
            <div class="mockui-chat-contact">
              <div class="mockui-avatar" style="background:#dcfce7;color:#15803d;">LG</div>
              <div>
                <div class="mockui-chat-name">Laura G. · paciente nueva</div>
                <div class="mockui-chat-meta">Domingo, 11:04 p.m.</div>
              </div>
            </div>
            <span class="mockui-status-pill active">Zen activo</span>
          </div>
          <div class="mockui-chat" style="min-height:420px;">
            <div class="mockui-bubble in">Hola, ¿tienen cita para limpieza esta semana? ¿Cuánto cuesta?</div>
            <span class="mockui-bubble-time">11:04 p.m.</span>
            <div class="mockui-bubble auto" style="align-self:flex-end;border-bottom-left-radius:14px;border-bottom-right-radius:4px;">Hola Laura. La limpieza dental cuesta $500 y dura 45 minutos. Tengo lunes 8 a las 10:00 a.m. o miércoles 10 a las 4:30 p.m. ¿Cuál te acomoda?</div>
            <span class="mockui-bubble-time" style="align-self:flex-end;">11:04 p.m.</span>
            <div class="mockui-bubble in">El lunes a las 10 me sirve</div>
            <span class="mockui-bubble-time">11:06 p.m.</span>
            <div class="mockui-bubble auto" style="align-self:flex-end;border-bottom-left-radius:14px;border-bottom-right-radius:4px;">Listo, quedó el lunes 8 de septiembre a las 10:00 a.m. Te confirmo un día antes por aquí.</div>
            <span class="mockui-bubble-tag done" style="align-self:flex-end;">✓ Cita creada · lunes 8, 10:00 a.m.</span>
            <div class="mockui-bubble in" style="margin-top:8px;">Una cosa más, tengo una muela que me duele al morder, ¿qué puede ser?</div>
            <span class="mockui-bubble-time">11:07 p.m.</span>
            <div class="mockui-bubble auto" style="align-self:flex-end;border-bottom-left-radius:14px;border-bottom-right-radius:4px;">Eso lo tiene que valorar la doctora. Le paso tu mensaje y te responde mañana temprano; si el dolor aumenta esta noche, escríbenos y te damos prioridad.</div>
            <span class="mockui-bubble-tag warn" style="align-self:flex-end;">⚠ Pregunta clínica detectada · pasa a la Dra. Gabriela</span>
          </div>
        </div>
        <p class="mockui-caption" style="padding-bottom:16px;">// Zen dentro del sistema</p>
      </div>
      <div class="solution-copy">
        <p class="section-label">// 02 — Zen en WhatsApp</p>
        <h2 class="section-title">Contesta, agenda y sabe cuándo llamarte</h2>
        <p class="section-sub">No es un menú de opciones ni un bot de palabras clave. Zen entiende lo que pide el paciente, consulta tu agenda real y responde con tus precios y horarios.</p>
        <div class="benefit-list">
          <div class="benefit-item">
            <div class="benefit-num">1</div>
            <div class="benefit-text">
              <h3>Habla con la información que tú configuras</h3>
              <p>Precios, horarios, servicios y preguntas frecuentes se cargan una vez. Zen no inventa datos que no le diste.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">2</div>
            <div class="benefit-text">
              <h3>Consulta tu agenda real</h3>
              <p>Ofrece solo horarios que están libres de verdad, según el doctor y el consultorio.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">3</div>
            <div class="benefit-text">
              <h3>Agenda, mueve y cancela en el chat</h3>
              <p>La cita queda creada en el sistema y sincronizada con tu calendario, sin que nadie intervenga.</p>
            </div>
          </div>
          <div class="benefit-item">
            <div class="benefit-num">4</div>
            <div class="benefit-text">
              <h3>Transfiere cuando toca</h3>
              <p>Si la pregunta es clínica o sale de lo configurado, marca la conversación y la pasa a una persona del equipo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="reveal" style="max-width:420px;margin:56px auto 0;">
      <div class="voice-card">
        <div class="voice-mic">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </div>
        <div class="voice-label">Mantén presionado para hablar</div>
        <p class="voice-quote">"Agenda a Kenia el jueves a las once y mándale el link de cobro del saldo"</p>
        <div class="voice-actions-label">Zen va a hacer</div>
        <div class="voice-actions">
          <div class="voice-action">
            <span class="voice-action-num">1</span>
            <div>
              <div class="voice-action-text">Mover cita a jueves 10 · 11:00</div>
              <div class="voice-action-sub">Consultorio 2 · libera viernes 11 · 10:30</div>
            </div>
          </div>
          <div class="voice-action">
            <span class="voice-action-num">2</span>
            <div>
              <div class="voice-action-text">Enviar link de cobro por $1,150</div>
              <div class="voice-action-sub">Checkout Stripe · por WhatsApp</div>
            </div>
          </div>
        </div>
        <div class="voice-btns">
          <button class="voice-confirm-btn" type="button">Confirmar ambas</button>
          <button class="voice-edit-btn" type="button">Editar</button>
        </div>
      </div>
      <p class="mockui-caption">// Zen dentro del sistema</p>
    </div>
  </div>
</section>

<!-- 03 — ZEN POR VOZ -->
<section class="problems" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 03 — Zen por voz</p>
      <h2 class="section-title">Con guantes puestos no se escribe</h2>
      <p class="section-sub">Entre paciente y paciente le dictas lo que necesitas y él lo ejecuta. Siempre te muestra qué va a hacer antes de hacerlo, y espera tu confirmación.</p>
    </div>
    <div class="how-steps reveal-group" style="grid-template-columns:repeat(3,1fr);">
      <div class="how-step">
        <div class="step-num">1</div>
        <div class="step-title">Mantén presionado y habla</div>
        <div class="step-desc">Se graba mientras presionas y se envía al soltar. Sin escuchar todo el tiempo y sin palabra de activación.</div>
      </div>
      <div class="how-step">
        <div class="step-num">2</div>
        <div class="step-title">Te muestra el plan antes de ejecutar</div>
        <div class="step-desc">Cada acción aparece listada con su detalle. Nada se mueve hasta que confirmas.</div>
      </div>
      <div class="how-step">
        <div class="step-num">3</div>
        <div class="step-title">Puedes editar antes de confirmar</div>
        <div class="step-desc">Si entendió otro horario o otro monto, lo corriges en la misma tarjeta sin volver a dictar.</div>
      </div>
    </div>
  </div>
</section>

<!-- 04 — LA COMPARACIÓN HONESTA -->
<section class="solution" id="comparacion" style="background:var(--zm-night);">
  <div class="wrap">
    <div class="reveal" style="max-width:700px;margin:0 auto 40px;text-align:center;">
      <p class="section-label" style="color:rgba(74,222,90,.6);">// 04 — La comparación honesta</p>
      <h2 class="section-title" style="color:var(--zm-white);">Zen no reemplaza a tu recepción. Le quita lo repetitivo.</h2>
      <p class="section-sub" style="color:rgba(255,255,255,.5);margin:14px auto 0;">Contestar precios y horarios a cualquier hora es trabajo que nadie debería hacer a mano. Recibir al paciente en el consultorio sigue siendo humano.</p>
    </div>
    <div class="reveal compare-table-wrap dark">
      <table class="compare-table">
        <thead><tr><th>Tarea</th><th>Zen</th><th>Una persona</th></tr></thead>
        <tbody>
          <tr><td>Contestar precios y horarios a las 11 p.m.</td><td class="good">Sí</td><td class="bad">No</td></tr>
          <tr><td>Agendar sin equivocarse de consultorio</td><td class="good">Sí</td><td class="good">Sí</td></tr>
          <tr><td>Contestar 40 mensajes iguales al día</td><td class="good">Sí, sin cansarse</td><td>Sí, con desgaste</td></tr>
          <tr><td>Valorar un dolor que describe el paciente</td><td class="bad">No, transfiere</td><td>Lo pasa al doctor</td></tr>
          <tr><td>Recibir y calmar a un paciente nervioso</td><td class="bad">No</td><td class="good">Sí</td></tr>
          <tr><td>Trabajar domingos y días festivos</td><td class="good">Sí</td><td class="bad">No</td></tr>
          <tr><td>Costo mensual</td><td class="good">Incluido en tu plan</td><td>Un salario</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- 05 — LOS LÍMITES, POR ESCRITO -->
<section class="problems">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 05 — Los límites, por escrito</p>
      <h2 class="section-title">Lo que Zen no va a hacer nunca</h2>
      <p class="section-sub">En salud, un asistente que improvisa es un riesgo. Estos límites están puestos a propósito y no se pueden desactivar.</p>
    </div>
    <div class="limit-grid reveal-group">
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></div>
        <div class="limit-title">No da diagnósticos</div>
        <div class="limit-text">Si el paciente describe un síntoma, Zen no interpreta ni sugiere causas. Marca la conversación y la pasa al doctor.</div>
      </div>
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg></div>
        <div class="limit-title">No indica medicamentos</div>
        <div class="limit-text">Ninguna dosis, ningún fármaco, ninguna indicación post-operatoria que no hayas escrito tú como plantilla.</div>
      </div>
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="limit-title">No inventa precios ni horarios</div>
        <div class="limit-text">Solo usa lo que está configurado y lo que hay libre en tu agenda. Si no lo sabe, lo dice y transfiere.</div>
      </div>
      <div class="limit-card">
        <div class="limit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <div class="limit-title">No actúa sin confirmación</div>
        <div class="limit-text">Dentro del sistema propone las acciones y espera tu aprobación antes de mover una cita o enviar un cobro.</div>
      </div>
    </div>
  </div>
</section>

<!-- 06 — CUÁNTO ZEN INCLUYE CADA PLAN -->
<section class="pricing" id="planes">
  <div class="wrap">
    <div class="pricing-header reveal">
      <p class="section-label">// 06 — Cuánto Zen incluye cada plan</p>
      <h2 class="section-title">Zen no se cobra aparte</h2>
      <p class="section-sub" style="max-width:640px;margin:12px auto 0;">Va incluido en tu plan del CRM con una cuota mensual de respuestas. Si la superas, la amplías desde $5 USD por cada 1,000 sin cambiar de plan.</p>
    </div>
    <div class="plans-grid reveal-group">

      <div class="plan-card">
        <span class="plan-badge badge-free">Prueba</span>
        <div class="plan-name">$0 · 30 días</div>
        <div class="plan-price"><span class="price-amt" style="font-size:26px;">50</span></div>
        <div class="plan-note">Respuestas de cortesía</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><strong>Modo: Borradores</strong></div>
          <div class="pf">Zen redacta y tú envías. Suficiente para ver cómo escribe.</div>
        </div>
      </div>

      <div class="plan-card">
        <span class="plan-badge badge-crm">Esencial</span>
        <div class="plan-name">$39 / mes</div>
        <div class="plan-price"><span class="price-amt" style="font-size:26px;">300</span></div>
        <div class="plan-note">Borradores al mes</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><strong>Modo: Borradores</strong></div>
          <div class="pf">Zen prepara la respuesta y tú la apruebas antes de que salga.</div>
        </div>
      </div>

      <div class="plan-card featured">
        <div class="plan-chip">⭐ El más elegido</div>
        <div class="plan-name">Profesional · $79 / mes</div>
        <div class="plan-price"><span class="price-amt" style="font-size:26px;">2,000</span></div>
        <div class="plan-note">Respuestas autónomas al mes</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><strong>Modo: Autónomo 24/7</strong></div>
          <div class="pf">Zen contesta y agenda solo, con traspaso a una persona cuando toca.</div>
        </div>
      </div>

      <div class="plan-card dark-card">
        <span class="plan-badge badge-pro">Clínica</span>
        <div class="plan-name">$149 / mes</div>
        <div class="plan-price"><span class="price-amt" style="font-size:26px;">6,000</span></div>
        <div class="plan-note">Respuestas autónomas al mes</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><strong>Modo: Autónomo 24/7</strong></div>
          <div class="pf">Para varios doctores o sedes, con volumen alto de conversaciones.</div>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- 07 — PREGUNTAS SOBRE ZEN -->
<section class="faq" id="preguntas">
  <div class="wrap">
    <div class="faq-header reveal">
      <p class="section-label">// 07 — Preguntas sobre Zen</p>
      <h2 class="section-title">Lo que se pregunta antes de dejarlo contestar</h2>
      <p class="section-sub" style="margin:0 auto 8px;text-align:center;">Si te falta algo, escríbenos por WhatsApp y te responde una persona.</p>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-dark btn-sm" style="margin-top:8px;">Hablar con un estratega</a>
    </div>
    <div class="faq-grid">
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿El paciente se da cuenta de que no es una persona?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Zen se presenta como el asistente del consultorio, no finge ser alguien del equipo. En la práctica la conversación se siente natural porque responde con tus precios y tus horarios reales, no con frases genéricas. Y en cuanto la pregunta se vuelve clínica, avisa que la pasa con el doctor.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Qué pasa si Zen no sabe algo?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Lo dice y transfiere. No improvisa ni rellena con algo que suene bien: si la pregunta sale de lo que tienes configurado, avisa al paciente que lo pasa con una persona del equipo y marca la conversación en tu bandeja para que la veas primero.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Necesito cuenta en algún proveedor de IA?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">No. La infraestructura está gestionada por nosotros y va incluida en la cuota de tu plan. No tienes que crear cuentas, ni cargar una tarjeta a un proveedor de IA, ni vigilar el consumo. Si superas tu cuota mensual, la amplías desde $5 USD por cada 1,000 respuestas sin cambiar de plan.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Puedo revisar lo que contestó?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Todas las conversaciones quedan completas en la bandeja compartida, con la hora de cada mensaje y quién respondió, Zen o una persona. Puedes entrar a cualquier hilo, corregir el rumbo o tomar la conversación en el momento: Zen se retira en cuanto un humano escribe.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Puedo apagarlo en ciertos horarios?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Muchos consultorios lo dejan trabajar solo fuera del horario de atención, cuando no hay nadie en recepción, y lo apagan durante el día. También puedes limitarlo por tema: que agende y responda precios, y que todo lo demás pase directo a una persona.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Qué pasa si se acaba mi cuota del mes?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Zen deja de responder solo y las conversaciones pasan a la bandeja para que las atienda tu equipo. No se corta el servicio ni se pierde ningún mensaje, y te avisamos antes de que llegues al límite. Puedes ampliar la cuota en el momento desde $5 USD por cada 1,000 respuestas.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">¿Funciona en mi especialidad?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí, porque Zen no habla de medicina: habla de tus precios, tus horarios y tus servicios, que tú configuras. Trabajamos con odontología, dermatología, ortopedia, oftalmología, psicología y medicina estética. Todo lo clínico lo transfiere, sin importar la especialidad.</div></div>
      </div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="wrap">
    <p class="section-label" style="color:rgba(74,222,90,.6);margin-bottom:16px;">// Empieza hoy</p>
    <h2>Deja que Zen conteste<br><span>esta noche.</span></h2>
    <p>La prueba de 30 días incluye 50 respuestas de Zen y 100 mensajes de WhatsApp. Sin tarjeta y sin cuentas propias de IA.</p>
    <div class="cta-btns">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'zen_cta_final'});">Probar Zen gratis · sin tarjeta</a>
      <a href="/" class="btn btn-ghost-light btn-lg">Ver el CRM completo</a>
    </div>
    <p class="cta-note">// Sin tarjeta · Sin cuentas propias de IA</p>
    <p style="max-width:820px;margin:36px auto 0;font-size:10.5px;line-height:1.8;color:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace;">Zen opera sobre WhatsApp Cloud API y requiere un número de WhatsApp Business. En el plan Esencial redacta borradores que tú apruebas; en Profesional y Clínica responde y agenda de forma autónoma. La infraestructura de IA está gestionada por Zentro y va incluida en la cuota de cada plan, ampliable desde $5 USD por cada 1,000 respuestas adicionales. Zen no emite diagnósticos, indicaciones ni opiniones clínicas: transfiere esas conversaciones a una persona del equipo. Zentro Med es software de gestión comercial y no es un sistema de expediente clínico. Los datos se almacenan cifrados en tránsito y en reposo conforme a la Ley 1581 de 2012.</p>
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
    <span class="mob-cta-price">Probar Zen gratis</span>
    <span class="mob-cta-sub">sin tarjeta · 50 respuestas incluidas</span>
  </div>
  <a href="/signup" class="btn btn-green" style="font-size:13px;padding:10px 16px;flex-shrink:0;" onclick="if(typeof gtag!=='undefined')gtag('event','mobile_sticky_cta_click',{event_category:'cta',event_label:'zen_sticky_bar_mobile'});">Empezar →</a>
</div>
`;
