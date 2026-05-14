// 806 Growth — Free Business Visibility Audit Cloudflare Worker
// Single file: serves HTML + handles API. Zero cost at scale.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API endpoint
    if (request.method === 'POST' && url.pathname === '/api/audit') {
      try {
        const body = await request.json();
        const results = await runAudit(body.url);

        // Fire-and-forget GHL webhook (lead capture into 806 Growth sub-account)
        if (body.email) {
          const scoreLevel = results.composite_score >= 75 ? 'score-high' :
                           results.composite_score >= 55 ? 'score-mid' : 'score-low';
          const typeTag = 'type-' + (body.businessType || 'other')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 30);

          // Tag array includes BOTH the standard site pattern (806 Growth / Web Lead /
          // SEO Audit — required for Web Lead Internal Alerts + Tag-Added nurture
          // workflows to fire) AND the legacy custom tags (audit-lead /
          // source-visibility-tool / type-* / score-* — required for the existing
          // "SEO Audit Email Sequence" workflow that's already published). GHL stores
          // tags lowercase; trigger filters match case-insensitively.
          const standardTags = ['806 Growth', 'Web Lead', 'SEO Audit'];
          const legacyTags = ['audit-lead', 'source-visibility-tool', typeTag, scoreLevel, 'email-provided'];

          fetch('https://services.leadconnectorhq.com/hooks/jDoRsNEPg0qtXUYNouR3/webhook-trigger/1W0WEZzu3MzXX1PpAmXw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand:           '806 Growth',
              source_form:     'seo_audit',
              first_name:      body.businessName,
              business_name:   body.businessName,
              industry:        body.businessType,
              location:        body.location,
              email:           body.email,
              website:         body.url,
              overall_score:   results.composite_score,
              seo_score:       results.seo_score,
              technical_score: results.technical_score,
              ai_score:        results.ai_score,
              social_score:    results.social_score,
              // legacy keys preserved for the existing SEO Audit Email Sequence workflow
              businessName:    body.businessName,
              businessType:    body.businessType,
              overallScore:    results.composite_score,
              seoScore:        results.seo_score,
              technicalScore:  results.technical_score,
              aiScore:         results.ai_score,
              socialScore:     results.social_score,
              source:          'free-audit-tool',
              tags:            [...standardTags, ...legacyTags].join(','),
              page_url:        'https://audit.806growth.com/',
              timestamp:       new Date().toISOString(),
            })
          }).catch(() => {});
        }

        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Serve HTML page
    if (request.method === 'GET') {
      return new Response(HTML_PAGE, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};


// ── Audit Logic (all free, no paid APIs) ──────────────────────

async function runAudit(targetUrl) {
  // Normalize URL (handle http/https/www variants)
  targetUrl = targetUrl.trim().toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, 'https://');
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  const start = Date.now();
  let html = '';
  let finalUrl = targetUrl;

  try {
    const resp = await fetch(targetUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000)
    });
    html = await resp.text();
    finalUrl = resp.url;
  } catch (e) {
    // If fetch fails completely, return minimal data
    return {
      audit_id: crypto.randomUUID(),
      composite_score: 0,
      seo_score: 0,
      technical_score: 0,
      ai_score: 0,
      social_score: 0,
      quick_wins: ['Website could not be reached — check if the URL is correct'],
      proof: { title: '', phone: '', hasHTTPS: false, hasViewport: false, hasSchema: false, hasFAQ: false, hasOG: false, hasRobots: false, hasSitemap: false, hasFavicon: false, socialLinks: [], responseTime: 0, imageCount: 0, imagesWithAlt: 0 }
    };
  }

  const responseTime = Date.now() - start;
  const htmlLower = html.toLowerCase();

  // ── SEO Score (40%) ──
  let seoScore = 95; // Start at 95 instead of 100 — no perfect scores
  const hasHTTPS = finalUrl.startsWith('https://');
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const hasTitle = title.length > 0;
  const titleLength = title.length;
  const hasMetaDesc = /name=["']description["'][^>]*content=["'][^"']+["']/i.test(html) ||
                      /content=["'][^"']+["'][^>]*name=["']description["']/i.test(html);
  const hasH1 = /<h1[\s>]/i.test(html);
  const hasViewport = /name=["']viewport["']/i.test(html);
  const hasOG = /property=["']og:/i.test(html);

  // Deductions
  if (!hasHTTPS) seoScore -= 20;
  if (!hasTitle) seoScore -= 15;
  else if (titleLength < 30 || titleLength > 60) seoScore -= 5; // Title too short/long
  if (!hasMetaDesc) seoScore -= 15;
  if (!hasH1) seoScore -= 10;
  if (!hasViewport) seoScore -= 20;
  if (!hasOG) seoScore -= 8;
  // Always deduct for missing local keywords
  if (!htmlLower.includes('lubbock') && !htmlLower.includes('texas') && 
      !htmlLower.includes('near me') && !htmlLower.includes('local')) seoScore -= 7;
  seoScore = Math.max(0, seoScore);

  // ── Technical Score (25%) ──
  let technicalScore = 0;
  const origin = new URL(finalUrl).origin;

  let hasRobots = false;
  try {
    const robotsResp = await fetch(origin + '/robots.txt', { signal: AbortSignal.timeout(5000) });
    hasRobots = robotsResp.ok;
  } catch {}

  let hasSitemap = false;
  try {
    const sitemapResp = await fetch(origin + '/sitemap.xml', { signal: AbortSignal.timeout(5000) });
    hasSitemap = sitemapResp.ok;
  } catch {}

  const hasFavicon = /rel=["'][^"']*icon[^"']*["']/i.test(html);

  if (hasRobots) technicalScore += 25;
  if (hasSitemap) technicalScore += 25;
  if (hasFavicon) technicalScore += 15;
  if (responseTime < 2000) technicalScore += 30;  // Reduced from 35
  else if (responseTime < 4000) technicalScore += 18; // Reduced from 20
  else technicalScore += 5;
  
  // Cap at 95 — no perfect technical scores
  technicalScore = Math.min(95, technicalScore);

  // ── AI Visibility Score (20%) ──
  let aiScore = 0;
  const hasSchema = /application\/ld\+json/i.test(html) || /schema\.org/i.test(html);
  const hasFAQ = /frequently asked/i.test(htmlLower) || /itemtype="https:\/\/schema\.org\/FAQPage"/i.test(html) || /\bfaq\b/i.test(htmlLower);

  if (hasSchema) aiScore += 42;  // Reduced from 45
  if (hasFAQ) aiScore += 38;     // Reduced from 40
  // Bonus for multiple schema types
  const schemaCount = (html.match(/application\/ld\+json/gi) || []).length;
  if (schemaCount > 1) aiScore += 13;  // Reduced from 15
  
  // Cap at 95 — no perfect AI scores
  aiScore = Math.min(95, aiScore);

  // ── Social Presence Score (15%) ──
  const socialPlatforms = [
    { name: 'Facebook', regex: /facebook\.com\/[a-zA-Z0-9._-]+/i },
    { name: 'Instagram', regex: /instagram\.com\/[a-zA-Z0-9._-]+/i },
    { name: 'LinkedIn', regex: /linkedin\.com\/(company|in)\/[a-zA-Z0-9._-]+/i },
    { name: 'Yelp', regex: /yelp\.com\/biz\/[a-zA-Z0-9._-]+/i },
    { name: 'Twitter/X', regex: /(twitter\.com|x\.com)\/[a-zA-Z0-9._-]+/i },
  ];

  const socialLinks = [];
  for (const platform of socialPlatforms) {
    const match = html.match(platform.regex);
    if (match) socialLinks.push(platform.name + ': ' + match[0]);
  }
  // Cap at 95 — max 4-5 platforms = 95 (not 100)
  const socialScore = Math.min(socialLinks.length * 20, 95);

  // ── Phone number detection ──
  const phoneMatch = html.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  const phone = phoneMatch ? phoneMatch[1] : '';

  // ── Image alt check ──
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const firstFive = imgMatches.slice(0, 10);
  const imagesWithAlt = firstFive.filter(img => /alt=["'][^"']+["']/i.test(img)).length;

  // ── Composite Score ──
  const composite = Math.round(
    seoScore * 0.40 +
    technicalScore * 0.25 +
    aiScore * 0.20 +
    socialScore * 0.15
  );

  // ── Quick Wins (Always 3-7 recommendations) ──
  const quickWins = [];
  
  // Critical issues (high impact)
  if (!hasHTTPS) quickWins.push("🔴 Add SSL certificate — 30% of visitors leave when they see 'Not Secure'");
  if (!hasViewport) quickWins.push("🔴 Add mobile viewport — 60% of your traffic is mobile");
  if (!hasSchema) quickWins.push("🔴 Add schema markup — get 3x more visibility in ChatGPT & AI search");
  
  // High-value wins
  if (!hasTitle) quickWins.push("🟠 Add a compelling title tag — increases click-through rate by 15-20%");
  if (!hasMetaDesc) quickWins.push("🟠 Write a meta description — helps Google understand your page");
  if (!hasFAQ) quickWins.push("🟠 Add FAQ section — captures 40% more AI search traffic");
  
  // Technical foundations
  if (!hasRobots) quickWins.push("🟡 Create robots.txt — helps Google crawl your site properly");
  if (!hasSitemap) quickWins.push("🟡 Add sitemap.xml — ensures all pages get indexed");
  
  // Local SEO gaps
  if (socialLinks.length === 0) {
    quickWins.push("🟡 Add social media links to your footer — we checked for Facebook, Instagram, LinkedIn, Yelp, and Twitter but didn't find any. Builds trust and boosts local SEO");
  }
  if (!phone) quickWins.push("🟡 Add a visible phone number — increases calls by 20-30%");
  
  // Always-recommend optimizations (even for high scores)
  if (quickWins.length < 3) {
    if (socialLinks.length < 3) quickWins.push("🟢 Connect more social profiles — LinkedIn, Yelp, and Facebook");
    if (!hasFAQ && hasSchema) quickWins.push("🟢 Add FAQ schema markup — helps Google show rich results");
    if (imagesWithAlt < firstFive.length / 2) quickWins.push("🟢 Add alt text to images — improves SEO and accessibility");
    if (responseTime > 2000) quickWins.push("🟢 Optimize page speed — 53% of visitors leave if load takes over 3 seconds");
    if (!htmlLower.includes('review')) quickWins.push("🟢 Add customer reviews — builds trust and improves local rankings");
    if (!htmlLower.includes('location') && !htmlLower.includes('map')) quickWins.push("🟢 Embed Google Maps — helps local customers find you");
  }
  
  // Ensure minimum 3 recommendations
  if (quickWins.length < 3) {
    quickWins.push("🟢 Add LocalBusiness schema with service areas");
    quickWins.push("🟢 Create service-specific landing pages");
    quickWins.push("🟢 Add 'near me' keywords for local search");
  }

  return {
    audit_id: crypto.randomUUID(),
    composite_score: composite,
    seo_score: seoScore,
    technical_score: technicalScore,
    ai_score: aiScore,
    social_score: socialScore,
    quick_wins: quickWins.slice(0, 7),  // Show up to 7 recommendations
    proof: {
      title: title.substring(0, 80),
      phone,
      hasHTTPS,
      hasViewport,
      hasSchema,
      hasFAQ,
      hasOG,
      hasRobots,
      hasSitemap,
      hasFavicon,
      socialLinks,
      responseTime,
      imageCount: imgMatches.length,
      imagesWithAlt
    }
  };
}


// ── HTML Page ─────────────────────────────────────────────────

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- PostHog Analytics (1M events/mo free) -->
  <script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog&&window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture Ie".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    // PostHog token placeholder check
    const POSTHOG_TOKEN = 'phc_webqS3XLpVJfWvn8BQ8PHpGoVFVYC8p2uski2fvZGnK3';
    if (POSTHOG_TOKEN === 'phc_REPLACEME') {
      console.warn('⚠️ PostHog token not set — analytics disabled. Replace phc_REPLACEME with real token.');
    }

    posthog.init(POSTHOG_TOKEN, {
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-01-30',
        // Privacy-first settings
        persistence: 'memory',           // No cookies/localStorage (GDPR-friendly)
        property_blacklist: ['$ip'],     // Strip IP for max privacy
        respect_dnt: true,               // Honor Do Not Track headers
    })
  </script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Free Business Visibility Audit — 806 Growth</title>
<meta name="description" content="Real scores for SEO, technical health, AI visibility, and social presence in 10 seconds. Built for Lubbock and West Texas service businesses. 100% free.">
<link rel="canonical" href="https://audit.806growth.com/">
<link rel="icon" type="image/svg+xml" href="https://806growth.com/favicon.svg">
<link rel="apple-touch-icon" href="https://806growth.com/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:url" content="https://audit.806growth.com/">
<meta property="og:title" content="Free Business Visibility Audit — 806 Growth">
<meta property="og:description" content="Real scores for SEO, technical health, AI visibility, and social presence in 10 seconds. Built for Lubbock and West Texas service businesses.">
<meta property="og:image" content="https://806growth.com/assets/og-image.png">
<meta property="og:site_name" content="806 Growth">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Free Business Visibility Audit — 806 Growth">
<meta name="twitter:description" content="Real scores in 10 seconds. 100% free. Built for West Texas service businesses.">
<meta name="twitter:image" content="https://806growth.com/assets/og-image.png">
<meta name="theme-color" content="#0a0a0a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --accent:#CC0000;
  --ember:#F26522;
  --bg:#0a0a0a;
  --surface:#141414;
  --surface-2:#1c1c1c;
  --text-white:#f5f5f5;
  --text-body:rgba(245,245,245,0.72);
  --text-muted:rgba(245,245,245,0.5);
  --border:rgba(255,255,255,0.08);
  --border-strong:rgba(255,255,255,0.15);
  --green:#00E676;
  --font-display:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;
}
html,body{background:var(--bg);color:var(--text-white)}
body{
  font-family:var(--font-display);
  min-height:100vh;
  padding:32px 16px;
  display:flex;
  flex-direction:column;
  align-items:center;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  background:
    radial-gradient(ellipse 800px 600px at 70% -10%, rgba(204,0,0,0.07) 0%, rgba(10,10,10,0) 55%),
    radial-gradient(ellipse 600px 500px at -10% 110%, rgba(242,101,34,0.05) 0%, rgba(10,10,10,0) 50%),
    var(--bg);
}
.card{
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:18px;
  box-shadow:0 25px 80px rgba(0,0,0,0.6);
  max-width:680px;
  width:100%;
  padding:40px 32px;
  position:relative;
  overflow:hidden;
}
.card::before{
  content:'';
  position:absolute;
  top:0;left:0;right:0;
  height:3px;
  background:linear-gradient(90deg,var(--accent) 0%,var(--ember) 100%);
}
.brand-mark{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:14px}
.brand-mark img{width:32px;height:32px;display:block}
.brand-mark span{font-family:var(--font-display);font-size:13px;font-weight:800;letter-spacing:0.14em;color:var(--text-white)}
.label{font-family:var(--font-mono);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent);font-weight:600;display:inline-flex;align-items:center;gap:8px;margin-bottom:14px}
.label-row{text-align:center;margin-bottom:6px}
.label-row .label{justify-content:center}
.label .dot{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent);animation:pulse 2s ease-in-out infinite;display:inline-block}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.85)}}
.audit-title{font-family:var(--font-display);font-size:clamp(1.55rem,3.4vw,1.95rem);font-weight:700;color:var(--text-white);line-height:1.2;margin-bottom:10px;text-align:center;letter-spacing:-0.01em}
.audit-sub{color:var(--text-body);font-size:15px;line-height:1.65;max-width:560px;margin:0 auto;text-align:center}
.badges{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;margin:22px 0 30px;color:var(--text-muted);font-size:13px}
.badge{display:inline-flex;align-items:center;gap:6px}
form{display:flex;flex-direction:column;gap:16px}
.field label{display:block;font-family:var(--font-mono);font-weight:600;color:var(--text-muted);margin-bottom:7px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase}
.field input,.field select{
  width:100%;padding:14px 16px;
  background:rgba(0,0,0,0.35);
  border:1px solid var(--border);
  border-radius:10px;
  color:var(--text-white);
  font-family:var(--font-display);
  font-size:15px;
  transition:border-color .2s ease,background .2s ease,box-shadow .2s ease;
  -webkit-font-smoothing:antialiased;
}
.field input::placeholder{color:rgba(245,245,245,0.28)}
.field input:focus,.field select:focus{
  outline:none;
  border-color:var(--accent);
  background:rgba(0,0,0,0.55);
  box-shadow:0 0 0 3px rgba(204,0,0,0.18);
}
.field select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%23f5f5f5' opacity='0.6'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:20px;padding-right:42px;cursor:pointer}
.field select option{background:var(--surface);color:var(--text-white)}
.btn{
  background:var(--accent);
  color:#fff;
  border:none;
  padding:15px 28px;
  font-size:15px;
  font-weight:600;
  font-family:var(--font-display);
  border-radius:10px;
  cursor:pointer;
  width:100%;
  transition:all .2s ease;
  letter-spacing:0.01em;
}
.btn:hover{background:#a30000;transform:translateY(-1px);box-shadow:0 12px 28px rgba(204,0,0,0.35)}
.btn:disabled{opacity:0.55;cursor:wait;transform:none;box-shadow:none}
.fact-box{
  background:rgba(204,0,0,0.06);
  padding:13px 16px;
  border-radius:10px;
  border-left:3px solid var(--accent);
  font-size:13px;
  color:var(--text-body);
  margin-top:16px;
  transition:opacity .3s ease;
}
.hidden{display:none!important}

/* Progress */
.progress{margin:20px 0}
.bar-wrap{background:rgba(255,255,255,0.06);border-radius:999px;height:14px;position:relative;overflow:hidden}
.bar{background:linear-gradient(90deg,var(--accent),var(--ember),var(--accent));background-size:200% 100%;height:100%;border-radius:999px;width:0%;transition:width .5s ease;animation:shimmer 2s linear infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.bar-pct{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:700;color:var(--text-white);font-family:var(--font-mono);letter-spacing:0.04em}
.step-box{background:rgba(255,255,255,0.04);border:1px solid var(--border);padding:14px 18px;border-radius:10px;margin-top:14px;border-left:3px solid var(--accent)}
.step-title{font-weight:600;color:var(--text-white);font-size:15px}
.step-desc{color:var(--text-muted);font-size:13px;margin-top:3px}

/* Results */
.overall{
  text-align:center;
  padding:32px 24px;
  background:linear-gradient(135deg,rgba(204,0,0,0.18) 0%,rgba(242,101,34,0.06) 100%);
  border:1px solid rgba(204,0,0,0.32);
  border-radius:14px;
  margin:20px 0;
}
.overall-label{font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:10px}
.overall-num{font-family:var(--font-display);font-size:4.5rem;font-weight:800;color:var(--accent);line-height:1;font-variant-numeric:tabular-nums}
.overall-msg{font-size:15px;margin-top:12px;color:var(--text-body);max-width:420px;margin-left:auto;margin-right:auto}
.scores{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0}
@media(max-width:500px){.scores{grid-template-columns:1fr}}
.score-card{
  text-align:center;
  background:rgba(255,255,255,0.04);
  border:1px solid var(--border);
  padding:22px 14px;
  border-radius:12px;
  transition:transform .2s ease,border-color .2s ease;
}
.score-card:hover{transform:translateY(-2px);border-color:rgba(204,0,0,0.32)}
.score-num{font-family:var(--font-display);font-size:2.6rem;font-weight:800;color:var(--accent);line-height:1;font-variant-numeric:tabular-nums}
.score-name{font-size:14px;font-weight:600;color:var(--text-white);margin-top:5px}
.score-sub{font-size:11.5px;color:var(--text-muted);margin-top:3px;line-height:1.4}
.section{margin:26px 0}
.section h3{
  color:var(--text-white);
  font-family:var(--font-display);
  font-size:17px;
  font-weight:700;
  margin-bottom:12px;
  letter-spacing:-0.005em;
}
.item{padding:12px 16px;border-radius:8px;margin-bottom:8px;font-size:14px;line-height:1.55;color:var(--text-body)}
.item-good{background:rgba(0,230,118,0.06);border-left:3px solid var(--green)}
.item-bad{background:rgba(204,0,0,0.08);border-left:3px solid var(--accent)}
.item-info{background:rgba(255,255,255,0.04);border-left:3px solid rgba(255,255,255,0.18)}
.cta-box{
  background:linear-gradient(135deg,rgba(204,0,0,0.18) 0%,rgba(242,101,34,0.06) 100%);
  border:1px solid rgba(204,0,0,0.35);
  border-left:4px solid var(--accent);
  color:var(--text-white);
  padding:28px 26px;
  border-radius:14px;
  text-align:center;
  margin:26px 0;
}
.cta-box h3{font-family:var(--font-display);font-size:1.3rem;margin-bottom:10px;font-weight:700;color:var(--text-white);letter-spacing:-0.01em}
.cta-box p{color:var(--text-body);font-size:14.5px;line-height:1.6;margin-bottom:20px;max-width:480px;margin-left:auto;margin-right:auto}
.cta-btn{
  background:var(--accent);
  color:#fff;
  padding:14px 30px;
  border-radius:10px;
  text-decoration:none;
  font-weight:600;
  display:inline-block;
  font-family:var(--font-display);
  font-size:15px;
  transition:all .2s ease;
}
.cta-btn:hover{background:#a30000;transform:scale(1.04);box-shadow:0 12px 28px rgba(204,0,0,0.4)}
.email-gate{
  background:rgba(255,255,255,0.04);
  border:1px solid var(--border);
  padding:24px;
  border-radius:12px;
  margin:24px 0;
}
.email-gate h3{color:var(--text-white);margin-bottom:6px;font-size:15px;font-weight:600}
.email-gate p{color:var(--text-muted);font-size:13px;margin-bottom:0}
.email-row{display:flex;gap:10px;margin-top:14px}
@media(max-width:500px){.email-row{flex-direction:column}.email-row .btn{width:100%}}
.email-row input{
  flex:1;
  padding:13px 16px;
  background:rgba(0,0,0,0.35);
  border:1px solid var(--border);
  border-radius:10px;
  color:var(--text-white);
  font-size:14px;
  font-family:var(--font-display);
}
.email-row input::placeholder{color:rgba(245,245,245,0.28)}
.email-row input:focus{outline:none;border-color:var(--accent);background:rgba(0,0,0,0.55);box-shadow:0 0 0 3px rgba(204,0,0,0.18)}
.email-row .btn{width:auto;padding:13px 22px;font-size:14px}
.success-msg{text-align:center;padding:20px;color:var(--green);font-weight:600;font-size:14.5px}
.new-audit-btn{
  background:transparent;
  border:1px solid var(--border-strong);
  color:var(--text-body);
  width:auto;
  padding:12px 28px;
  font-size:14px;
}
.new-audit-btn:hover{background:rgba(255,255,255,0.05);border-color:var(--text-muted);color:var(--text-white);transform:none;box-shadow:none}
.footer{
  text-align:center;
  margin-top:32px;
  margin-bottom:8px;
  font-size:13px;
  color:var(--text-muted);
  line-height:1.7;
  max-width:600px;
}
.footer-brand{color:var(--text-white);font-weight:600;letter-spacing:0.06em;font-size:12px;text-transform:uppercase;font-family:var(--font-mono)}
.footer-nap{margin-top:6px}
.footer-nap a{color:var(--accent);text-decoration:none;font-weight:600}
.footer-nap a:hover{text-decoration:underline}
.footer-meta{margin-top:8px;font-size:12px;color:var(--text-muted)}
.footer-meta a{color:var(--text-muted);text-decoration:underline;text-decoration-color:rgba(255,255,255,0.2)}
.footer-meta a:hover{color:var(--text-body)}
</style>
</head>
<body>

<div class="card" id="formCard">
  <div class="brand-mark">
    <img src="https://806growth.com/assets/icon-806.png" alt="806 Growth" loading="lazy">
    <span>806 GROWTH</span>
  </div>
  <div class="label-row"><div class="label"><span class="dot"></span> FREE BUSINESS VISIBILITY AUDIT</div></div>
  <h1 class="audit-title">See where you stand in 10 seconds.</h1>
  <p class="audit-sub">Real scores for SEO, technical health, AI visibility, and social presence &mdash; built for service businesses in the 806 and across West Texas.</p>
  <div class="badges">
    <span class="badge">⚡ Instant results</span>
    <span class="badge">🆓 100% free</span>
    <span class="badge">📊 4 real scores</span>
  </div>
  <form id="auditForm">
    <div style="position:absolute;left:-9999px;top:-9999px" aria-hidden="true">
      <label>Leave this empty</label>
      <input type="text" name="hp_field" id="hpField" tabindex="-1" autocomplete="off">
    </div>
    <div class="field">
      <label>Website URL *</label>
      <input type="text" id="inpUrl" placeholder="yourbusiness.com" required>
    </div>
    <div class="field">
      <label>Business Name *</label>
      <input type="text" id="inpName" placeholder="Your Business Name" required>
    </div>
    <div class="field">
      <label>Business Type *</label>
      <select id="inpType" required>
        <option value="">Select type</option>
        <option>Local Service (Plumbing, HVAC, Roofing)</option>
        <option>Restaurant / Food</option>
        <option>Healthcare / Dental</option>
        <option>Professional (Law, RE, Accounting)</option>
        <option>Retail / eCommerce</option>
        <option>Home Services (Cleaning, Lawn, Handyman)</option>
        <option>Med Spa / IV Therapy / Wellness</option>
        <option>Fitness / Gym / Personal Training</option>
        <option>Auto (Repair, Detailing, Sales)</option>
        <option>Nonprofit / Community</option>
        <option>Other</option>
      </select>
    </div>
    <div class="field">
      <label>Location *</label>
      <input type="text" id="inpLoc" placeholder="Lubbock, TX" required>
    </div>
    <div class="field">
      <label>Email (optional — for detailed recommendations)</label>
      <input type="email" id="inpEmail" placeholder="your@email.com">
    </div>
    <div class="fact-box" id="factBox">💡 <span id="factText">60% of websites are invisible to ChatGPT</span></div>
    <button type="submit" class="btn" id="submitBtn">Get My Free Audit →</button>
  </form>
</div>

<div class="card hidden" id="progressCard">
  <div class="progress">
    <div class="bar-wrap">
      <div class="bar" id="bar"></div>
      <div class="bar-pct" id="barPct">0%</div>
    </div>
    <div class="step-box">
      <div class="step-title" id="stepTitle">Starting...</div>
      <div class="step-desc" id="stepDesc">Preparing analysis</div>
    </div>
    <div class="fact-box" style="margin-top:16px">💡 <span id="factText2">FAQ schema = 3x more AI citations</span></div>
  </div>
</div>

<div class="card hidden" id="resultsCard">
  <div class="brand-mark">
    <img src="https://806growth.com/assets/icon-806.png" alt="806 Growth" loading="lazy">
    <span>806 GROWTH</span>
  </div>
  <div class="label-row"><div class="label"><span class="dot"></span> YOUR VISIBILITY REPORT</div></div>

  <div class="overall">
    <div class="overall-label">Overall Visibility Score</div>
    <div class="overall-num" id="overallScore">--</div>
    <div class="overall-msg" id="overallMsg"></div>
  </div>

  <div class="scores">
    <div class="score-card">
      <div class="score-num" id="seoScore">--</div>
      <div class="score-name">SEO</div>
      <div class="score-sub">Title, meta, headings, mobile</div>
    </div>
    <div class="score-card">
      <div class="score-num" id="techScore">--</div>
      <div class="score-name">Technical</div>
      <div class="score-sub">Speed, robots, sitemap, favicon</div>
    </div>
    <div class="score-card">
      <div class="score-num" id="aiScore">--</div>
      <div class="score-name">AI Visibility</div>
      <div class="score-sub">Schema, FAQ, structured data</div>
    </div>
    <div class="score-card">
      <div class="score-num" id="socialScore">--</div>
      <div class="score-name">Social</div>
      <div class="score-sub">Facebook, Instagram, LinkedIn</div>
    </div>
  </div>

  <div class="section" id="goodSection">
    <h3>✅ What's Working Well</h3>
    <div id="goodList"></div>
  </div>

  <div class="section" id="badSection">
    <h3>💰 How to Get More Customers</h3>
    <div id="badList"></div>
  </div>

  <div class="section" id="proofSection">
    <h3>🔍 What We Found</h3>
    <div id="proofList"></div>
  </div>

  <div class="cta-box">
    <h3>🚀 Get 3x more customer calls in 30 days.</h3>
    <p>Let's plug the leaks. 15-minute call, no pitch, just numbers — and the exact system that gets you found, called, and booked.</p>
    <a href="https://806growth.com/pricing.html?plan=growth" class="cta-btn" target="_blank" id="ctaBtn" onclick="posthog.capture('cta_clicked', {source: 'results-page'})">Get My Custom 30-Day Growth Plan &rarr;</a>
  </div>

  <div class="email-gate" id="emailGate">
    <h3>📧 Want step-by-step fix instructions?</h3>
    <p>Get detailed recommendations emailed to you — including the issues we hid behind the lock above.</p>
    <div class="email-row">
      <input type="email" id="emailInput" placeholder="your@email.com">
      <button class="btn" id="emailBtn">Send Report</button>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px">
    <button class="btn new-audit-btn" id="newAuditBtn">&larr; Start New Audit</button>
  </div>
</div>

<div class="footer">
  <div class="footer-brand">806 Growth &mdash; Lubbock, TX</div>
  <div class="footer-nap">
    <a href="tel:+18064513133">(806) 451-3133</a>
    &nbsp;&middot;&nbsp;
    <a href="mailto:contact@806growth.com">contact@806growth.com</a>
  </div>
  <div class="footer-meta">
    <a href="https://806growth.com" target="_blank">806growth.com</a>
    &nbsp;&middot;&nbsp;
    <a href="https://806growth.com/privacy.html" target="_blank">Privacy</a>
    &nbsp;&middot;&nbsp;
    <a href="https://806growth.com/terms.html" target="_blank">Terms</a>
  </div>
</div>

<script>

const facts=[
  "60% of websites are invisible to ChatGPT",
  "87% of consumers search with AI tools first",
  "Complete GBP = 5x more local visibility",
  "Mobile optimization impacts 70% of search rankings",
  "Websites with schema get 30% more click-throughs",
  "Most local businesses score under 60 — huge opportunity",
  "53% of visitors leave if a page takes over 3 seconds"
];
let fi=0;
function rotateFact(){
  const el1=document.getElementById('factText');
  const el2=document.getElementById('factText2');
  fi=(fi+1)%facts.length;
  if(el1)el1.textContent=facts[fi];
  if(el2)el2.textContent=facts[fi];
}
document.getElementById('factText').textContent=facts[0];
setInterval(rotateFact,4000);

const steps=[
  {t:"🔍 Scanning Website",d:"Checking SEO basics, meta tags, mobile",p:25},
  {t:"⚙️ Technical Analysis",d:"Checking robots.txt, sitemap, speed",p:50},
  {t:"🤖 AI Visibility Check",d:"Scanning schema markup and FAQ data",p:75},
  {t:"📱 Social Presence Scan",d:"Finding Facebook, Instagram, LinkedIn links",p:90},
  {t:"✅ Complete!",d:"Your scores are ready",p:100}
];

document.getElementById('auditForm').addEventListener('submit',async e=>{
  e.preventDefault();
  // Honeypot bot check
  if(document.getElementById("hpField").value){return;}
  const url=document.getElementById('inpUrl').value.trim();
  const name=document.getElementById('inpName').value.trim();
  const type=document.getElementById('inpType').value;
  const loc=document.getElementById('inpLoc').value.trim();
  const email=document.getElementById('inpEmail').value.trim();

  document.getElementById('formCard').classList.add('hidden');
  // Track audit started
  posthog.capture('audit_started', {url: url, businessType: type})
  document.getElementById('progressCard').classList.remove('hidden');

  // Animate progress
  for(const step of steps){
    document.getElementById('stepTitle').textContent=step.t;
    document.getElementById('stepDesc').textContent=step.d;
    document.getElementById('bar').style.width=step.p+'%';
    document.getElementById('barPct').textContent=step.p+'%';
    await new Promise(r=>setTimeout(r,1200));
  }

  // Start rotating facts during API call
  let factInterval = setInterval(() => {
    const el = document.getElementById('factText2');
    if (el) {
      fi = (fi + 1) % facts.length;
      el.textContent = facts[fi];
    }
  }, 3000);

  try{
    const resp=await fetch('/api/audit',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url,businessName:name,businessType:type,location:loc,email})
    });
    const data=await resp.json();
    if(data.error)throw new Error(data.error);
    clearInterval(factInterval);
    showResults(data,url);
  }catch(err){
    clearInterval(factInterval);
    // Show error inline (no alert)
    document.getElementById('progressCard').classList.add('hidden');
    document.getElementById('formCard').classList.remove('hidden');
    const errorBox = document.createElement('div');
    errorBox.className = 'fact-box';
    errorBox.style.cssText = 'background:#fff5f5;border-left:3px solid var(--red);margin-top:16px';
    errorBox.innerHTML = '❌ <strong>Error:</strong> '+err.message+'. Please check the URL and try again.';
    const form = document.getElementById('auditForm');
    const existing = form.nextElementSibling;
    if(existing && existing.className === 'fact-box' && existing.innerHTML.includes('Error')) {
      existing.remove(); // Remove old error if re-submitting
    }
    form.insertAdjacentElement('afterend', errorBox);
    setTimeout(() => errorBox.remove(), 8000);
  }
});

function scoreColor(s){return s>=75?'var(--green)':s>=50?'#d69e2e':'var(--red)'}
function scoreMsg(s){
  if(s>=80)return "Great foundation! Minor optimizations needed.";
  if(s>=60)return "Good start — key improvements will boost visibility.";
  if(s>=40)return "Significant gaps blocking your online growth.";
  return "Critical issues — customers can't find you online.";
}

function showResults(d,url){
  // Track audit completed with score
  posthog.capture('audit_completed', {url: url, score: d.composite_score, seo: d.seo_score, tech: d.technical_score, ai: d.ai_score, social: d.social_score})
  document.getElementById('progressCard').classList.add('hidden');
  document.getElementById('resultsCard').classList.remove('hidden');

  document.getElementById('overallScore').textContent=d.composite_score;
  document.getElementById('overallScore').style.color=scoreColor(d.composite_score);
  document.getElementById('overallMsg').textContent=scoreMsg(d.composite_score);

  document.getElementById('seoScore').textContent=d.seo_score;
  document.getElementById('seoScore').style.color=scoreColor(d.seo_score);
  document.getElementById('techScore').textContent=d.technical_score;
  document.getElementById('techScore').style.color=scoreColor(d.technical_score);
  document.getElementById('aiScore').textContent=d.ai_score;
  document.getElementById('aiScore').style.color=scoreColor(d.ai_score);
  document.getElementById('socialScore').textContent=d.social_score;
  document.getElementById('socialScore').style.color=scoreColor(d.social_score);

  // What's working
  const good=[];
  const p=d.proof||{};
  if(p.hasHTTPS)good.push("✅ Secure HTTPS connection");
  if(p.hasViewport)good.push("✅ Mobile-friendly design");
  if(p.hasTitle)good.push('✅ Title tag: "'+p.title.substring(0,50)+'"');
  if(p.hasSchema)good.push("✅ Schema markup found (AI-ready)");
  if(p.hasFAQ)good.push("✅ FAQ section detected");
  if(p.hasOG)good.push("✅ Open Graph tags (social sharing ready)");
  if(p.hasRobots)good.push("✅ robots.txt found");
  if(p.hasSitemap)good.push("✅ sitemap.xml found");
  if(p.hasFavicon)good.push("✅ Favicon detected");
  if(p.phone)good.push("✅ Phone number found: "+p.phone);
  if(p.socialLinks&&p.socialLinks.length>0)good.push("✅ "+p.socialLinks.length+" social link(s) found");
  if(p.responseTime<2000)good.push("✅ Fast load time: "+p.responseTime+"ms");
  if(good.length===0)good.push("✅ Website is online and accessible");
  document.getElementById('goodList').innerHTML=good.map(g=>'<div class="item item-good">'+g+'</div>').join('');

  // Quick wins (gate recommendations)
  window.fullQuickWins = d.quick_wins || [];
  const teaserWins = window.fullQuickWins.slice(0, 2);
  let badHTML = teaserWins.map(w=>'<div class="item item-bad">→ '+w+'</div>').join('');
  if (window.fullQuickWins.length > 2) {
    badHTML += '<div class="item item-bad" style="opacity:0.5;font-style:italic">🔒 '+(window.fullQuickWins.length - 2)+' more recommendations below — enter your email to unlock</div>';
  }
  document.getElementById('badList').innerHTML = badHTML;

  // Proof
  const proofItems=[];
  if(p.title)proofItems.push('📄 Page title: "'+p.title.substring(0,60)+'"');
  if(p.phone)proofItems.push('📞 Phone: '+p.phone);
  proofItems.push('🔒 HTTPS: '+(p.hasHTTPS?'Secure':'Not secure'));
  proofItems.push('📱 Mobile: '+(p.hasViewport?'Optimized':'Not optimized'));
  proofItems.push('🤖 Schema: '+(p.hasSchema?'Found':'Missing'));
  proofItems.push('❓ FAQ: '+(p.hasFAQ?'Found':'Missing'));
  proofItems.push('📋 robots.txt: '+(p.hasRobots?'Found':'Missing'));
  proofItems.push('🗺️ sitemap.xml: '+(p.hasSitemap?'Found':'Missing'));
  if(p.socialLinks&&p.socialLinks.length>0)p.socialLinks.forEach(l=>proofItems.push('🔗 '+l));
  proofItems.push('⏱️ Response time: '+p.responseTime+'ms');
  proofItems.push('🖼️ Images checked: '+p.imageCount+' ('+p.imagesWithAlt+' with alt text)');
  document.getElementById('proofList').innerHTML=proofItems.map(p=>'<div class="item item-info">'+p+'</div>').join('');
}

document.getElementById('newAuditBtn').addEventListener('click',()=>{
  document.getElementById('resultsCard').classList.add('hidden');
  document.getElementById('formCard').classList.remove('hidden');
  document.getElementById('auditForm').reset();
  window.scrollTo({top:0,behavior:'smooth'});
});

document.getElementById('emailBtn').addEventListener('click',async()=>{
  const email=document.getElementById('emailInput').value.trim();
  if(!email||!email.includes('@')){alert('Please enter a valid email');return;}
  const btn=document.getElementById('emailBtn');
  btn.disabled=true;btn.textContent='Sending...';
  try{
    await fetch('https://services.leadconnectorhq.com/hooks/jDoRsNEPg0qtXUYNouR3/webhook-trigger/1W0WEZzu3MzXX1PpAmXw',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        brand:'806 Growth',
        source_form:'seo_audit_email_unlock',
        first_name:'SEO Audit Lead',
        email,
        source:'email-gate',
        tags:['806 Growth','Web Lead','SEO Audit','audit-lead','source-visibility-tool','email-unlocked'].join(','),
        timestamp:new Date().toISOString(),
        page_url:'https://audit.806growth.com/'
      })
    });
    // Unlock full recommendations
    if (window.fullQuickWins && window.fullQuickWins.length > 2) {
      document.getElementById('badList').innerHTML = 
        window.fullQuickWins.map(w=>'<div class="item item-bad">→ '+w+'</div>').join('');
    }
    document.getElementById('emailGate').innerHTML='<div class="success-msg">Got it! Recommendations will be emailed to you.</div>';
    // Track email unlock
    posthog.capture('email_unlocked', {source: 'email-gate'})
  }catch{btn.disabled=false;btn.textContent='Send Report';alert('Please try again');}
});
</script>
</body>
</html>`;
