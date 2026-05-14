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

        // Fire-and-forget GHL webhook
        if (body.email) {
          const scoreLevel = results.composite_score >= 75 ? 'score-high' : 
                           results.composite_score >= 55 ? 'score-mid' : 'score-low';
          const typeTag = 'type-' + (body.businessType || 'other')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 30);
          
          fetch('https://services.leadconnectorhq.com/hooks/jDoRsNEPg0qtXUYNouR3/webhook-trigger/1W0WEZzu3MzXX1PpAmXw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: body.email,
              businessName: body.businessName,
              businessType: body.businessType,
              location: body.location,
              website: body.url,
              overallScore: results.composite_score,
              seoScore: results.seo_score,
              technicalScore: results.technical_score,
              aiScore: results.ai_score,
              socialScore: results.social_score,
              source: 'free-audit-tool',
              tags: ['audit-lead', 'source-visibility-tool', typeTag, scoreLevel, 'email-provided'].join(',')
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
<meta name="description" content="Get instant scores for SEO, technical health, AI visibility, and social presence in 10 seconds — completely free.">
<meta property="og:title" content="Free Business Visibility Audit — 806 Growth">
<meta property="og:description" content="Find out how visible your business is online. Instant results, zero cost.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--red:#CC0000;--dark:#0B0B0B;--light:#f7fafc;--gray:#718096;--green:#38a169}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);min-height:100vh;padding:20px;display:flex;flex-direction:column;align-items:center}
.card{background:#fff;border-radius:16px;box-shadow:0 25px 80px rgba(0,0,0,0.4);max-width:640px;width:100%;padding:40px 32px;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--red),#ff6b6b,var(--red))}
.brand{text-align:center;margin-bottom:24px}
.brand h1{font-size:1.1rem;color:var(--red);font-weight:800;letter-spacing:-0.5px}
.brand h2{font-size:1.6rem;color:var(--dark);margin:8px 0 4px;font-weight:800}
.brand p{color:var(--gray);font-size:0.95rem}
.badges{display:flex;justify-content:center;gap:20px;margin:16px 0 24px;flex-wrap:wrap}
.badge{font-size:0.82rem;color:#4a5568;display:flex;align-items:center;gap:4px}
form{display:flex;flex-direction:column;gap:14px}
.field label{display:block;font-weight:600;color:#2d3748;margin-bottom:4px;font-size:0.88rem}
.field input,.field select{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;transition:border-color 0.2s}
.field input:focus,.field select:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 3px rgba(204,0,0,0.1)}
.btn{background:var(--red);color:#fff;border:none;padding:14px;font-size:1.05rem;font-weight:700;border-radius:8px;cursor:pointer;width:100%;transition:all 0.2s;letter-spacing:0.3px}
.btn:hover{background:#a50000;transform:translateY(-1px);box-shadow:0 8px 20px rgba(204,0,0,0.3)}
.btn:disabled{opacity:0.6;cursor:wait;transform:none;box-shadow:none}
.fact-box{background:#fff5f5;padding:12px 16px;border-radius:8px;border-left:3px solid var(--red);font-size:0.85rem;color:#742a2a;margin-top:16px;transition:opacity 0.3s}
.hidden{display:none!important}

/* Progress */
.progress{margin:24px 0}
.bar-wrap{background:#e2e8f0;border-radius:10px;height:16px;position:relative;overflow:hidden;box-shadow:inset 0 2px 4px rgba(0,0,0,0.06)}
.bar{background:linear-gradient(90deg,var(--red),#ff6b6b,var(--red));background-size:200% 100%;height:100%;border-radius:10px;width:0%;transition:width 0.5s ease;animation:shimmer 2s linear infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.bar-pct{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.72rem;font-weight:700;color:var(--dark)}
.step-box{background:var(--light);padding:14px 16px;border-radius:8px;margin-top:12px;border-left:3px solid var(--red)}
.step-title{font-weight:600;color:var(--dark);font-size:0.95rem}
.step-desc{color:var(--gray);font-size:0.82rem;margin-top:2px}

/* Results */
.results{margin-top:24px}
.scores{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0}
@media(max-width:500px){.scores{grid-template-columns:1fr}}
.score-card{text-align:center;background:var(--light);padding:20px 12px;border-radius:10px;transition:transform 0.2s}
.score-card:hover{transform:scale(1.02)}
.score-num{font-size:2.4rem;font-weight:800;color:var(--red)}
.score-name{font-size:0.82rem;font-weight:600;color:#4a5568;margin-top:2px}
.score-sub{font-size:0.72rem;color:var(--gray);margin-top:2px}
.overall{text-align:center;padding:20px;background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:12px;margin:16px 0;color:#fff}
.overall-label{font-size:0.85rem;opacity:0.8;margin-bottom:4px}
.overall-num{font-size:3.5rem;font-weight:800}
.overall-msg{font-size:0.95rem;margin-top:6px;opacity:0.9}
.section{margin:20px 0}
.section h3{color:var(--dark);font-size:1.05rem;margin-bottom:10px}
.item{padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:0.9rem;line-height:1.4}
.item-good{background:#f0fff4;border-left:3px solid var(--green)}
.item-bad{background:#fff5f5;border-left:3px solid var(--red)}
.item-info{background:var(--light);border-left:3px solid #667eea}
.cta-box{background:linear-gradient(135deg,var(--green),#2f855a);color:#fff;padding:24px;border-radius:12px;text-align:center;margin:24px 0}
.cta-box h3{font-size:1.2rem;margin-bottom:6px}
.cta-box p{opacity:0.95;font-size:0.9rem;margin-bottom:12px}
.cta-btn{background:#fff;color:var(--green);padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;transition:transform 0.2s}
.cta-btn:hover{transform:scale(1.05)}
.email-gate{background:var(--light);padding:20px;border-radius:10px;margin:20px 0}
.email-gate h3{color:var(--dark);margin-bottom:8px;font-size:1rem}
.email-row{display:flex;gap:8px;margin-top:12px}
@media(max-width:500px){.email-row{flex-direction:column}.email-row .btn{width:100%}}
.email-row input{flex:1;padding:11px 14px;border:2px solid #e2e8f0;border-radius:8px;font-size:0.95rem}
.email-row input:focus{outline:none;border-color:var(--red)}
.email-row .btn{width:auto;padding:11px 20px;font-size:0.95rem}
.success-msg{text-align:center;padding:16px;color:var(--green);font-weight:600}
.footer{text-align:center;color:rgba(255,255,255,0.7);margin-top:24px;font-size:0.82rem}
.footer a{color:#fff;font-weight:600;text-decoration:none}
</style>
</head>
<body>

<div class="card" id="formCard">
  <div class="brand">
    <h1>806 GROWTH</h1>
    <h2>Free Business Visibility Audit</h2>
    <p>SEO + Technical + AI Visibility + Social in 10 seconds</p>
  </div>
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
  <div class="brand">
    <h1>806 GROWTH</h1>
    <h2>Your Visibility Report</h2>
  </div>

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
    <h3>🚀 Get 3x More Customer Calls in 30 Days</h3>
    <p>Let's discuss how to fix these issues and get you found by more customers</p>
    <a href="https://806growth.com" class="cta-btn" target="_blank"id="ctaBtn" onclick="posthog.capture('cta_clicked', {source: 'results-page'})">Get My Custom 30-Day Growth Plan →</a>
  </div>

  <div class="email-gate" id="emailGate">
    <h3>📧 Want Step-by-Step Fix Instructions?</h3>
    <p style="color:#718096;font-size:0.88rem">Get detailed recommendations emailed to you</p>
    <div class="email-row">
      <input type="email" id="emailInput" placeholder="your@email.com">
      <button class="btn" id="emailBtn">Send Report</button>
    </div>
  </div>

  <div style="text-align:center;margin-top:20px">
    <button class="btn" id="newAuditBtn" style="background:#0B0B0B;width:auto;padding:12px 32px">← Start New Audit</button>
  </div>
</div>

<div class="footer">
  Powered by <a href="https://806growth.com">806 Growth</a> • AI-Powered Marketing for West Texas
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
        email,
        source:'email-gate',
        tags:'audit-lead,source-visibility-tool,email-unlocked'
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
