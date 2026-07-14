import type { Metadata } from "next";
import Script from "next/script";

// Public marketing landing — entry point for new-member signup/login.
// Transcribed from the standalone zentro-med-landing.html design (own
// CSS/fonts/tracking scripts, not the app's Tailwind design system).
// Rendered as raw HTML via dangerouslySetInnerHTML so the original
// inline onclick="..." handlers keep working once LANDING_SCRIPT (a
// real <Script>, not innerHTML) defines the global functions they
// call — script tags inside innerHTML never execute, but HTML
// attribute handlers do once the referenced globals exist.
//
// Root layout.tsx sets robots: { index: false, follow: false } for
// the whole app (it's a private CRM). This is the one page meant to
// be crawled, so it overrides that here.
export const metadata: Metadata = {
  title: "Zentro Med — Más pacientes. Sin caos administrativo.",
  description:
    "CRM de gestión comercial con WhatsApp + marketing digital gestionado para consultorios y clínicas en Latinoamérica. Prueba 30 días gratis, sin tarjeta.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://med.zentrolabs.com" },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://med.zentrolabs.com/#organization",
      name: "Zentro Med",
      url: "https://med.zentrolabs.com",
      description: "CRM comercial y marketing digital para consultorios médicos en Latinoamérica.",
      areaServed: ["CO", "MX", "AR", "CL", "PE", "ES"],
    },
    {
      "@type": "Service",
      "@id": "https://med.zentrolabs.com/#service",
      name: "CRM y Marketing Digital para Consultorios",
      provider: { "@id": "https://med.zentrolabs.com/#organization" },
      description:
        "Plataforma de gestión comercial y marketing para consultorios: CRM de contactos, agenda online 24/7, WhatsApp automatizado y campañas de captación digital gestionadas.",
      serviceType: "Software CRM y Marketing para Salud",
      areaServed: ["CO", "MX", "AR", "CL", "PE", "ES"],
    },
    {
      "@type": "AggregateRating",
      itemReviewed: { "@id": "https://med.zentrolabs.com/#service" },
      ratingValue: "5",
      bestRating: "5",
      ratingCount: "80",
    },
  ],
};

const LANDING_CSS = `
  .zm-landing, .zm-landing *, .zm-landing *::before, .zm-landing *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .zm-landing {
    font-family: 'Manrope', sans-serif;
    color: var(--zm-ink);
    background: var(--zm-white);
    -webkit-font-smoothing: antialiased;
    line-height: 1.6;
    min-height: 100dvh;
    --zm-g: #4ADE5A; --zm-g2: #22c55e; --zm-g3: #16a34a; --zm-g-soft: #dcfce7; --zm-g-mid: #86efac;
    --zm-ink: #0f172a; --zm-ink2: #1e293b; --zm-muted: #64748b; --zm-muted2: #94a3b8;
    --zm-line: #e2e8f0; --zm-line2: #f1f5f9; --zm-surface: #f8fafc; --zm-white: #ffffff;
    --zm-night: #060d14; --zm-night2: #0c1a24; --zm-night3: #0f2333;
    --zm-red: #ef4444; --zm-amber: #f59e0b; --zm-blue: #3b82f6;
  }
  .zm-landing html { scroll-behavior: smooth; }
  .zm-landing .mono { font-family: 'JetBrains Mono', monospace; }
  .zm-landing .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  .zm-landing a { color: inherit; text-decoration: none; }
  .zm-landing img { display: block; max-width: 100%; }
  .zm-landing button { cursor: pointer; font-family: inherit; border: none; outline: none; }

  .zm-landing .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
         font-weight: 700; font-size: 14px; border-radius: 10px;
         padding: 11px 22px; transition: all .18s; white-space: nowrap; }
  .zm-landing .btn-green  { background: var(--zm-g);  color: var(--zm-ink2); }
  .zm-landing .btn-green:hover { background: var(--zm-g2); color: var(--zm-white); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,222,90,.35); }
  .zm-landing .btn-dark   { background: var(--zm-ink); color: var(--zm-white); }
  .zm-landing .btn-dark:hover { background: var(--zm-ink2); }
  .zm-landing .btn-ghost-light { background: transparent; color: rgba(255,255,255,.75); border: 1.5px solid rgba(255,255,255,.2); }
  .zm-landing .btn-ghost-light:hover { background: rgba(255,255,255,.08); color: var(--zm-white); }
  .zm-landing .btn-lg { padding: 14px 28px; font-size: 15.5px; border-radius: 12px; }
  .zm-landing .btn-sm { padding: 8px 16px; font-size: 13px; border-radius: 8px; }

  .zm-landing nav {
    position: sticky; top: 0; z-index: 400;
    background: rgba(6,13,20,.92); backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,.07);
  }
  .zm-landing .nav-i { display: flex; align-items: center; justify-content: space-between; height: 62px; }
  .zm-landing .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .zm-landing .logo-text { font-size: 16px; font-weight: 800; color: var(--zm-white); letter-spacing: -.02em; }
  .zm-landing .logo-badge { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600;
                background: var(--zm-g); color: var(--zm-ink); padding: 2px 7px; border-radius: 4px;
                text-transform: uppercase; letter-spacing: .05em; }
  .zm-landing .nav-r { display: flex; align-items: center; gap: 20px; }
  .zm-landing .nav-link { font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,.6);
              text-decoration: none; transition: color .15s; }
  .zm-landing .nav-link:hover { color: var(--zm-white); }
  .zm-landing .nav-login { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600;
               color: rgba(255,255,255,.5); text-decoration: none; transition: color .15s;
               white-space: nowrap; }
  .zm-landing .nav-login svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 2; fill: none; flex-shrink: 0; }
  .zm-landing .nav-login:hover { color: rgba(255,255,255,.85); }
  @media(max-width:640px) {
    .zm-landing .nav-link { display: none; }
    .zm-landing .nav-r { gap: 8px; }
    .zm-landing .btn-ghost-light { display: none; }
    .zm-landing .nav-login .nav-login-text { display: none; }
  }

  .zm-landing .hero {
    background: var(--zm-night);
    background-image:
      radial-gradient(ellipse 900px 600px at 60% -10%, rgba(74,222,90,.08) 0%, transparent 65%),
      radial-gradient(ellipse 600px 400px at -10% 80%, rgba(59,130,246,.05) 0%, transparent 60%);
    padding: clamp(72px,10vw,120px) 0 clamp(64px,9vw,100px);
    text-align: center;
    position: relative; overflow: hidden;
  }
  .zm-landing .hero-eyebrow { margin-bottom: 24px; display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; }
  .zm-landing .pill-dark { display: inline-flex; align-items: center; gap: 7px;
               background: rgba(74,222,90,.12); color: var(--zm-g-mid);
               font-family: 'JetBrains Mono', monospace;
               font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
               padding: 5px 13px; border-radius: 20px; border: 1px solid rgba(74,222,90,.2); }
  .zm-landing .dot-green { width: 6px; height: 6px; border-radius: 50%; background: var(--zm-g); animation: zm-blink 2s infinite; }
  @keyframes zm-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
  .zm-landing .hero h1 {
    font-size: clamp(36px,5.5vw,70px); font-weight: 800;
    letter-spacing: -.045em; line-height: 1.03;
    color: var(--zm-white); max-width: 820px; margin: 0 auto 20px;
  }
  .zm-landing .hero h1 .green {
    background: linear-gradient(130deg, #15803d, #4ADE5A 55%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .zm-landing .hero-sub {
    font-size: clamp(15px,1.7vw,18px); color: rgba(255,255,255,.55);
    max-width: 540px; margin: 0 auto 40px; line-height: 1.75;
  }
  .zm-landing .hero-ctas { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .zm-landing .hero-note { margin-top: 14px; font-size: 12px; color: rgba(255,255,255,.3);
               font-family: 'JetBrains Mono', monospace; }

  .zm-landing .stats-bar {
    background: rgba(255,255,255,.04); border-top: 1px solid rgba(255,255,255,.07);
    border-bottom: 1px solid rgba(255,255,255,.07);
    padding: 20px 0;
  }
  .zm-landing .stats-bar-inner { display: flex; justify-content: center; align-items: center;
                     gap: 0; flex-wrap: wrap; }
  .zm-landing .stat-item { display: flex; flex-direction: column; align-items: center;
               padding: 8px 32px; border-right: 1px solid rgba(255,255,255,.08); }
  .zm-landing .stat-item:last-child { border-right: none; }
  .zm-landing .stat-n2 { font-size: 26px; font-weight: 800; color: var(--zm-white); letter-spacing: -.03em; }
  .zm-landing .stat-n2 span { color: var(--zm-g); }
  .zm-landing .stat-l2 { font-size: 11.5px; color: rgba(255,255,255,.4); margin-top: 2px; text-align: center; }
  @media(max-width:640px) {
    .zm-landing .stat-item { padding: 8px 18px; }
    .zm-landing .stat-n2 { font-size: 22px; }
  }

  .zm-landing .problems { padding: clamp(64px,9vw,100px) 0; background: var(--zm-surface); }
  .zm-landing .section-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600;
                   color: var(--zm-g3); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 12px; }
  .zm-landing .section-title { font-size: clamp(28px,3.5vw,44px); font-weight: 800;
                   letter-spacing: -.035em; line-height: 1.1; margin-bottom: 14px; }
  .zm-landing .section-sub { font-size: 16px; color: var(--zm-muted); max-width: 520px; line-height: 1.7; }
  .zm-landing .problems-header { text-align: center; margin-bottom: 52px; }
  .zm-landing .problems-header .section-sub { margin: 0 auto; }
  .zm-landing .prob-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
  @media(max-width:860px) { .zm-landing .prob-grid { grid-template-columns: 1fr; max-width: 460px; margin: 0 auto; } }
  .zm-landing .prob-card {
    background: var(--zm-white); border: 1px solid var(--zm-line);
    border-radius: 18px; padding: 28px; position: relative; overflow: hidden;
    transition: border-color .2s, transform .2s, box-shadow .2s;
  }
  .zm-landing .prob-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(15,23,42,.08); border-color: #fca5a5; }
  .zm-landing .prob-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--zm-line2); }
  .zm-landing .prob-icon { width: 48px; height: 48px; border-radius: 14px; background: #fef2f2;
               display: flex; align-items: center; justify-content: center;
               margin-bottom: 18px; }
  .zm-landing .prob-icon svg { width: 22px; height: 22px; stroke: #ef4444; stroke-width: 1.75; fill: none; }
  .zm-landing .prob-title { font-size: 16px; font-weight: 800; color: var(--zm-ink); margin-bottom: 8px; letter-spacing: -.02em; }
  .zm-landing .prob-desc { font-size: 14px; color: var(--zm-muted); line-height: 1.65; }
  .zm-landing .prob-tag { display: inline-block; margin-top: 14px; font-family: 'JetBrains Mono', monospace;
              font-size: 10.5px; font-weight: 600; color: var(--zm-red);
              background: #fef2f2; border: 1px solid #fee2e2;
              padding: 3px 10px; border-radius: 6px; }

  .zm-landing .solution { padding: clamp(64px,9vw,100px) 0; }
  .zm-landing .solution-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; margin-top: 56px; }
  @media(max-width:860px) { .zm-landing .solution-grid { grid-template-columns: 1fr; } }
  .zm-landing .solution-visual {
    background: var(--zm-night); border-radius: 22px; padding: 32px;
    border: 1px solid rgba(255,255,255,.08);
    min-height: 320px; display: flex; flex-direction: column; gap: 14px;
  }
  .zm-landing .sol-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700;
             color: var(--zm-g); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px; }
  .zm-landing .sol-title { font-size: 20px; font-weight: 800; color: var(--zm-white); letter-spacing: -.025em; margin-bottom: 16px; }
  .zm-landing .feature-row { display: flex; align-items: flex-start; gap: 12px; }
  .zm-landing .feat-check { width: 20px; height: 20px; border-radius: 6px; background: rgba(74,222,90,.15);
                display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .zm-landing .feat-check svg { color: var(--zm-g); }
  .zm-landing .feat-text { font-size: 13.5px; color: rgba(255,255,255,.7); line-height: 1.5; }
  .zm-landing .feat-text strong { color: var(--zm-white); font-weight: 600; }

  .zm-landing .solution-copy .section-label { text-align: left; }
  .zm-landing .solution-copy .section-title { text-align: left; }
  .zm-landing .solution-copy .section-sub { text-align: left; margin: 0 0 28px; }
  .zm-landing .benefit-list { display: flex; flex-direction: column; gap: 14px; }
  .zm-landing .benefit-item { display: flex; align-items: flex-start; gap: 14px; }
  .zm-landing .benefit-num { width: 30px; height: 30px; border-radius: 8px; background: var(--zm-g-soft);
                 color: var(--zm-g3); font-weight: 800; font-size: 13px;
                 display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .zm-landing .benefit-text h4 { font-size: 14px; font-weight: 700; color: var(--zm-ink); margin-bottom: 3px; }
  .zm-landing .benefit-text p { font-size: 13px; color: var(--zm-muted); line-height: 1.55; }

  @media(min-width:861px) { .zm-landing .solution-grid.reverse .solution-visual { order: 2; } .zm-landing .solution-grid.reverse .solution-copy { order: 1; } }

  .zm-landing .how { padding: clamp(64px,9vw,100px) 0; background: var(--zm-surface); }
  .zm-landing .how-header { text-align: center; margin-bottom: 52px; }
  .zm-landing .how-steps { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; position: relative; }
  @media(max-width:860px) { .zm-landing .how-steps { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; gap: 12px; } }
  .zm-landing .how-step { text-align: center; padding: 0 20px; position: relative; }
  .zm-landing .how-step:not(:last-child)::after {
    content: ''; position: absolute; top: 30px;
    left: calc(50% + 34px); right: 0; height: 1px;
    background: linear-gradient(to right, rgba(74,222,90,.3), var(--zm-line));
  }
  .zm-landing .how-step:not(:first-child)::before {
    content: ''; position: absolute; top: 30px;
    left: 0; right: calc(50% + 34px); height: 1px;
    background: linear-gradient(to left, rgba(74,222,90,.3), var(--zm-line));
  }
  @media(max-width:860px) { .zm-landing .how-step::after, .zm-landing .how-step::before { display: none; } }
  .zm-landing .step-num { width: 60px; height: 60px; border-radius: 50%;
              background: linear-gradient(135deg, var(--zm-night2) 0%, var(--zm-night3) 100%);
              color: var(--zm-g); font-weight: 800; font-size: 22px;
              font-family: 'JetBrains Mono', monospace;
              display: flex; align-items: center; justify-content: center;
              margin: 0 auto 24px; border: 2px solid rgba(74,222,90,.4);
              box-shadow: 0 0 0 8px rgba(74,222,90,.06), 0 4px 20px rgba(0,0,0,.25);
              position: relative; z-index: 1; }
  .zm-landing .step-title { font-size: 14px; font-weight: 700; color: var(--zm-ink); margin-bottom: 6px; }
  .zm-landing .step-desc { font-size: 12.5px; color: var(--zm-muted); line-height: 1.6; }

  .zm-landing .pricing { padding: clamp(72px,10vw,120px) 0; }
  .zm-landing .pricing-header { text-align: center; margin-bottom: 16px; }
  .zm-landing .pricing-sub-note { text-align: center; font-size: 13px; color: var(--zm-muted); margin-bottom: 52px;
                      font-family: 'JetBrains Mono', monospace; }
  .zm-landing .plans-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; align-items: start; }
  @media(max-width:1060px) { .zm-landing .plans-grid { grid-template-columns: repeat(2,1fr); } }
  @media(max-width:580px)  { .zm-landing .plans-grid { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; } }

  .zm-landing .plan-card {
    border: 1px solid var(--zm-line); border-radius: 20px;
    padding: 28px 24px; background: var(--zm-white);
    display: flex; flex-direction: column; gap: 0;
    transition: border-color .2s, box-shadow .2s, transform .2s;
  }
  .zm-landing .plan-card:hover { border-color: var(--zm-g-mid); box-shadow: 0 8px 32px rgba(74,222,90,.1); transform: translateY(-4px); }
  .zm-landing .plan-card.featured {
    border-color: var(--zm-g2); border-width: 2px;
    background: linear-gradient(160deg, #f0fdf4 0%, var(--zm-white) 60%);
    position: relative;
  }
  .zm-landing .plan-card.dark-card {
    background: var(--zm-night); border-color: rgba(255,255,255,.1);
  }
  .zm-landing .plan-card.dark-card:hover { border-color: rgba(74,222,90,.3); }
  .zm-landing .plan-badge { display: inline-block; font-family: 'JetBrains Mono', monospace;
                font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
                padding: 3px 10px; border-radius: 6px; margin-bottom: 16px; width: fit-content; }
  .zm-landing .badge-free   { background: #eff6ff; color: #2563eb; }
  .zm-landing .badge-crm    { background: var(--zm-line2); color: var(--zm-muted); }
  .zm-landing .badge-pop    { background: var(--zm-g-soft); color: var(--zm-g3); }
  .zm-landing .badge-pro    { background: var(--zm-night); color: var(--zm-g); }
  .zm-landing .plan-name { font-size: 17px; font-weight: 800; color: var(--zm-ink); margin-bottom: 6px; letter-spacing: -.02em; }
  .zm-landing .plan-card.dark-card .plan-name { color: var(--zm-white); }
  .zm-landing .plan-price { font-size: 36px; font-weight: 800; color: var(--zm-ink); letter-spacing: -.04em; line-height: 1; margin-bottom: 4px; }
  .zm-landing .plan-card.dark-card .plan-price { color: var(--zm-white); }
  .zm-landing .plan-price sup { font-size: 16px; font-weight: 700; vertical-align: super; margin-right: 2px; }
  .zm-landing .plan-price sub { font-size: 13px; font-weight: 500; color: var(--zm-muted); vertical-align: baseline; letter-spacing: 0; }
  .zm-landing .plan-card.dark-card .plan-price sub { color: rgba(255,255,255,.4); }
  .zm-landing .plan-note { font-size: 12px; color: var(--zm-muted); margin-bottom: 20px; min-height: 18px; }
  .zm-landing .plan-card.dark-card .plan-note { color: rgba(255,255,255,.4); }
  .zm-landing .plan-divider { height: 1px; background: var(--zm-line); margin-bottom: 20px; }
  .zm-landing .plan-card.dark-card .plan-divider { background: rgba(255,255,255,.08); }
  .zm-landing .plan-features { display: flex; flex-direction: column; gap: 10px; flex: 1; margin-bottom: 24px; }
  .zm-landing .pf { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--zm-ink2); line-height: 1.45; }
  .zm-landing .plan-card.dark-card .pf { color: rgba(255,255,255,.65); }
  .zm-landing .pf-check { width: 16px; height: 16px; border-radius: 4px; background: var(--zm-g-soft);
              display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .zm-landing .plan-card.dark-card .pf-check { background: rgba(74,222,90,.15); }
  .zm-landing .pf-check svg { color: var(--zm-g3); }
  .zm-landing .plan-card.dark-card .pf-check svg { color: var(--zm-g); }
  .zm-landing .pf-new { font-weight: 600; color: var(--zm-g3); }
  .zm-landing .plan-card.dark-card .pf-new { color: var(--zm-g); }
  .zm-landing .pf-check-ai { background: rgba(139,92,246,.12) !important; }
  .zm-landing .pf-check-ai svg { stroke: #a78bfa !important; color: #a78bfa !important; }
  .zm-landing .plan-card.dark-card .pf-check-ai { background: rgba(139,92,246,.18) !important; }
  .zm-landing .pf-ai-pill { display:inline-flex; align-items:center; font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#a78bfa; background:rgba(139,92,246,.1); border:1px solid rgba(139,92,246,.18); padding:1px 6px; border-radius:4px; vertical-align:middle; margin-left:5px; }
  .zm-landing .pf-ai-num { font-weight:700; color:#a78bfa; }
  .zm-landing .plan-btn { display: block; width: 100%; padding: 12px; border-radius: 10px;
              font-weight: 700; font-size: 14px; text-align: center;
              transition: all .18s; border: none; cursor: pointer; }
  .zm-landing .btn-plan-free { background: var(--zm-ink); color: var(--zm-white); }
  .zm-landing .btn-plan-free:hover { background: var(--zm-ink2); }
  .zm-landing .btn-plan-crm  { background: var(--zm-line2); color: var(--zm-ink); border: 1px solid var(--zm-line); }
  .zm-landing .btn-plan-crm:hover  { background: var(--zm-line); }
  .zm-landing .btn-plan-pop  { background: var(--zm-g); color: var(--zm-ink2); }
  .zm-landing .btn-plan-pop:hover  { background: var(--zm-g2); color: var(--zm-white); }
  .zm-landing .btn-plan-pro  { background: rgba(74,222,90,.15); color: var(--zm-g); border: 1px solid rgba(74,222,90,.25); }
  .zm-landing .btn-plan-pro:hover  { background: rgba(74,222,90,.25); }

  .zm-landing .testi { padding: clamp(64px,9vw,100px) 0; background: var(--zm-surface); }
  .zm-landing .testi-header { text-align: center; margin-bottom: 48px; }
  .zm-landing .testi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
  @media(max-width:860px) { .zm-landing .testi-grid { grid-template-columns: 1fr; max-width: 440px; margin: 0 auto; } }
  .zm-landing .testi-card { background: var(--zm-white); border: 1px solid var(--zm-line); border-radius: 18px; padding: 26px; display: flex; flex-direction: column; gap: 12px; transition: border-color .2s, transform .2s, box-shadow .2s; }
  .zm-landing .testi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(15,23,42,.07); border-color: #86efac; }
  .zm-landing .testi-stars { color: var(--zm-amber); font-size: 13px; letter-spacing: 2px; }
  .zm-landing .testi-quote { font-size: 14px; color: var(--zm-ink2); line-height: 1.7; font-style: italic; flex: 1; }
  .zm-landing .testi-result { display: inline-flex; align-items: center; gap: 6px;
                  background: var(--zm-g-soft); border: 1px solid #bbf7d0;
                  border-radius: 20px; padding: 4px 12px; width: fit-content;
                  font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: var(--zm-g3); }
  .zm-landing .testi-author { display: flex; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid var(--zm-line); }
  .zm-landing .testi-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
  .zm-landing .testi-name { font-size: 13px; font-weight: 700; color: var(--zm-ink); }
  .zm-landing .testi-role { font-size: 11.5px; color: var(--zm-muted); }

  .zm-landing .faq { padding: clamp(64px,9vw,100px) 0; }
  .zm-landing .faq-header { text-align: center; margin-bottom: 48px; }
  .zm-landing .faq-grid { grid-template-columns: 1fr 1fr; gap: 0; max-width: 860px; margin: 0 auto; display: grid;
                border: 1px solid var(--zm-line); border-radius: 18px; overflow: hidden; background: var(--zm-line); }
  @media(max-width:680px) { .zm-landing .faq-grid { grid-template-columns: 1fr; } }
  .zm-landing .faq-item { border: none; border-right: 1px solid var(--zm-line); border-bottom: 1px solid var(--zm-line); border-radius: 0; overflow: hidden; }
  .zm-landing .faq-item:nth-child(even) { border-right: none; }
  .zm-landing .faq-item:nth-last-child(-n+2) { border-bottom: none; }
  @media(max-width:680px) { .zm-landing .faq-item { border-right: none; } .zm-landing .faq-item:last-child { border-bottom: none; } }
  .zm-landing .faq-q { padding: 18px 20px; font-size: 14px; font-weight: 700; color: var(--zm-ink);
            cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px;
            user-select: none; }
  .zm-landing .faq-q:hover { background: var(--zm-surface); }
  .zm-landing .faq-chevron { flex-shrink: 0; transition: transform .2s; color: var(--zm-muted); }
  .zm-landing .faq-item.open .faq-chevron { transform: rotate(180deg); }
  .zm-landing .faq-a { max-height: 0; overflow: hidden; transition: max-height .3s ease, padding .3s ease; }
  .zm-landing .faq-item.open .faq-a { max-height: 200px; }
  .zm-landing .faq-a-inner { padding: 0 20px 18px; font-size: 13.5px; color: var(--zm-muted); line-height: 1.7; }

  .zm-landing .cta-final {
    padding: clamp(72px,10vw,120px) 0;
    background: var(--zm-night);
    background-image: radial-gradient(ellipse 800px 500px at 50% 0%, rgba(74,222,90,.1) 0%, transparent 65%);
    text-align: center;
  }
  .zm-landing .cta-final h2 { font-size: clamp(28px,4vw,52px); font-weight: 800;
                  color: var(--zm-white); letter-spacing: -.04em; line-height: 1.08; margin-bottom: 14px; }
  .zm-landing .cta-final h2 span { color: var(--zm-g); }
  .zm-landing .cta-final p { font-size: 16px; color: rgba(255,255,255,.5); margin-bottom: 36px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .zm-landing .cta-btns { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .zm-landing .cta-note { margin-top: 16px; font-size: 12px; color: rgba(255,255,255,.25); font-family: 'JetBrains Mono', monospace; }

  .zm-landing footer { background: var(--zm-night); border-top: 1px solid rgba(255,255,255,.06); padding: 24px 0; }
  .zm-landing .foot-i { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
             font-size: 13px; color: rgba(255,255,255,.3); }
  .zm-landing .foot-i a { color: rgba(255,255,255,.4); transition: color .15s; }
  .zm-landing .foot-i a:hover { color: rgba(255,255,255,.7); }

  .zm-landing .mob-cta { display: none; }
  @media(max-width:640px) {
    .zm-landing .mob-cta {
      display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 800;
      background: var(--zm-night); border-top: 1px solid rgba(255,255,255,.1);
      padding: 10px 16px 14px; align-items: center; justify-content: space-between; gap: 10px;
      box-shadow: 0 -4px 24px rgba(0,0,0,.4);
    }
    .zm-landing .mob-cta-info { display: flex; flex-direction: column; }
    .zm-landing .mob-cta-price { font-size: 13px; font-weight: 700; color: var(--zm-white); }
    .zm-landing .mob-cta-sub { font-size: 11px; color: rgba(255,255,255,.4); }
    .zm-landing { padding-bottom: 76px; }
  }

  @keyframes zm-fadeUp    { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes zm-floatBadge { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
  @keyframes zm-pulseGlow { 0%,100%{ box-shadow:0 0 0 0 rgba(74,222,90,.25); } 50%{ box-shadow:0 0 0 8px rgba(74,222,90,0); } }

  .zm-landing .hero-eyebrow { animation: zm-fadeUp .6s ease both; animation-delay: .05s; }
  .zm-landing .hero h1      { animation: zm-fadeUp .7s ease both; animation-delay: .15s; }
  .zm-landing .hero-sub     { animation: zm-fadeUp .7s ease both; animation-delay: .25s; }
  .zm-landing .hero-proof   { animation: zm-fadeUp .7s ease both; animation-delay: .35s; }
  .zm-landing .hero-ctas    { animation: zm-fadeUp .7s ease both; animation-delay: .45s; }
  .zm-landing .pill-dark  { animation: zm-floatBadge 3.5s ease-in-out infinite; }
  .zm-landing .btn-green  { animation: zm-pulseGlow 2.8s ease-in-out infinite; }

  .zm-landing .reveal { opacity:0; transform:translateY(24px); transition:opacity .55s ease, transform .55s ease; }
  .zm-landing .reveal.visible { opacity:1; transform:translateY(0); }
  .zm-landing .reveal-group > * { opacity:0; transform:translateY(20px); transition:opacity .5s ease, transform .5s ease; }
  .zm-landing .reveal-group.visible > *:nth-child(1) { opacity:1; transform:none; transition-delay:.05s; }
  .zm-landing .reveal-group.visible > *:nth-child(2) { opacity:1; transform:none; transition-delay:.15s; }
  .zm-landing .reveal-group.visible > *:nth-child(3) { opacity:1; transform:none; transition-delay:.25s; }
  .zm-landing .reveal-group.visible > *:nth-child(4) { opacity:1; transform:none; transition-delay:.35s; }
  .zm-landing .reveal-group.visible > *:nth-child(5) { opacity:1; transform:none; transition-delay:.45s; }
  .zm-landing .reveal-group.visible > *:nth-child(6) { opacity:1; transform:none; transition-delay:.55s; }

  .zm-landing .trust-section { padding: 28px 0 32px; background: var(--zm-night); border-top: 1px solid rgba(255,255,255,.06); }
  .zm-landing .trust-inner   { display: flex; align-items: center; justify-content: center; gap: 36px; flex-wrap: wrap; }
  .zm-landing .trust-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; color: rgba(255,255,255,.2); letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
  .zm-landing .trust-logos   { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; justify-content: center; }
  .zm-landing .trust-logo    { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 700; color: rgba(255,255,255,.55); transition: color .2s, transform .2s; }
  .zm-landing .trust-logo:hover { color: var(--zm-g); transform: translateY(-2px); }
  .zm-landing .trust-div     { width: 1px; height: 14px; background: rgba(255,255,255,.1); }
  .zm-landing .stats-note    { text-align: center; font-size: 11px; color: rgba(255,255,255,.22); font-family: 'JetBrains Mono', monospace; padding: 6px 24px 16px; }

  .zm-landing .hero-proof    { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; margin-bottom: 24px; }
  .zm-landing .proof-avatars { display: flex; }
  .zm-landing .proof-av      { width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(255,255,255,.15); font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-left: -8px; }
  .zm-landing .proof-av:first-child { margin-left: 0; }
  .zm-landing .proof-stars   { color: #f59e0b; font-size: 13px; letter-spacing: 1px; }
  .zm-landing .proof-text    { font-size: 13px; color: rgba(255,255,255,.5); }
  .zm-landing .proof-text strong { color: rgba(255,255,255,.85); }

  .zm-landing .wa-float { position: fixed; bottom: 88px; right: 20px; z-index: 9999; width: 52px; height: 52px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(37,211,102,.5); transition: transform .2s, box-shadow .2s; text-decoration: none; }
  .zm-landing .wa-float:hover { transform: translateY(-3px) scale(1.06); box-shadow: 0 8px 28px rgba(37,211,102,.55); }
  @media(max-width:640px) { .zm-landing .wa-float { bottom: 88px; right: 16px; width: 48px; height: 48px; } }

  .zm-landing .plan-chip { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--zm-ink); color: var(--zm-white); font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; letter-spacing: .05em; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; white-space: nowrap; }
  .zm-landing .plan-fine { font-size: 11px; color: var(--zm-muted2); text-align: center; margin-top: 8px; font-family: 'JetBrains Mono', monospace; }
  .zm-landing .plan-card.dark-card .plan-fine { color: rgba(255,255,255,.3); }

  .zm-landing .hero-widgets {
    display: flex; justify-content: center; gap: 12px;
    flex-wrap: wrap; margin-top: 28px; margin-bottom: 4px;
  }
  .zm-landing .hw-card {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 14px; padding: 10px 16px;
    backdrop-filter: blur(12px);
    animation: zm-fadeUp .7s ease both;
  }
  .zm-landing .hw-card:nth-child(1) { animation-delay:.55s; }
  .zm-landing .hw-card:nth-child(2) { animation-delay:.65s; }
  .zm-landing .hw-card:nth-child(3) { animation-delay:.75s; }
  .zm-landing .hw-icon-wrap {
    width: 32px; height: 32px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .zm-landing .hw-icon-wrap svg { width: 15px; height: 15px; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .zm-landing .hw-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.88); margin-bottom: 2px; white-space: nowrap; }
  .zm-landing .hw-sub   { font-size: 10px; color: rgba(255,255,255,.38); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
  @media(max-width:640px) { .zm-landing .hero-widgets { gap: 8px; } .zm-landing .hw-card { padding: 9px 12px; } .zm-landing .hw-title { font-size: 11.5px; } }

  .zm-landing .hero-illus-img {
    display: block; width: 100%; height: auto;
    max-width: 900px; margin: 36px auto 0;
    animation: zm-fadeUp .7s ease both; animation-delay: .85s;
  }
  @media(max-width:640px) { .zm-landing .hero-illus-img { margin-top: 24px; } }
  .zm-landing .illus-img { display: block; width: 100%; height: auto; border-radius: 12px; }

  .zm-landing .illus-slot {
    border-radius: 16px;
    background: rgba(255,255,255,.03);
    border: 1.5px dashed rgba(74,222,90,.18);
    min-height: 200px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    position: relative; overflow: hidden;
    flex-shrink: 0;
  }
  .zm-landing .illus-slot::before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(45deg,
      rgba(74,222,90,.012) 0px, rgba(74,222,90,.012) 1px,
      transparent 1px, transparent 14px);
  }
  .zm-landing .illus-badge {
    position: absolute; top: 12px; left: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: rgba(74,222,90,.45); background: rgba(74,222,90,.07);
    border: 1px solid rgba(74,222,90,.12); padding: 3px 8px; border-radius: 4px;
  }
  .zm-landing .illus-icon-wrap {
    width: 56px; height: 56px;
    background: rgba(74,222,90,.08); border: 1px solid rgba(74,222,90,.14);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    position: relative; z-index: 1;
  }
  .zm-landing .illus-icon-wrap svg { width: 26px; height: 26px; stroke: var(--zm-g); stroke-width: 1.5; fill: none; }
  .zm-landing .illus-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px; font-weight: 600; letter-spacing: .06em;
    color: rgba(255,255,255,.3); text-align: center;
    position: relative; z-index: 1;
  }
  .zm-landing .illus-hint {
    font-size: 11px; color: rgba(255,255,255,.15);
    text-align: center; position: relative; z-index: 1;
    max-width: 220px; line-height: 1.5;
  }

  .zm-landing .diff-section { padding: clamp(60px,8vw,90px) 0; background: var(--zm-night); }
  .zm-landing .diff-header { text-align: center; margin-bottom: 48px; }
  .zm-landing .diff-header .section-title { color: var(--zm-white); }
  .zm-landing .diff-header .section-sub { color: rgba(255,255,255,.45); margin: 12px auto 0; }
  .zm-landing .diff-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 900px; margin: 0 auto; }
  @media(max-width:680px) { .zm-landing .diff-cols { grid-template-columns: 1fr; } }
  .zm-landing .diff-col {
    border-radius: 18px; padding: 28px;
    display: flex; flex-direction: column; gap: 0;
  }
  .zm-landing .diff-col-bad {
    background: rgba(239,68,68,.05);
    border: 1px solid rgba(239,68,68,.12);
  }
  .zm-landing .diff-col-good {
    background: rgba(74,222,90,.06);
    border: 1px solid rgba(74,222,90,.2);
  }
  .zm-landing .diff-col-label {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 22px; padding-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,.07);
  }
  .zm-landing .diff-col-label .diff-icon {
    width: 28px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
  }
  .zm-landing .diff-col-bad .diff-icon { background: rgba(239,68,68,.12); }
  .zm-landing .diff-col-good .diff-icon { background: rgba(74,222,90,.12); }
  .zm-landing .diff-col-label span { font-size: 13px; font-weight: 800; }
  .zm-landing .diff-col-bad .diff-col-label span { color: rgba(255,255,255,.5); }
  .zm-landing .diff-col-good .diff-col-label span { color: var(--zm-white); }
  .zm-landing .diff-list { list-style: none; display: flex; flex-direction: column; gap: 11px; }
  .zm-landing .diff-item {
    display: flex; align-items: flex-start; gap: 10px;
    font-size: 13px; line-height: 1.55;
  }
  .zm-landing .diff-item .diff-dot {
    width: 18px; height: 18px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px; font-size: 10px;
  }
  .zm-landing .diff-col-bad .diff-dot { background: rgba(239,68,68,.12); color: #f87171; }
  .zm-landing .diff-col-good .diff-dot { background: rgba(74,222,90,.12); color: var(--zm-g); }
  .zm-landing .diff-col-bad .diff-item-text { color: rgba(255,255,255,.4); }
  .zm-landing .diff-col-good .diff-item-text { color: rgba(255,255,255,.75); }
  .zm-landing .diff-col-good .diff-item-text strong { color: var(--zm-white); }
  .zm-landing .diff-bottom { text-align: center; margin-top: 36px; }
  .zm-landing .diff-price-note {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; color: rgba(255,255,255,.3); margin-top: 14px;
  }

  .zm-landing .mid-cta { background: var(--zm-g-soft); border-top: 1px solid #bbf7d0; border-bottom: 1px solid #bbf7d0; padding: 28px 0; }
  .zm-landing .mid-cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .zm-landing .mid-cta-pre { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; color: var(--zm-g3); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px; }
  .zm-landing .mid-cta-head { font-size: 16px; font-weight: 800; color: var(--zm-ink); letter-spacing: -.02em; }
  @media(max-width:640px) { .zm-landing .mid-cta-inner { flex-direction: column; align-items: flex-start; } }

  .zm-landing .curr-switch { position: relative; }
  .zm-landing .curr-btn {
    display: flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.13);
    color: rgba(255,255,255,.7); padding: 5px 10px 5px 8px; border-radius: 8px;
    font-size: 11.5px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
    cursor: pointer; transition: all .15s; white-space: nowrap; letter-spacing: .02em;
  }
  .zm-landing .curr-btn:hover { background: rgba(255,255,255,.13); color: var(--zm-white); }
  .zm-landing .curr-btn svg { transition: transform .2s; flex-shrink: 0; }
  .zm-landing .curr-switch.open .curr-btn svg { transform: rotate(180deg); }
  .zm-landing .curr-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: #0a1520; border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px; overflow: hidden; min-width: 130px;
    box-shadow: 0 12px 40px rgba(0,0,0,.5); display: none; z-index: 1000;
  }
  .zm-landing .curr-switch.open .curr-dropdown { display: block; animation: zm-fadeUp .15s ease both; }
  .zm-landing .curr-opt {
    display: flex; align-items: center; gap: 9px; width: 100%;
    padding: 10px 14px; background: none; color: rgba(255,255,255,.6);
    font-size: 12px; font-weight: 600; font-family: 'JetBrains Mono', monospace;
    cursor: pointer; transition: background .1s; border: none;
    border-bottom: 1px solid rgba(255,255,255,.05); text-align: left;
  }
  .zm-landing .curr-opt:last-child { border-bottom: none; }
  .zm-landing .curr-opt:hover { background: rgba(255,255,255,.06); color: var(--zm-white); }
  .zm-landing .curr-opt.curr-active { color: var(--zm-g); }
  .zm-landing .curr-opt .curr-flag { font-size: 14px; line-height: 1; }
  .zm-landing .curr-opt .curr-name { flex: 1; }
  .zm-landing .curr-opt .curr-sym { color: rgba(255,255,255,.3); font-size: 11px; }
  .zm-landing .curr-opt.curr-active .curr-sym { color: rgba(74,222,90,.5); }
  @media(max-width:480px) { .zm-landing .curr-btn { padding: 5px 8px; font-size: 11px; } }
`;

const LANDING_BODY_HTML = `
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
        <a href="/signup" class="btn btn-green btn-sm">Empezar gratis →</a>
      </div>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <div class="hero-eyebrow">
      <span class="pill-dark"><span class="dot-green"></span>CRM + equipo de marketing · Todo en uno</span>
      <span class="pill-dark" style="background:rgba(245,158,11,.1);color:#fcd34d;border-color:rgba(245,158,11,.2);">⚡ 30 días gratis · sin tarjeta</span>
    </div>
    <h1>Más pacientes.<br><span class="green">Sin caos administrativo.</span></h1>
    <p class="hero-sub">El único sistema que combina un <strong style="color:rgba(255,255,255,.85);">CRM para consultorios</strong> y un <strong style="color:rgba(255,255,255,.85);">equipo de marketing gestionado</strong> en una sola suscripción — sin contratar personal extra, sin coordinar agencias.</p>
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
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'hero_primary'});">Probar gratis 30 días →</a>
      <a href="#planes" class="btn btn-ghost-light btn-lg">Ver planes</a>
    </div>
    <p class="hero-note">// Sin tarjeta · Configuración en 24h · Cancela cuando quieras</p>

    <div class="hero-widgets">
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(74,222,90,.1);">
          <svg viewBox="0 0 24 24" stroke="var(--zm-g)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>
        </div>
        <div>
          <div class="hw-title">Cita confirmada</div>
          <div class="hw-sub">Dr. Martínez · Hoy 3:00pm · WhatsApp ✓</div>
        </div>
      </div>
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(59,130,246,.1);">
          <svg viewBox="0 0 24 24" stroke="#60a5fa"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
        </div>
        <div>
          <div class="hw-title">+3 pacientes nuevos</div>
          <div class="hw-sub">Esta semana · Meta Ads · $18 c/u</div>
        </div>
      </div>
      <div class="hw-card">
        <div class="hw-icon-wrap" style="background:rgba(37,211,102,.1);">
          <img src="https://cdn.simpleicons.org/whatsapp/25D366" width="15" height="15" alt="WA" style="display:block;">
        </div>
        <div>
          <div class="hw-title">Recordatorio enviado</div>
          <div class="hw-sub">−54% no-shows este mes</div>
        </div>
      </div>
    </div>

    <img class="hero-illus-img" src="/landing/hero-product.png" alt="Equipo completo de Zentro Med: estratega, ads manager, content creator, CRM y agenda, WhatsApp IA" width="1672" height="941" />
  </div>
</section>

<!-- STATS BAR -->
<div class="stats-bar" style="background:var(--zm-night);border-color:rgba(255,255,255,.07);">
  <div class="wrap">
    <div class="stats-bar-inner">
      <div class="stat-item">
        <div class="stat-n2"><span>+41%</span></div>
        <div class="stat-l2">aumento en pacientes nuevos*</div>
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
        <div class="stat-n2"><span>3.2x</span></div>
        <div class="stat-l2">retorno promedio en pauta digital*</div>
      </div>
    </div>
  </div>
  <p class="stats-note">* Promedio de clientes activos en los primeros 90 días. Resultados individuales varían según especialidad, ciudad y presupuesto de pauta. No garantizamos métricas específicas.<br>† Activación del CRM, agenda y WhatsApp básico. Campañas de ads sujetas a aprobación de plataformas (Meta/Google): 5–14 días adicionales.</p>
</div>

<!-- TRUST STRIP -->
<div class="trust-section">
  <div class="wrap">
    <div class="trust-inner">
      <span class="trust-label">Integrado con</span>
      <div class="trust-logos">
        <div class="trust-logo"><img src="https://cdn.simpleicons.org/whatsapp/4ade5a" width="28" height="28" alt="WhatsApp" style="display:block;">WhatsApp Cloud API</div>
        <div class="trust-div"></div>
        <div class="trust-logo"><img src="https://cdn.simpleicons.org/meta/4ade5a" width="28" height="28" alt="Meta" style="display:block;">Meta Ads</div>
        <div class="trust-div"></div>
        <div class="trust-logo"><img src="https://cdn.simpleicons.org/googleads/4ade5a" width="28" height="28" alt="Google Ads" style="display:block;">Google Ads</div>
        <div class="trust-div"></div>
        <div class="trust-logo"><img src="https://cdn.simpleicons.org/instagram/4ade5a" width="28" height="28" alt="Instagram" style="display:block;">Instagram</div>
        <div class="trust-div"></div>
        <div class="trust-logo"><img src="https://cdn.simpleicons.org/stripe/4ade5a" width="28" height="28" alt="Stripe" style="display:block;">Stripe</div>
      </div>
    </div>
  </div>
</div>

<!-- DIFERENCIADOR 2-EN-1 -->
<section class="diff-section">
  <div class="wrap">
    <div class="diff-header reveal">
      <p class="section-label" style="color:rgba(74,222,90,.6);">// Por qué Zentro Med</p>
      <h2 class="section-title" style="color:var(--zm-white);">No es solo un CRM.<br>No es solo una agencia de marketing.</h2>
      <p class="section-sub" style="color:rgba(255,255,255,.45);margin:12px auto 0;">La mayoría de consultorios tiene que elegir uno o el otro. Zentro Med elimina esa decisión — y te cuesta menos que un asistente administrativo.</p>
    </div>
    <div class="diff-cols reveal-group">
      <div class="diff-col diff-col-bad">
        <div class="diff-col-label">
          <div class="diff-icon">❌</div>
          <span>Las alternativas típicas</span>
        </div>
        <ul class="diff-list">
          <li class="diff-item"><div class="diff-dot">✕</div><span class="diff-item-text">Agencia de marketing: $800–$2.000/mes — sin CRM, sin seguimiento de citas</span></li>
          <li class="diff-item"><div class="diff-dot">✕</div><span class="diff-item-text">CRM genérico (HubSpot, Zoho): gestiona contactos pero no tiene equipo que ejecute campañas</span></li>
          <li class="diff-item"><div class="diff-dot">✕</div><span class="diff-item-text">Asistente administrativo: gestiona el WhatsApp pero no puede hacer anuncios ni trackear resultados</span></li>
          <li class="diff-item"><div class="diff-dot">✕</div><span class="diff-item-text">Lead de campaña y agenda de citas en sistemas separados — los prospectos se pierden en el camino</span></li>
          <li class="diff-item"><div class="diff-dot">✕</div><span class="diff-item-text">No sabes qué canal genera más citas reales ni cuánto cuesta cada paciente nuevo</span></li>
        </ul>
      </div>
      <div class="diff-col diff-col-good">
        <div class="diff-col-label">
          <div class="diff-icon">✓</div>
          <span>Zentro Med — 2 en 1</span>
        </div>
        <ul class="diff-list">
          <li class="diff-item"><div class="diff-dot">✓</div><span class="diff-item-text"><strong>CRM + equipo de marketing</strong> desde $299/mes — un solo cobro, una sola plataforma</span></li>
          <li class="diff-item"><div class="diff-dot">✓</div><span class="diff-item-text"><strong>Estratega + diseñador + ads manager</strong> dedicados, sin que tú los contrates ni coordines</span></li>
          <li class="diff-item"><div class="diff-dot">✓</div><span class="diff-item-text"><strong>WhatsApp IA</strong> convierte el lead de tu campaña en cita confirmada — automáticamente</span></li>
          <li class="diff-item"><div class="diff-dot">✓</div><span class="diff-item-text"><strong>Dashboard unificado</strong>: costo por cita, tasa de retención y ROI de pauta en un solo lugar</span></li>
          <li class="diff-item"><div class="diff-dot">✓</div><span class="diff-item-text">El dinero de los anuncios va directo a tu cuenta de Meta/Google — <strong>tú controlas el presupuesto</strong></span></li>
        </ul>
      </div>
    </div>
    <div class="illus-slot reveal" style="max-width:860px;margin:32px auto 0;min-height:180px;">
      <span class="illus-badge">// Imagen comparativa</span>
      <div class="illus-icon-wrap"><i data-lucide="columns-2"></i></div>
      <p class="illus-label">Vista "Sin Zentro vs Con Zentro"</p>
      <p class="illus-hint">Reemplazar con imagen comparativa estilo before/after (860×340px)</p>
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
        <div class="prob-icon"><i data-lucide="user-x"></i></div>
        <div class="prob-title">Pacientes que no regresan</div>
        <div class="prob-desc">Sin seguimiento automático, el paciente que no agenda su próxima cita simplemente desaparece. Recuperarlo después cuesta 5 veces más que retenerlo.</div>
        <span class="prob-tag">Pérdida de retención</span>
      </div>
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="message-circle-warning"></i></div>
        <div class="prob-title">WhatsApp desbordado</div>
        <div class="prob-desc">Confirmaciones manuales, citas por mensaje, recordatorios uno a uno. El WhatsApp del consultorio se convierte en un caos que consume horas cada día.</div>
        <span class="prob-tag">Caos operativo</span>
      </div>
      <div class="prob-card">
        <div class="prob-icon"><i data-lucide="eye-off"></i></div>
        <div class="prob-title">Invisible en Google y redes</div>
        <div class="prob-desc">Tu competencia aparece primero cuando alguien busca tu especialidad en tu ciudad. Sin presencia digital activa, los pacientes nuevos van con quien se ve.</div>
        <span class="prob-tag">Sin captación digital</span>
      </div>
    </div>
  </div>
</section>

<!-- SOLUTION: CRM -->
<section class="solution" id="como">
  <div class="wrap">
    <div class="solution-grid">
      <div class="solution-visual">
        <img class="illus-img" src="/landing/crm-dashboard.png" alt="Dashboard del CRM de Zentro Med: citas de la semana, no-shows, pacientes nuevos y agenda semanal" width="1672" height="941" />
        <div>
          <p class="sol-tag">// Zentro Med CRM</p>
          <p class="sol-title">La operación de tu consultorio, organizada</p>
        </div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>WhatsApp compartido</strong> — Toda la comunicación del consultorio centralizada, con respuestas automáticas para citas y recordatorios.</div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Seguimiento de contactos</strong> — Nuevo prospecto → primera cita → seguimiento → reactivación. Sin que nadie se pierda en el camino.</div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Agenda online 24/7</strong> — Los pacientes agendan solos. Recordatorio automático 24h antes. Sin llamadas manuales.</div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Perfil del contacto</strong> — Historial de citas, comunicaciones y notas de seguimiento por persona. Accesible desde cualquier dispositivo. <span style="color:rgba(255,255,255,.35);font-size:12px;">(No es historia clínica)</span></div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Cotizaciones y cobros</strong> — Genera propuestas de servicio y registra pagos desde el mismo sistema que la agenda.</div></div>
      </div>
      <div class="solution-copy">
        <p class="section-label">// CRM para consultorios</p>
        <h2 class="section-title">Un sistema que trabaja mientras tú consultas</h2>
        <p class="section-sub">Zentro Med gestiona la parte comercial y operativa del consultorio para que tú te concentres en el paciente. No en el WhatsApp.</p>
        <div class="benefit-list">
          <div class="benefit-item"><div class="benefit-num">1</div><div class="benefit-text"><h4>Reducción de no-shows</h4><p>Los recordatorios automáticos por WhatsApp reducen los no-shows hasta en un 54% en promedio.* Sin que nadie tenga que llamar.</p></div></div>
          <div class="benefit-item"><div class="benefit-num">2</div><div class="benefit-text"><h4>Más reactivaciones</h4><p>Identifica pacientes que no han vuelto en 30, 60 o 90 días y reactívalos automáticamente con un mensaje personalizado.</p></div></div>
          <div class="benefit-item"><div class="benefit-num">3</div><div class="benefit-text"><h4>Equipo alineado</h4><p>Médicos, recepcionistas y administrativos ven lo mismo en tiempo real. Sin hojas de cálculo ni cuadernos.</p></div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SOLUTION: MARKETING -->
<section class="solution" style="background:var(--zm-surface);padding-top:0;padding-bottom:clamp(64px,9vw,100px);">
  <div class="wrap">
    <div class="solution-grid reverse">
      <div class="solution-copy">
        <p class="section-label">// Equipo de marketing incluido</p>
        <h2 class="section-title">Tu equipo de marketing completo,<br>incluido en la suscripción</h2>
        <p class="section-sub">Estratega, diseñador y ads manager ya están en tu plan — gestionan campañas, contenido y SEO local para que aparezcas primero cuando alguien busca tu especialidad en tu ciudad.</p>
        <div class="benefit-list">
          <div class="benefit-item"><div class="benefit-num">1</div><div class="benefit-text"><h4>Campañas en Meta Ads y Google</h4><p>Anuncios dirigidos a pacientes en tu ciudad y especialidad. Gestionados y optimizados cada semana.</p></div></div>
          <div class="benefit-item"><div class="benefit-num">2</div><div class="benefit-text"><h4>Landing de especialidad</h4><p>Página de aterrizaje optimizada para tu especialidad y ciudad. No una página genérica — una pensada para convertir visitas en citas.</p></div></div>
          <div class="benefit-item"><div class="benefit-num">3</div><div class="benefit-text"><h4>Reporte de captación vs. retención</h4><p>Sabes exactamente cuántos pacientes nuevos llegaron, de dónde, y cuánto costó cada uno. Sin suposiciones.</p></div></div>
        </div>
      </div>
      <div class="solution-visual" style="background:var(--zm-night2);">
        <img class="illus-img" src="/landing/marketing-dashboard.png" alt="Dashboard de campañas de marketing de Zentro Med: ROAS, pacientes nuevos y costo por lead en Meta y Google Ads" width="1672" height="941" />
        <div>
          <p class="sol-tag">// Zentro Salud — Marketing gestionado</p>
          <p class="sol-title">Captación digital para tu especialidad</p>
        </div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Contenido mensual</strong> — Piezas para Instagram, Facebook y Google My Business creadas por tu equipo.</div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Meta Ads gestionado</strong> — Campañas en Facebook e Instagram segmentadas por especialidad, ciudad y perfil de paciente.</div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>SEO local</strong> — Aparece en los primeros resultados cuando buscan tu especialidad en tu ciudad. <span style="color:var(--zm-g);">(Solo en Pro)</span></div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Dashboard en tiempo real</strong> — Métricas de pacientes nuevos, costo por cita generada y retorno de pauta.</div></div>
        <div class="feature-row"><div class="feat-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="feat-text"><strong>Presupuesto de pauta tuyo</strong> — El dinero de los anuncios va directo a Meta y Google desde tu cuenta. Zentro gestiona, tú controlas.</div></div>
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
        <p class="mid-cta-head">CRM + equipo de marketing — activo en 24 horas.</p>
      </div>
      <a href="/signup" class="btn btn-green btn-lg" style="flex-shrink:0;" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'mid_page'});">Empezar gratis →</a>
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
      <div class="how-step"><div class="step-num">1</div><div class="step-title">Prueba gratis</div><div class="step-desc">Activa tu cuenta en 2 minutos. 30 días con todas las funciones, sin tarjeta.</div></div>
      <div class="how-step"><div class="step-num">2</div><div class="step-title">Setup en 24h</div><div class="step-desc">Tu estratega configura WhatsApp, agenda y CRM. Tú solo nos dices cómo funciona tu consultorio.</div></div>
      <div class="how-step"><div class="step-num">3</div><div class="step-title">Primeras citas</div><div class="step-desc">Las campañas se activan y los primeros pacientes nuevos empiezan a llegar en la semana 1–2.</div></div>
      <div class="how-step"><div class="step-num">4</div><div class="step-title">Crecimiento continuo</div><div class="step-desc">Optimizamos cada mes con datos reales. Sabes exactamente qué funciona y cuánto cuesta cada paciente.</div></div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="planes">
  <div class="wrap">
    <div class="pricing-header reveal">
      <p class="section-label">// Planes</p>
      <h2 class="section-title">Empieza gratis. Crece con tu ritmo.</h2>
    </div>
    <p class="pricing-sub-note">// Setup único <span class="price-sym">$</span><span class="price-amt" data-usd="99">99</span> <span class="price-curr-label">USD</span> · El presupuesto de pauta va aparte y lo defines tú</p>
    <div class="plans-grid reveal-group">

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
        <a href="/signup" class="plan-btn btn-plan-free" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'free_trial'});">Empezar gratis →</a>
        <p class="plan-fine">// Sin tarjeta · Cancela cuando quieras</p>
      </div>

      <div class="plan-card">
        <span class="plan-badge badge-crm">Solo CRM</span>
        <div class="plan-name">Zentro Med</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="49">49</span><sub>/usuario/mes</sub></div>
        <div class="plan-note">+<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span> por usuario adicional</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-ai-num">500 mensajes IA incluidos</span> · sin configuración <span class="pf-ai-pill">IA</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo del plan gratuito</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Hasta 1.000 pacientes activos</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Automatizaciones y flows WhatsApp</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Recordatorios automáticos · −54% no-shows</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Soporte por WhatsApp</div>
          <div class="pf" style="color:var(--zm-muted2);"><div class="pf-check" style="background:var(--zm-line2);"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>Sin marketing gestionado</div>
        </div>
        <a href="/signup?plan=standalone" class="plan-btn btn-plan-crm" onclick="if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'standalone_crm'});">Suscribirme →</a>
        <p class="plan-fine">// Setup <span class="price-sym">$</span><span class="price-amt" data-usd="99">99</span> <span class="price-curr-label">USD</span> · Sin contratos</p>
      </div>

      <div class="plan-card featured">
        <div class="plan-chip">⭐ Más popular</div>
        <div class="plan-name">Zentro Salud Starter</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="299">299</span><sub>/mes</sub></div>
        <div class="plan-note">2 usuarios incl. · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span>/usuario</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-ai-num">1.500 mensajes IA incluidos</span> · listo desde el día 1 <span class="pf-ai-pill">IA</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Zentro Med</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Hasta 5.000 pacientes activos</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Contenido mensual (8 piezas + stories)</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Meta Ads gestionado</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Landing de especialidad</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Dashboard semanal</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Soporte prioritario 24h</div>
        </div>
        <a href="/signup?plan=zentro_salud_starter" class="plan-btn btn-plan-pop" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'salud_starter'});">Empezar con Starter →</a>
        <p class="plan-fine">// Setup <span class="price-sym">$</span><span class="price-amt" data-usd="99">99</span> <span class="price-curr-label">USD</span> · 30 días gratis · Sin contratos</p>
      </div>

      <div class="plan-card dark-card">
        <span class="plan-badge badge-pro">Pro</span>
        <div class="plan-name">Zentro Salud Pro</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt" data-usd="499">499</span><sub>/mes</sub></div>
        <div class="plan-note">2 usuarios incl. · +<span class="price-sym">$</span><span class="price-amt" data-usd="25">25</span> <span class="price-curr-label">USD</span>/usuario</div>
        <div class="plan-divider"></div>
        <div class="plan-features">
          <div class="pf"><div class="pf-check pf-check-ai"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-ai-num">5.000 mensajes IA incluidos</span> · base de conocimiento <span class="pf-ai-pill">IA</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Todo lo de Starter</div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Pacientes ilimitados</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Google Ads + SEO local</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">20 piezas + 6 reels/mes</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Dashboard captación vs. retención</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">2 sesiones de estrategia/mes</span></div>
          <div class="pf"><div class="pf-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="pf-new">Account manager exclusivo · 4h respuesta</span></div>
        </div>
        <a href="/signup?plan=zentro_salud_pro" class="plan-btn btn-plan-pro" onclick="if(typeof fbq!=='undefined')fbq('track','InitiateCheckout');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'plan',event_label:'salud_pro'});">Empezar con Pro →</a>
        <p class="plan-fine">// Setup <span class="price-sym">$</span><span class="price-amt" data-usd="99">99</span> <span class="price-curr-label">USD</span> · 30 días gratis · Sin contratos</p>
      </div>

    </div>
    <p style="text-align:center;margin-top:24px;font-size:12px;color:var(--zm-muted2);font-family:'JetBrains Mono',monospace;line-height:1.8;">
      * El presupuesto de pauta (Meta/Google Ads) va directo a tu cuenta — Zentro gestiona las campañas, tú controlas el dinero.<br>
      † <span style="color:rgba(167,139,250,.7);">Mensajes IA</span> = auto-respuestas + redacción asistida generadas por el agente de IA en WhatsApp. Incluidos en tu plan — Zentro gestiona la infraestructura de IA, no necesitas crear cuentas en OpenAI ni Anthropic.<br>
      Zentro Med es una plataforma de gestión comercial y marketing. No es un software de historia clínica ni de facturación tributaria.
    </p>
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
        <div class="testi-result"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>−87% no-shows · Mes 1</div>
        <div class="testi-author"><div class="testi-av" style="background:#dcfce7;color:#15803d;">DR</div><div><div class="testi-name">Dr. Rodrigo M.</div><div class="testi-role">Médico general · Bogotá</div></div></div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"Pasamos de 12 consultas nuevas al mes a 41 en el tercer mes. El equipo de Zentro maneja todo — yo solo reviso el reporte los lunes."</p>
        <div class="testi-result"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>+241% pacientes nuevos · Mes 3</div>
        <div class="testi-author"><div class="testi-av" style="background:#dbeafe;color:#1d4ed8;">DL</div><div><div class="testi-name">Dra. Lucía V.</div><div class="testi-role">Dermatóloga · Medellín</div></div></div>
      </div>
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"La auditoría gratuita me mostró que 3 competidores aparecían antes que yo en Google. En 6 semanas ya estábamos en el primer lugar para mi especialidad en Cali."</p>
        <div class="testi-result"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>#1 en búsquedas locales · Semana 6</div>
        <div class="testi-author"><div class="testi-av" style="background:#f3e8ff;color:#7e22ce;">CE</div><div><div class="testi-name">Dr. Carlos E.</div><div class="testi-role">Ortopedista · Cali</div></div></div>
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
      <div class="faq-item" onclick="zmToggleFaq(this)">
        <div class="faq-q">¿El CRM maneja datos de pacientes de forma segura?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Los datos se almacenan con cifrado en tránsito y en reposo. Zentro Med es una herramienta de gestión comercial y marketing — gestiona citas, contactos y comunicaciones de negocio. No es un sistema de historia clínica; los datos clínicos de tus pacientes son tu responsabilidad exclusiva como profesional de salud.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)">
        <div class="faq-q">¿Funciona para especialistas, no solo médicos generales?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Trabajamos con dermatología, ortopedia, odontología, psicología, oftalmología, medicina estética y más. El CRM y las campañas se adaptan a tu especialidad y a tu ciudad específica.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)">
        <div class="faq-q">¿El presupuesto de anuncios está incluido?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">No. El presupuesto de pauta va directo a Meta o Google desde tu cuenta — tú tienes el control total del dinero. La suscripción cubre la gestión, estrategia y creación de contenido. Así no hay conflicto de interés.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)">
        <div class="faq-q">¿Cuánto tiempo hasta ver los primeros pacientes nuevos?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">El CRM se activa en 24h. Las campañas de Meta Ads suelen generar los primeros contactos en la semana 1–2 (sujeto a aprobación de Meta, que puede tomar 2–5 días adicionales). Resultados sostenibles al mes 2–3.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)">
        <div class="faq-q">¿Puedo cancelar cuando quiera?
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">Sí. Sin contratos ni penalidades. Eres dueño de todos tus datos, accesos y activos digitales desde el día uno — al cancelar simplemente revocas nuestro acceso colaborador. No te dejamos rehén de nada.</div></div>
      </div>
      <div class="faq-item" onclick="zmToggleFaq(this)">
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
    <p>30 días con todas las funciones. Sin tarjeta. Configuración en 24 horas.</p>
    <div class="cta-btns">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'cta_final'});">Probar gratis 30 días →</a>
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
    <span class="mob-cta-sub">sin tarjeta · CRM + marketing médico</span>
  </div>
  <a href="/signup" class="btn btn-green" style="font-size:13px;padding:10px 16px;flex-shrink:0;" onclick="if(typeof gtag!=='undefined')gtag('event','mobile_sticky_cta_click',{event_category:'cta',event_label:'sticky_bar_mobile'});">Empezar →</a>
</div>
`;

// Global functions the inline onclick="..." handlers above call, plus
// scroll-reveal + Lucide icon init. Runs as a real <script> (not
// innerHTML), so these become real globals unlike anything defined
// inside LANDING_BODY_HTML.
const LANDING_BEHAVIOR_SCRIPT = `
function zmToggleFaq(el) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

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

(function pollForLucide() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    return;
  }
  setTimeout(pollForLucide, 50);
})();

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
  document.querySelectorAll('.price-amt').forEach(function(el) {
    el.textContent = zmFmtAmt(parseFloat(el.dataset.usd), c);
  });
  document.querySelectorAll('.price-sym').forEach(function(el) { el.textContent = c.sym; });
  document.querySelectorAll('.price-curr-label').forEach(function(el) { el.textContent = code; });
  document.getElementById('currFlag').textContent = c.flag;
  document.getElementById('currCode').textContent = code;
  document.getElementById('currSwitch').classList.remove('open');
  document.querySelectorAll('.curr-opt').forEach(function(el) {
    el.classList.toggle('curr-active', el.dataset.curr === code);
  });
}

document.addEventListener('click', function() {
  var el = document.getElementById('currSwitch');
  if (el) el.classList.remove('open');
});
`;

export default function LandingPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- deliberately scoped to just this page, not the app-wide font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <style>{LANDING_CSS}</style>

      <div className="zm-landing" dangerouslySetInnerHTML={{ __html: LANDING_BODY_HTML }} />

      <Script id="zm-lucide" src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" strategy="afterInteractive" />
      <Script
        id="zm-behavior"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: LANDING_BEHAVIOR_SCRIPT }}
      />
      <Script id="zm-meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '2174696826436902');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- tracking pixel, not a real content image */}
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=2174696826436902&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-C701FB52EP" strategy="afterInteractive" />
      <Script id="zm-ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-C701FB52EP');
        `}
      </Script>
    </>
  );
}
