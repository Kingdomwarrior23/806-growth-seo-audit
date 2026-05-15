// 806 Growth — Free Business Visibility Audit Cloudflare Worker
// Single file: serves HTML + handles API. Zero cost at scale.

// ─── Recommendation detail bank ──────────────────────────────────────────
// Each entry is matched against a recommendation string by keyword. Keys are
// rough categories. When the email goes out, each top-N rec is expanded with
// what_to_do / why_it_matters / time / impact — content the in-page audit
// doesn't show. This is what makes the email feel like a real deliverable
// instead of a duplicate of the page.
const RECOMMENDATION_DETAILS = {
  ssl: {
    match: /SSL certificate|HTTPS/i,
    what:  'Get an SSL certificate installed and force all traffic to https://. Most hosting providers (GoDaddy, Hostinger, Cloudflare, Vercel) provide free Let\'s Encrypt SSL with one click.',
    why:   'Browsers display "Not Secure" warnings on http sites, which drops visitor trust dramatically. ~30% of visitors leave the moment they see it. Google also penalizes non-HTTPS sites in rankings.',
    time:  '15 minutes (if your host offers one-click SSL) or up to 1 hour (manual setup).',
    impact:'Removes the "Not Secure" warning, recovers ~30% of bouncing visitors, and unblocks ranking factors. Foundational — fix this before anything else.',
  },
  viewport: {
    match: /mobile viewport|viewport meta/i,
    what:  'Add this exact line inside your &lt;head&gt;: &lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;.',
    why:   '60-70% of your traffic is mobile. Without this tag, your site renders at desktop width and zooms out — text becomes unreadable, buttons un-tappable, conversion craters.',
    time:  '2 minutes for a developer. Most modern site builders include this by default; if you\'re missing it, your site is likely on an outdated template.',
    impact:'Fixes mobile rendering for the majority of your audience. Often single biggest fix on legacy sites.',
  },
  schema: {
    match: /schema markup|LocalBusiness schema/i,
    what:  'Add JSON-LD schema markup specifically of type "LocalBusiness" (or the more specific type for your industry — Plumber, HVACBusiness, RoofingContractor, Dentist, etc.). Include name, address, phone, hours, service area, and review aggregate if available.',
    why:   'Schema is the structured data that AI search engines (ChatGPT, Perplexity, Google AI Overviews) use to "read" your business. Without it, you\'re invisible to ~60% of new business-search behavior. Generic schema isn\'t enough — the TYPE has to match what you actually do.',
    time:  '30-60 minutes for a developer, or it ships automatically with our Growth plan setup.',
    impact:'3x+ more visibility in AI-driven search. Qualifies you for Google\'s local 3-pack. Often the highest-ROI single fix for local service businesses.',
  },
  title: {
    match: /title tag|compelling title/i,
    what:  'Write a title tag in the format "[Service] in [City] — [Benefit] | [Brand]". Keep it 50-60 characters. Include your primary keyword and city name.',
    why:   'The title tag is the bright blue clickable text in Google search results — it\'s the single most important on-page SEO element. Generic titles ("Home" or just your business name) get 30-40% lower click-through rates than keyword-rich ones.',
    time:  '10 minutes to write, 5 minutes to publish.',
    impact:'15-20% increase in click-through rate from search results. Direct, measurable, fast.',
  },
  meta_desc: {
    match: /meta description/i,
    what:  'Write a 140-160 character description summarizing what you do, where you do it, and why someone should click. Include your phone number or a strong call-to-action.',
    why:   'Google uses this as the preview snippet in search results. Without one, Google auto-generates from page content — often pulling boilerplate that doesn\'t sell. A purpose-written description converts ~6% more clicks.',
    time:  '5 minutes per page.',
    impact:'~6% click-through lift. Modest but free and easy.',
  },
  faq: {
    match: /FAQ section|FAQ schema/i,
    what:  'Add an FAQ section to your homepage with 5-8 questions your customers actually ask (pricing, timing, service area, warranty, emergency availability). Wrap each Q+A in FAQPage schema so AI engines can extract them.',
    why:   'AI engines like ChatGPT and Perplexity pull FAQ content directly into their answers. Sites with structured FAQs capture 40% more AI-driven traffic. Also positions you as the expert who has the answers, not the vendor who hides them.',
    time:  '2-3 hours to write good questions + answers. 30 minutes to mark up with schema.',
    impact:'40% more AI search traffic. Higher trust signal. Reduces inbound questions you have to answer manually.',
  },
  robots: {
    match: /robots\.txt/i,
    what:  'Create a file at yoursite.com/robots.txt that explicitly tells search engines what to crawl. Minimum content: "User-agent: *\\nAllow: /\\nSitemap: https://yoursite.com/sitemap.xml".',
    why:   'Without robots.txt, search engines guess about what to index. Sometimes they waste their crawl budget on irrelevant URLs (admin pages, cart, search results) while skipping your service pages.',
    time:  '10 minutes if you have FTP/CMS access.',
    impact:'Better crawl efficiency. Mostly a foundational hygiene item — won\'t move your ranking dramatically but its absence signals an under-maintained site.',
  },
  sitemap: {
    match: /sitemap\.xml/i,
    what:  'Generate an XML sitemap at yoursite.com/sitemap.xml listing every important page on your site. Most CMS platforms (WordPress with Yoast/RankMath, Webflow, Shopify) generate this automatically — you just need to enable it.',
    why:   'A sitemap is the GPS that tells Google exactly what pages exist on your site and how often they change. Without it, deep pages can sit unindexed for weeks.',
    time:  '5-15 minutes depending on platform.',
    impact:'Faster indexing of new pages. Critical when launching new service pages or seasonal landing pages.',
  },
  social: {
    match: /social media|social profiles/i,
    what:  'Add direct links to your active social profiles in your site footer. At minimum: Facebook, Instagram, and Google Business Profile. Add Yelp if you serve hospitality/restaurants and LinkedIn for B2B services.',
    why:   'Social links in your footer are trust signals to both visitors AND search engines. They also create the citation network that boosts local SEO. Sites with 4+ verified social profiles consistently outrank those with 0-1.',
    time:  '20-30 minutes including link verification.',
    impact:'Trust + SEO compound benefit. Free.',
  },
  phone: {
    match: /phone number|visible phone/i,
    what:  'Put a click-to-call phone number in the top-right of your header (visible without scrolling). Use a tel: link so mobile users one-tap-dial. Repeat it in the footer.',
    why:   'On mobile, customers expect to tap-to-call. If your number is hidden 4 scrolls down or buried as text (not a tel: link), you lose 20-30% of mobile call intent. This is the single most reversible conversion leak.',
    time:  '15 minutes for a developer to wire up.',
    impact:'20-30% more mobile calls. Often the single highest-ROI change for service businesses.',
  },
  reviews: {
    match: /customer reviews|testimonials/i,
    what:  'Display 3-5 real customer testimonials on your homepage with names, cities, and (ideally) photos. Pull them from Google reviews. Make sure they\'re specific — "Mike fixed our water heater in 2 hours on a Saturday" beats "Great service".',
    why:   'Specific testimonials with attribution build trust 4x more than generic ones. Sites without visible testimonials get ~25% lower conversion rates because visitors assume the business is too new or has nothing good to show.',
    time:  '1 hour to gather + write up + design into a section.',
    impact:'~25% higher conversion rate from visitors who reach the homepage. Compounding — also boosts local SEO via review-related keywords.',
  },
  local_keywords: {
    match: /to your homepage copy|local keyword|near me|local search/i,
    what:  'Add explicit city/region mentions to your homepage hero, services section, and footer. "Lubbock plumber" beats "professional plumber" for local rankings. Mention nearby towns/neighborhoods you serve.',
    why:   'Google\'s local algorithm needs explicit signals to rank you for "[service] near me" searches. If your homepage never mentions your city, you\'re not in the consideration set even if you\'re the best provider locally.',
    time:  '15-20 minutes of copy editing.',
    impact:'Direct lift in local pack visibility. Often the single highest-ROI copy change.',
  },
  speed: {
    match: /page speed|load takes/i,
    what:  'Compress images (use TinyPNG or Squoosh — get every image under 200KB). Defer non-critical JavaScript. Use a CDN. If on WordPress, install a caching plugin like WP Rocket or LiteSpeed.',
    why:   'Google uses Core Web Vitals (page speed + visual stability) as a ranking factor. 53% of visitors abandon if a page takes over 3 seconds. Every 1-second improvement above 2s recovers ~10% of bouncing traffic.',
    time:  '1-3 hours depending on site size.',
    impact:'Lower bounce rate, higher rankings, faster conversions. Compounds with every other on-page improvement.',
  },
  images_alt: {
    match: /alt text/i,
    what:  'Add descriptive alt text to every image. For service photos, describe the work shown ("Lubbock HVAC tech installing a Carrier condenser in a residential backyard" instead of "image1.jpg").',
    why:   'Alt text is what screen readers use for accessibility AND what Google\'s image search and AI engines use to understand visual content. Missing alt text fails both audiences.',
    time:  '~30 minutes for a typical site (1 min per image).',
    impact:'Image search traffic + accessibility + small SEO bump. Compounds over time as Google indexes images.',
  },
  service_pages: {
    match: /service-specific landing pages|landing pages/i,
    what:  'Create one dedicated page per service you offer. Each page should target a specific search query ("Lubbock drain cleaning" vs "Lubbock water heater repair") with its own H1, meta description, FAQ section, and call-to-action.',
    why:   'Generic "services" pages can\'t rank for specific high-intent queries. Single-purpose landing pages do. Sites with 8-12 service pages routinely outrank competitors with one generic page.',
    time:  '2-3 hours per page (research, write, design).',
    impact:'Each well-built page is a permanent traffic asset. Compound over months.',
  },
  fallback: {
    match: /.*/,
    what:  'See the recommendation text on your audit results page for context. Each fix above this priority level moves you toward an 85+ score.',
    why:   '',
    time:  '',
    impact:'',
  },
};

// Industry benchmarks (rough, directional — based on aggregate audit data of
// local service businesses in Texas/Southwest. Not scientific; useful for
// "how do I compare?" framing in the email).
const INDUSTRY_BENCHMARKS = {
  'Local Service (Plumbing, HVAC, Roofing)': 60,
  'Restaurant / Food':                        65,
  'Healthcare / Dental':                      70,
  'Professional (Law, RE, Accounting)':       62,
  'Retail / eCommerce':                       72,
  'Home Services (Cleaning, Lawn, Handyman)': 58,
  'Med Spa / IV Therapy / Wellness':          68,
  'Fitness / Gym / Personal Training':        65,
  'Auto (Repair, Detailing, Sales)':          60,
  'Nonprofit / Community':                    55,
  'Other':                                    63,
};

function detailFor(rec) {
  for (const key of Object.keys(RECOMMENDATION_DETAILS)) {
    const entry = RECOMMENDATION_DETAILS[key];
    if (entry.match && entry.match.test(rec)) return entry;
  }
  return RECOMMENDATION_DETAILS.fallback;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderRecommendationDetailedHtml(recs) {
  // Builds the rich "what to do / why / time / impact" block per rec.
  // Returns a single HTML string suitable for dropping into a GHL email merge.
  if (!recs || !recs.length) return '';
  return recs.slice(0, 7).map((rec, i) => {
    const d = detailFor(rec);
    const cleanHeadline = rec.replace(/^[🔴🟠🟡🟢]\s*/, '');
    const priority = /^🔴/.test(rec) ? '🔴 CRITICAL' : /^🟠/.test(rec) ? '🟠 HIGH IMPACT' : /^🟡/.test(rec) ? '🟡 TECHNICAL' : '🟢 OPTIMIZATION';
    const meta = [];
    if (d.time) meta.push('<strong style="color:#0a0a0a">Time:</strong> ' + escapeHtml(d.time));
    if (d.impact) meta.push('<strong style="color:#0a0a0a">Impact:</strong> ' + escapeHtml(d.impact));
    return [
      '<div style="margin:0 0 28px;padding:20px 22px;background:#f7f7f5;border:1px solid #ececec;border-radius:8px">',
      '  <div style="font-family:Menlo,monospace;font-size:11px;letter-spacing:0.12em;color:#CC0000;font-weight:700;margin-bottom:6px">PRIORITY #' + (i + 1) + ' &middot; ' + priority + '</div>',
      '  <h3 style="margin:0 0 12px;font-size:17px;font-weight:700;color:#0a0a0a;line-height:1.3">' + escapeHtml(cleanHeadline) + '</h3>',
      d.what  ? '  <p style="margin:0 0 10px;font-size:14px;line-height:1.65"><strong style="color:#0a0a0a">What to do:</strong> ' + d.what + '</p>' : '',
      d.why   ? '  <p style="margin:0 0 10px;font-size:14px;line-height:1.65"><strong style="color:#0a0a0a">Why it matters:</strong> ' + d.why + '</p>' : '',
      meta.length ? '  <p style="margin:0;font-size:13px;color:#555;line-height:1.55">' + meta.join(' &nbsp;&middot;&nbsp; ') + '</p>' : '',
      '</div>',
    ].filter(Boolean).join('\n');
  }).join('\n');
}

function renderProofFullHtml(proof) {
  // Renders the FULL audit checklist (everything checked, pass/fail) — the
  // in-page version only highlights ~10 items; this is the complete record.
  const rows = [
    ['HTTPS / SSL',                       proof.hasHTTPS],
    ['Mobile viewport meta tag',          proof.hasViewport],
    ['Title tag (' + (proof.titleLength || 0) + ' chars)', !!proof.title],
    ['Open Graph tags (social preview)',  proof.hasOG],
    ['Schema markup (any)',               proof.hasSchema],
    ['LocalBusiness / industry schema',   proof.hasLocalBizSchema],
    ['FAQ section',                       proof.hasFAQ],
    ['FAQPage schema',                    proof.hasFAQSchema],
    ['robots.txt',                        proof.hasRobots],
    ['sitemap.xml',                       proof.hasSitemap],
    ['Favicon',                           proof.hasFavicon],
    ['Visible phone number',              !!proof.phone],
    ['Local city/region keywords',        proof.hasLocalKeyword],
    ['Page response time under 2s',       proof.responseTime < 2000],
    ['Image alt text (' + (proof.imagesWithAlt || 0) + '/' + (Math.min(10, proof.imageCount || 0)) + ' checked)', (proof.imagesWithAlt || 0) >= Math.min(5, (proof.imageCount || 0) / 2)],
    ['Social platforms linked (' + ((proof.socialLinks || []).length) + ')', (proof.socialLinks || []).length > 0],
  ];
  return rows.map(r => {
    const [label, ok] = r;
    const icon = ok ? '✅' : '❌';
    const color = ok ? '#00aa00' : '#CC0000';
    return '<tr><td style="padding:8px 12px;border-bottom:1px solid #ececec;font-size:14px"><span style="color:' + color + ';margin-right:8px;font-weight:600">' + icon + '</span> ' + escapeHtml(label) + '</td></tr>';
  }).join('\n');
}

function buildExecutiveSummary(businessName, score, gradeLabel, proof, businessType) {
  // 2-3 sentence narrative summary at the top of the email.
  const strengths = [];
  if (proof.hasHTTPS) strengths.push('secure (HTTPS)');
  if (proof.hasViewport) strengths.push('mobile-ready');
  if (proof.hasSchema) strengths.push('has schema markup');
  if (proof.hasFAQ) strengths.push('has an FAQ');
  if ((proof.socialLinks || []).length >= 3) strengths.push('strong social presence');
  const gaps = [];
  if (!proof.hasHTTPS) gaps.push('no SSL/HTTPS');
  if (!proof.hasViewport) gaps.push('no mobile viewport');
  if (!proof.hasSchema) gaps.push('no schema markup');
  if (!proof.hasFAQ) gaps.push('no FAQ section');
  if (!proof.hasLocalKeyword) gaps.push('no local-keyword signals');
  if (!proof.phone) gaps.push('no visible phone number');

  const strengthPart = strengths.length
    ? 'You\'re doing some things right — ' + (strengths.slice(0, 3).join(', ')) + '.'
    : 'There aren\'t many on-page strengths to call out yet, which means the upside is wide open.';
  const gapPart = gaps.length
    ? 'The biggest gaps are ' + (gaps.slice(0, 3).join(', ')) + '.'
    : 'No critical gaps detected at the on-page level — focus on competitive optimization.';
  return businessName + ' scored ' + score + '/100 — ' + gradeLabel.toLowerCase() + '. ' + strengthPart + ' ' + gapPart + ' The detailed fixes below are ordered by impact.';
}

// ─── Full pre-rendered email body ────────────────────────────────────────
// Builds the COMPLETE body-only HTML for the SEO Audit results email with
// every value interpolated server-side. GHL's email step then just outputs
// {{inboundWebhookRequest.full_email_html}} — a single merge field, so GHL
// never has to substitute (or escape) per-field HTML. This sidesteps the
// entire class of GHL-templating bugs (blank body, escaped HTML, test-mode
// non-substitution). Unsubscribe is a mailto (no GHL nested-merge needed).
function buildFullEmailHtml(d) {
  const e = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LOGO = 'https://assets.cdn.filesafe.space/jDoRsNEPg0qtXUYNouR3/media/6a02e3d460a7a52fdc278da9.png';
  const monthly = (d.estimatedMonthlyLoss || 0).toLocaleString('en-US');
  const annual  = (d.estimatedAnnualLoss  || 0).toLocaleString('en-US');
  const revenueBlock = (d.estimatedMonthlyLoss > 0) ? `
        <p style="margin:24px 0 12px;font-size:17px;font-weight:700;color:#0a0a0a">What this is costing you:</p>
        <p style="margin:0 0 24px">
          Based on your score and business type, sites in your range typically miss
          <strong style="color:#CC0000">~$${monthly}/month</strong>
          (about <strong style="color:#CC0000">$${annual}/year</strong>)
          in leads that found a competitor with stronger SEO, AI visibility, or local signals.
          Fixing the issues below directly closes that gap.
        </p>` : '';

  return `<div style="display:none;font-size:1px;color:#f7f7f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
  Your audit scored ${e(d.overallScore)}/100 — ${e(d.scoreLabel)}. The full report and top fixes are below.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f5;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2a2a2a;line-height:1.6">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec;box-shadow:0 2px 8px rgba(0,0,0,0.04)">

      <tr>
        <td style="background:#0a0a0a;padding:22px 32px" align="center">
          <a href="https://806growth.com" target="_blank" style="text-decoration:none;display:inline-block">
            <img src="${LOGO}" alt="806 Growth" width="180" style="display:block;border:0;outline:0;width:180px;max-width:180px;height:auto;margin:0 auto">
          </a>
        </td>
      </tr>
      <tr><td style="height:4px;background:#CC0000;font-size:0;line-height:0">&nbsp;</td></tr>

      <tr><td style="padding:36px 32px;font-size:16px;line-height:1.65;color:#2a2a2a">

        <p style="margin:0 0 6px;font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;font-weight:600;color:#CC0000;letter-spacing:0.14em;text-transform:uppercase">
          Free Business Visibility Audit
        </p>
        <h1 style="font-size:26px;font-weight:700;color:#0a0a0a;margin:0 0 16px;line-height:1.25">
          Your audit results, ${e(d.businessName)}.
        </h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.65">
          Just ran a fresh scan on <strong style="color:#0a0a0a">${e(d.website)}</strong>. Below is the <strong style="color:#0a0a0a">full report</strong> — including the detailed implementation steps for each fix that aren't shown on the audit page.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff5f5;border:1px solid #ffd4d4;border-left:4px solid #CC0000;border-radius:8px;margin:0 0 24px">
          <tr><td style="padding:28px 28px" align="center">
            <p style="margin:0 0 6px;font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;font-weight:600;color:#CC0000;letter-spacing:0.14em;text-transform:uppercase">Overall Visibility Score</p>
            <p style="margin:0;font-size:56px;font-weight:800;color:#CC0000;line-height:1.05">
              ${e(d.overallScore)}<span style="font-size:22px;font-weight:600;color:#666">/100</span>
            </p>
            <p style="margin:8px 0 0;font-size:15px;color:#0a0a0a;font-weight:600">
              Grade ${e(d.grade)} &middot; ${e(d.scoreLabel)}
            </p>
            <p style="margin:8px 0 0;font-size:13px;color:#666">
              Industry average for ${e(d.businessType)}: <strong>${e(d.benchmarkScore)}/100</strong> &mdash; you're ${e(d.benchmarkLabel)}.
            </p>
          </td></tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px">
          <tr><td style="border-left:3px solid #CC0000;padding:8px 0 8px 20px">
            <p style="margin:0 0 6px;font-family:'JetBrains Mono','Courier New',monospace;font-size:10.5px;font-weight:700;color:#CC0000;letter-spacing:0.14em;text-transform:uppercase">Executive Summary</p>
            <p style="margin:0;font-size:15px;line-height:1.65;color:#2a2a2a">
              ${e(d.executiveSummary)}
            </p>
          </td></tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px">
          <tr>
            <td width="50%" valign="top" style="padding-right:6px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f5;border:1px solid #ececec;border-radius:8px">
                <tr><td style="padding:18px 16px" align="center">
                  <p style="margin:0;font-size:32px;font-weight:800;color:#CC0000;line-height:1">${e(d.seoScore)}</p>
                  <p style="margin:6px 0 0;font-size:13px;font-weight:600;color:#0a0a0a">SEO</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#666">Title, meta, headings, mobile</p>
                </td></tr>
              </table>
            </td>
            <td width="50%" valign="top" style="padding-left:6px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f5;border:1px solid #ececec;border-radius:8px">
                <tr><td style="padding:18px 16px" align="center">
                  <p style="margin:0;font-size:32px;font-weight:800;color:#CC0000;line-height:1">${e(d.technicalScore)}</p>
                  <p style="margin:6px 0 0;font-size:13px;font-weight:600;color:#0a0a0a">Technical</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#666">Speed, robots, sitemap, favicon</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td colspan="2" style="height:12px;font-size:0;line-height:0">&nbsp;</td></tr>
          <tr>
            <td width="50%" valign="top" style="padding-right:6px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f5;border:1px solid #ececec;border-radius:8px">
                <tr><td style="padding:18px 16px" align="center">
                  <p style="margin:0;font-size:32px;font-weight:800;color:#CC0000;line-height:1">${e(d.aiScore)}</p>
                  <p style="margin:6px 0 0;font-size:13px;font-weight:600;color:#0a0a0a">AI Visibility</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#666">Schema, FAQ, structured data</p>
                </td></tr>
              </table>
            </td>
            <td width="50%" valign="top" style="padding-left:6px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f5;border:1px solid #ececec;border-radius:8px">
                <tr><td style="padding:18px 16px" align="center">
                  <p style="margin:0;font-size:32px;font-weight:800;color:#CC0000;line-height:1">${e(d.socialScore)}</p>
                  <p style="margin:6px 0 0;font-size:13px;font-weight:600;color:#0a0a0a">Social</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#666">Facebook, Instagram, LinkedIn</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
${revenueBlock}
        <p style="margin:32px 0 14px;font-size:18px;font-weight:700;color:#0a0a0a">Your top fixes — ranked by impact:</p>
        <p style="margin:0 0 18px;font-size:14px;color:#666;line-height:1.6">
          For each fix below: <strong>what to do</strong> (concrete steps), <strong>why it matters</strong> (the business case), <strong>time</strong> (effort estimate), and <strong>expected impact</strong>. Implement in order — they're sorted by ROI.
        </p>
        ${d.recommendationsDetailedHtml || ''}

        <p style="margin:32px 0 12px;font-size:18px;font-weight:700;color:#0a0a0a">Everything we checked:</p>
        <p style="margin:0 0 14px;font-size:14px;color:#666;line-height:1.6">
          Complete record of every audit check we ran on your site. Use this to confirm what's working and to validate any future fixes.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #ececec;border-radius:8px;overflow:hidden;margin:0 0 24px;background:#fafafa">
          ${d.proofFullHtml || ''}
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0">
          <tr><td style="border-left:3px solid #CC0000;padding:8px 0 8px 20px">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#2a2a2a;font-style:italic">
              "Score was 47 when we started. Three weeks later, 78. Calls went from 2-3 a day to 8-10. We didn't change anything about how we do the work — we just got found."
            </p>
            <p style="margin:8px 0 0;font-size:12px;color:#666;font-weight:500">— Local HVAC operator · 30-day result · Lubbock, TX</p>
          </td></tr>
        </table>

        <p style="margin:24px 0 16px;font-size:16px">
          Want help fixing these? Book a free 15-minute strategy call. No pitch — just walk through the specific changes that would move <strong style="color:#0a0a0a">${e(d.businessName)}</strong> from ${e(d.overallScore)}/100 to 85+ in 30 days.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
          <tr><td style="background:#0a0a0a;border:2px solid #CC0000;border-radius:8px" align="center">
            <a href="https://806growth.com/contact.html" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#CC0000;text-decoration:none;letter-spacing:0.02em">
              <span style="color:#CC0000">Book a 15-minute call &rarr;</span>
            </a>
          </td></tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;border-top:1px solid #ececec;padding-top:24px">
          <tr><td>
            <p style="margin:0 0 4px;font-weight:600;color:#0a0a0a;font-size:15px">Brandon R.</p>
            <p style="margin:0 0 4px;color:#666;font-size:14px">Founder, 806 Growth</p>
            <p style="margin:0;color:#666;font-size:14px">
              <a href="tel:+18064513133" style="color:#CC0000;text-decoration:none"><span style="color:#CC0000">(806) 451-3133</span></a>
              <span style="color:#bbb">&nbsp;·&nbsp;</span>
              <a href="mailto:contact@806growth.com" style="color:#CC0000;text-decoration:none"><span style="color:#CC0000">contact@806growth.com</span></a>
            </p>
          </td></tr>
        </table>

      </td></tr>

      <tr><td style="background:#0a0a0a;padding:24px 32px;color:#a0a0a0;line-height:1.6" align="center">
        <p style="margin:0 0 8px;color:#ffffff;font-weight:600;font-size:14px">806 Growth — Lubbock, TX</p>
        <p style="margin:0 0 8px;font-size:13px">
          <a href="tel:+18064513133" style="color:#CC0000;text-decoration:none;font-weight:600"><span style="color:#CC0000">(806) 451-3133</span></a>
          <span style="color:#555">&nbsp;·&nbsp;</span>
          <a href="mailto:contact@806growth.com" style="color:#CC0000;text-decoration:none;font-weight:600"><span style="color:#CC0000">contact@806growth.com</span></a>
        </p>
        <p style="margin:0;color:#999;font-size:12px">
          <a href="mailto:contact@806growth.com?subject=Unsubscribe" style="color:#999;text-decoration:underline"><span style="color:#999">Unsubscribe</span></a>
          <span>&nbsp;·&nbsp;</span>
          <a href="https://806growth.com/privacy.html" style="color:#999;text-decoration:underline"><span style="color:#999">Privacy</span></a>
          <span>&nbsp;·&nbsp;</span>
          <a href="https://806growth.com/terms.html" style="color:#999;text-decoration:underline"><span style="color:#999">Terms</span></a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>`;
}

export default {
  async fetch(request, env, ctx) {
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
        const results = await runAudit(body.url, {
          businessName: body.businessName,
          businessType: body.businessType,
          location:     body.location,
        });

        // Fire-and-forget GHL webhook (lead capture into 806 Growth sub-account)
        if (body.email) {
          const scoreLevel = results.composite_score >= 75 ? 'score-high' :
                           results.composite_score >= 55 ? 'score-mid' : 'score-low';
          const typeTag = 'type-' + (body.businessType || 'other')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 30);

          // Letter grade for the email template — easier merge field than computing
          // it inside GHL's limited expression language.
          const grade = results.composite_score >= 90 ? 'A'
                      : results.composite_score >= 80 ? 'B'
                      : results.composite_score >= 70 ? 'C'
                      : results.composite_score >= 60 ? 'D'
                      : 'F';
          const gradeLabel = results.composite_score >= 80 ? 'Strong'
                           : results.composite_score >= 60 ? 'Needs Work'
                           : results.composite_score >= 40 ? 'Significant Gaps'
                           : 'Critical Issues';

          // Pre-format top 7 recommendations as a rich HTML block — each rec
          // becomes a card with "what to do / why it matters / time / impact"
          // pulled from RECOMMENDATION_DETAILS. This is the email's main
          // value-over-page differentiator.
          const top7 = (results.quick_wins || []).slice(0, 7);
          const recommendationsDetailedHtml = renderRecommendationDetailedHtml(top7);
          // Simple version retained for backward compat with the old email layout
          const recommendationsHtml = top7.slice(0, 5).map(rec => {
            const clean = rec.replace(/^[🔴🟠🟡🟢]\s*/, '');
            return '<li style="margin-bottom:12px;line-height:1.6">' + clean + '</li>';
          }).join('');
          const recommendationsText = top7.map((rec, i) => (i + 1) + '. ' + rec.replace(/^[🔴🟠🟡🟢]\s*/, '')).join('\n\n');

          // Full proof checklist — every check we ran, pass or fail.
          const proofFullHtml = renderProofFullHtml(results.proof || {});

          // Executive summary — 2-3 sentence narrative at top of email.
          const executiveSummary = buildExecutiveSummary(
            body.businessName || 'Your business',
            results.composite_score,
            gradeLabel,
            results.proof || {},
            body.businessType || ''
          );

          // Industry benchmark — directional context the page doesn't show.
          const benchmarkScore = INDUSTRY_BENCHMARKS[body.businessType] || INDUSTRY_BENCHMARKS['Other'];
          const benchmarkDelta = results.composite_score - benchmarkScore;
          let benchmarkLabel;
          if (benchmarkDelta >= 10)      benchmarkLabel = 'above average for ' + (body.businessType || 'your industry');
          else if (benchmarkDelta >= -5) benchmarkLabel = 'around average for ' + (body.businessType || 'your industry');
          else if (benchmarkDelta >= -15) benchmarkLabel = 'below average for ' + (body.businessType || 'your industry');
          else                           benchmarkLabel = 'in the bottom quartile for ' + (body.businessType || 'your industry');

          // Estimated revenue loss for local-service business types (same formula
          // as the in-page revenue impact callout — kept in sync intentionally).
          const localTypes = /local service|home services|restaurant|food|healthcare|dental|fitness|gym|auto|med spa|wellness|professional/i;
          const isLocal = localTypes.test(body.businessType || '');
          let estimatedMonthlyLoss = 0;
          let estimatedAnnualLoss = 0;
          if (isLocal) {
            const gap = Math.max(0, 100 - results.composite_score);
            estimatedMonthlyLoss = Math.round((15000 * (gap / 100) * 0.65) / 100) * 100;
            estimatedAnnualLoss = estimatedMonthlyLoss * 12;
          }

          // Pre-render the ENTIRE email body server-side. GHL email step just
          // outputs {{inboundWebhookRequest.full_email_html}} — one field, so
          // GHL never escapes/strips per-field HTML. Bulletproof.
          const fullEmailHtml = buildFullEmailHtml({
            businessName:                body.businessName,
            website:                     body.url,
            businessType:                body.businessType,
            overallScore:                results.composite_score,
            grade:                       grade,
            scoreLabel:                  gradeLabel,
            benchmarkScore:              benchmarkScore,
            benchmarkLabel:              benchmarkLabel,
            executiveSummary:            executiveSummary,
            seoScore:                    results.seo_score,
            technicalScore:              results.technical_score,
            aiScore:                     results.ai_score,
            socialScore:                 results.social_score,
            estimatedMonthlyLoss:        estimatedMonthlyLoss,
            estimatedAnnualLoss:         estimatedAnnualLoss,
            recommendationsDetailedHtml: recommendationsDetailedHtml,
            proofFullHtml:               proofFullHtml,
          });

          // Tag array includes BOTH the standard site pattern (806 Growth / Web Lead /
          // SEO Audit — required for Web Lead Internal Alerts + Tag-Added nurture
          // workflows to fire) AND the legacy custom tags (audit-lead /
          // source-visibility-tool / type-* / score-* — required for the existing
          // "SEO Audit Email Sequence" workflow that's already published). GHL stores
          // tags lowercase; trigger filters match case-insensitively.
          const standardTags = ['806 Growth', 'Web Lead', 'SEO Audit'];
          const legacyTags = ['audit-lead', 'source-visibility-tool', typeTag, scoreLevel, 'email-provided'];

          // CRITICAL: wrap in ctx.waitUntil so Cloudflare keeps the runtime alive
          // until the POST completes. Without this, the in-flight fetch gets
          // cancelled the instant we return the response to the browser — which
          // is why GHL was seeing no recent webhook hits despite real audit
          // submissions. See https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/#parameters
          ctx.waitUntil(
            fetch('https://services.leadconnectorhq.com/hooks/jDoRsNEPg0qtXUYNouR3/webhook-trigger/1W0WEZzu3MzXX1PpAmXw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand:                  '806 Growth',
              source_form:            'seo_audit',
              first_name:             body.businessName,
              business_name:          body.businessName,
              industry:               body.businessType,
              location:               body.location,
              email:                  body.email,
              website:                body.url,
              overall_score:          results.composite_score,
              score_grade:            grade,
              score_label:            gradeLabel,
              seo_score:              results.seo_score,
              technical_score:        results.technical_score,
              ai_score:               results.ai_score,
              social_score:           results.social_score,
              // Rich email-body content (NOT shown on the live audit page —
              // this is what the email gives them in exchange for their email).
              executive_summary:           executiveSummary,
              top_recommendations_html:    recommendationsHtml,
              top_recommendations_text:    recommendationsText,
              recommendations_detailed_html: recommendationsDetailedHtml,
              proof_full_html:             proofFullHtml,
              full_email_html:             fullEmailHtml,
              industry_benchmark_score:    benchmarkScore,
              industry_benchmark_label:    benchmarkLabel,
              estimated_monthly_loss:      estimatedMonthlyLoss,
              estimated_annual_loss:       estimatedAnnualLoss,
              // legacy keys preserved for the existing SEO Audit Email Sequence workflow
              businessName:           body.businessName,
              businessType:           body.businessType,
              overallScore:           results.composite_score,
              seoScore:               results.seo_score,
              technicalScore:         results.technical_score,
              aiScore:                results.ai_score,
              socialScore:            results.social_score,
              source:                 'free-audit-tool',
              tags:                   [...standardTags, ...legacyTags].join(','),
              page_url:               'https://audit.806growth.com/',
              timestamp:              new Date().toISOString(),
            })
            }).catch(() => {})
          );
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

async function runAudit(targetUrl, ctx = {}) {
  const businessName = String(ctx.businessName || '').trim();
  const businessType = String(ctx.businessType || '').trim();
  const userLocation = String(ctx.location || '').trim();

  // Normalize URL — DO NOT lowercase the path (URLs are case-sensitive after the host).
  // Strip protocol/www, force https, then re-attach.
  targetUrl = targetUrl.trim();
  const stripped = targetUrl.replace(/^(https?:\/\/)?(www\.)?/i, '');
  if (!stripped) targetUrl = '';
  else {
    // Split on first `/` to isolate host from path; lowercase only the host.
    const slashIdx = stripped.indexOf('/');
    const host = slashIdx === -1 ? stripped : stripped.slice(0, slashIdx);
    const path = slashIdx === -1 ? '' : stripped.slice(slashIdx);
    targetUrl = 'https://' + host.toLowerCase() + path;
  }
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

  // Local keyword check — use the user-provided location instead of hardcoded "lubbock".
  // Pulls just the city portion ("Lubbock, TX" → "lubbock"). Falls back to broader
  // "near me"/"local"/"texas" signals if no location given. Skips this deduction
  // entirely for non-local business types (e-commerce, professional services that
  // serve nationally), since they shouldn't be penalized for missing local keywords.
  const localSignals = ['near me', 'local'];
  if (userLocation) {
    const city = userLocation.split(',')[0].trim().toLowerCase();
    if (city) localSignals.push(city);
    // Tack on the state abbreviation/word if provided.
    const stateBits = userLocation.split(',').slice(1).join(',').trim().toLowerCase();
    if (stateBits) localSignals.push(stateBits.replace(/[^a-z\s]/g, '').trim());
  } else {
    localSignals.push('texas');
  }
  const isNationalBusiness = /retail.*eCommerce|nonprofit/i.test(businessType);
  const hasLocalKeyword = localSignals.some(sig => sig && htmlLower.includes(sig));
  if (!hasLocalKeyword && !isNationalBusiness) seoScore -= 7;
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

  // Schema TYPE check — for local-service businesses, the RIGHT type matters
  // (LocalBusiness / Service / ProfessionalService > generic Article schema).
  // Detects type from "@type":"X" inside JSON-LD blocks AND from itemtype= attributes.
  const hasLocalBizSchema = /"@type"\s*:\s*"(LocalBusiness|Service|ProfessionalService|HomeAndConstructionBusiness|MedicalBusiness|FoodEstablishment|Restaurant|HealthAndBeautyBusiness|AutomotiveBusiness|Plumber|HVACBusiness|Electrician|RoofingContractor|GeneralContractor|Dentist|Physician|LegalService)"/i.test(html)
                          || /itemtype=["']https?:\/\/schema\.org\/(LocalBusiness|Service|ProfessionalService|Restaurant|Plumber|HVACBusiness|RoofingContractor|GeneralContractor|Dentist|Physician|LegalService)["']/i.test(html);

  // FAQ detection — prefer proper FAQPage schema (a real signal) over loose
  // "faq" text match (false positives on words like "fact", "FAQs page" link).
  const hasFAQSchema = /"@type"\s*:\s*"FAQPage"/i.test(html) || /itemtype=["']https?:\/\/schema\.org\/FAQPage["']/i.test(html);
  const hasFAQText = /frequently asked questions?/i.test(htmlLower) || /<h[1-6][^>]*>[^<]*faq[^<]*<\/h[1-6]>/i.test(html);
  const hasFAQ = hasFAQSchema || hasFAQText;

  if (hasSchema) aiScore += 32;
  if (hasLocalBizSchema) aiScore += 10;   // bonus for the right TYPE
  if (hasFAQ) aiScore += 28;
  if (hasFAQSchema) aiScore += 10;        // bonus for schema-backed FAQ
  // Bonus for multiple schema blocks (indicates a deliberate strategy)
  const schemaCount = (html.match(/application\/ld\+json/gi) || []).length;
  if (schemaCount > 1) aiScore += 10;

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
  // Personalized using businessType + userLocation. Recommendations are tiered
  // by severity (🔴 critical → 🟠 high-value → 🟡 technical → 🟢 polish).
  const quickWins = [];
  const cityName = userLocation ? userLocation.split(',')[0].trim() : '';
  const isLocalService = /local service|home services|healthcare|restaurant|fitness|auto|med spa|professional/i.test(businessType);

  // 🔴 Critical issues (high impact)
  if (!hasHTTPS) quickWins.push("🔴 Add SSL certificate — 30% of visitors leave when they see 'Not Secure' in the browser bar. Most hosts offer free Let's Encrypt SSL.");
  if (!hasViewport) quickWins.push("🔴 Add mobile viewport meta tag — 60%+ of your traffic is mobile. Without this, your site renders zoomed-out on phones.");
  if (!hasSchema) quickWins.push("🔴 Add schema markup — get 3x more visibility in ChatGPT, Perplexity, and Google AI Overviews. Without schema, AI search engines can't 'read' your business.");
  else if (isLocalService && !hasLocalBizSchema) quickWins.push("🟠 Switch your schema type to LocalBusiness — you have schema markup but not the right type for a local " + (businessType || 'service business') + ". LocalBusiness schema is what Google's AI uses to qualify you for the local 3-pack.");

  // 🟠 High-value wins
  if (!hasTitle) quickWins.push("🟠 Add a compelling title tag — increases click-through rate by 15-20%. Should include your service + city (e.g., '" + (cityName || 'Lubbock') + " HVAC Repair — 24/7 Service').");
  else if (titleLength < 30) quickWins.push("🟡 Your title tag is too short (" + titleLength + " chars) — Google can show up to ~60 chars. Add your city and a benefit.");
  else if (titleLength > 60) quickWins.push("🟡 Your title tag is too long (" + titleLength + " chars) — Google truncates after ~60. Trim it so nothing important gets cut.");
  if (!hasMetaDesc) quickWins.push("🟠 Write a meta description — helps Google understand your page and improves click-through rate by ~6%. Aim for 140-160 chars.");
  if (!hasFAQ) quickWins.push("🟠 Add an FAQ section to your homepage — captures 40% more AI search traffic. AI engines pull FAQ content directly into answers. Brand-builds you as the expert.");
  else if (hasFAQ && !hasFAQSchema) quickWins.push("🟢 Wrap your FAQ section in FAQPage schema — you have an FAQ section but no schema. Schema unlocks rich snippets in Google AND makes the content AI-citable.");

  // 🟡 Technical foundations
  if (!hasRobots) quickWins.push("🟡 Create a robots.txt file at /robots.txt — helps Google crawl your site properly. Without it, you risk pages being indexed that shouldn't be.");
  if (!hasSitemap) quickWins.push("🟡 Add sitemap.xml at /sitemap.xml — ensures all your pages get indexed. Most CMS platforms generate this automatically.");

  // 🟡 Local SEO gaps
  if (socialLinks.length === 0) {
    quickWins.push("🟡 Add social media links to your footer — we checked for Facebook, Instagram, LinkedIn, Yelp, and Twitter/X but didn't find any. Builds trust and boosts local SEO.");
  } else if (socialLinks.length < 3) {
    const present = socialLinks.map(s => s.split(':')[0]).join(', ');
    quickWins.push("🟢 You have " + present + " linked — add 1-2 more platforms (LinkedIn or Yelp for service businesses) to widen your social proof.");
  }
  if (!phone) quickWins.push("🟡 Add a visible click-to-call phone number in the header — increases mobile call rate by 20-30%. Wrap it in a tel: link for one-tap dialing.");
  if (isLocalService && cityName && !hasLocalKeyword) {
    quickWins.push("🟠 Add '" + cityName + "' to your homepage copy — you didn't mention your city anywhere. Google's local algorithm needs explicit city signals to rank you locally.");
  }

  // 🟢 Polish / optimization (when fewer than 5 recs from above)
  if (quickWins.length < 5) {
    if (imagesWithAlt < firstFive.length / 2 && firstFive.length > 2) quickWins.push("🟢 Add alt text to your images — " + imagesWithAlt + " of " + firstFive.length + " checked images have alt text. Improves SEO and accessibility.");
    if (responseTime > 2000) quickWins.push("🟢 Your page took " + responseTime + "ms to respond — 53% of visitors leave if load takes over 3 seconds. Compress images, minify CSS/JS.");
    if (!htmlLower.includes('review') && !htmlLower.includes('testimonial')) quickWins.push("🟢 Add customer reviews or testimonials to your homepage — builds trust and improves local rankings. Even 3-5 quotes with names + cities works.");
    if (!htmlLower.includes('location') && !htmlLower.includes('map') && isLocalService) quickWins.push("🟢 Embed a Google Map of your service area — helps local customers visualize you serve their neighborhood. Improves dwell time.");
  }

  // Floor — always show at least 3 recommendations
  if (quickWins.length < 3) {
    if (!hasLocalBizSchema) quickWins.push("🟢 Add LocalBusiness schema with your full service areas — even if you have generic schema, LocalBusiness is what Google's local algorithm reads.");
    quickWins.push("🟢 Create service-specific landing pages — one page per service you offer. Each page can target specific keywords (e.g., '" + (cityName || 'Lubbock') + " plumbing repair' vs '" + (cityName || 'Lubbock') + " drain cleaning').");
    quickWins.push("🟢 Add 'near me' keywords naturally to your service pages — 76% of 'near me' searches result in a same-day visit or call.");
  }

  return {
    audit_id: crypto.randomUUID(),
    composite_score: composite,
    seo_score: seoScore,
    technical_score: technicalScore,
    ai_score: aiScore,
    social_score: socialScore,
    quick_wins: quickWins.slice(0, 7),  // Show up to 7 recommendations
    business_name: businessName,
    business_type: businessType,
    location: userLocation,
    final_url: finalUrl,
    proof: {
      title: title.substring(0, 80),
      phone,
      hasHTTPS,
      hasViewport,
      hasSchema,
      hasLocalBizSchema,
      hasFAQ,
      hasFAQSchema,
      hasOG,
      hasRobots,
      hasSitemap,
      hasFavicon,
      socialLinks,
      responseTime,
      imageCount: imgMatches.length,
      imagesWithAlt,
      titleLength,
      hasLocalKeyword,
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
.brand-mark{display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:14px}
.brand-mark-icon{width:38px;height:38px;display:block;flex:0 0 auto;border-radius:10px;box-shadow:0 4px 14px rgba(204,0,0,0.35)}
.brand-mark span{font-family:var(--font-display);font-size:13px;font-weight:800;letter-spacing:0.14em;color:var(--text-white)}
.report-header{
  margin:18px 0 4px;
  padding:18px 22px;
  background:rgba(255,255,255,0.04);
  border:1px solid var(--border);
  border-left:3px solid var(--accent);
  border-radius:10px;
}
.report-header-eyebrow{font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted);font-weight:600;margin-bottom:4px}
.report-header-name{font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text-white);line-height:1.25;letter-spacing:-0.005em;word-break:break-word}
.report-header-meta{font-family:var(--font-mono);font-size:11px;letter-spacing:0.04em;color:var(--text-muted);margin-top:4px}

/* Revenue impact callout — between overall score and dimensions */
.revenue-impact{
  margin:18px 0;
  padding:22px 24px;
  background:linear-gradient(135deg,rgba(204,0,0,0.14) 0%,rgba(242,101,34,0.06) 100%);
  border:1px solid rgba(204,0,0,0.3);
  border-left:4px solid var(--accent);
  border-radius:12px;
}
.revenue-impact-eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:6px}
.revenue-impact-num{font-family:var(--font-display);font-size:2.2rem;font-weight:800;color:var(--accent);line-height:1.05;font-variant-numeric:tabular-nums}
.revenue-impact-num .unit{font-size:1rem;font-weight:600;color:var(--text-body)}
.revenue-impact-desc{font-size:13.5px;color:var(--text-body);line-height:1.6;margin-top:10px}
.revenue-impact-fine{font-size:11px;color:var(--text-muted);margin-top:8px;font-style:italic}

/* Trust block — between recommendations and CTA */
.trust-block{
  margin:24px 0;
  padding:22px 24px;
  background:rgba(255,255,255,0.04);
  border:1px solid var(--border);
  border-radius:12px;
}
.trust-block-eyebrow{font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted);font-weight:600;margin-bottom:8px}
.trust-block-quote{font-size:15px;line-height:1.65;color:var(--text-white);font-style:italic;margin-bottom:10px}
.trust-block-attr{font-size:13px;color:var(--text-muted);font-weight:500}
.trust-block-attr strong{color:var(--text-body);font-weight:600;font-style:normal}
.unlocked-ribbon{
  margin:18px 0;
  padding:14px 18px;
  background:rgba(0,230,118,0.08);
  border:1px solid rgba(0,230,118,0.32);
  border-left:3px solid var(--green);
  border-radius:10px;
  font-size:14px;
  line-height:1.55;
  color:var(--text-body);
}
.unlocked-ribbon strong{color:var(--text-white)}
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
    <svg class="brand-mark-icon" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="80" height="80" rx="16" fill="#CC0000"/>
      <text x="40" y="52" font-family="Poppins, system-ui, sans-serif" font-size="26" font-weight="800" text-anchor="middle" fill="#ffffff" letter-spacing="-1.5">806</text>
    </svg>
    <span>806 GROWTH</span>
  </div>
  <div class="label-row"><div class="label"><span class="dot"></span> FREE BUSINESS VISIBILITY AUDIT</div></div>
  <h1 class="audit-title">See where you stand in 10 seconds.</h1>
  <p class="audit-sub">Real scores for SEO, technical health, AI visibility, and social presence &mdash; built for service businesses in the 806 and across West Texas.</p>
  <p style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:10px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.5">
    Different from our <a href="https://806growth.com/assessment.html" target="_blank" style="color:var(--accent);text-decoration:none;border-bottom:1px dashed rgba(204,0,0,0.4)">12-point Lead Audit</a> &mdash; this one scans your <strong style="color:var(--text-body)">website</strong> (can people find you?). The Lead Audit checks your <strong style="color:var(--text-body)">lead-capture system</strong> (do you convert them?).
  </p>
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
      <label>Email — unlock the full report (optional)</label>
      <input type="email" id="inpEmail" placeholder="you@yourbusiness.com">
      <div style="margin-top:8px;font-size:11.5px;color:var(--text-muted);line-height:1.6">
        <strong style="color:var(--text-body)">Skip it</strong> → see your overall score + top 2 quick wins.<br>
        <strong style="color:var(--text-body)">Add it</strong> → see all 5-7 recommendations + revenue estimate + we'll email you a PDF copy with specific fix-it steps. No spam.
      </div>
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
    <svg class="brand-mark-icon" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="80" height="80" rx="16" fill="#CC0000"/>
      <text x="40" y="52" font-family="Poppins, system-ui, sans-serif" font-size="26" font-weight="800" text-anchor="middle" fill="#ffffff" letter-spacing="-1.5">806</text>
    </svg>
    <span>806 GROWTH</span>
  </div>
  <div class="label-row"><div class="label"><span class="dot"></span> YOUR VISIBILITY REPORT</div></div>

  <div class="report-header" id="reportHeader">
    <div class="report-header-eyebrow">Audit prepared for</div>
    <div class="report-header-name" id="reportBusinessName">—</div>
    <div class="report-header-meta" id="reportBusinessMeta">&nbsp;</div>
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

  <div class="revenue-impact" id="revenueImpact" style="display:none">
    <div class="revenue-impact-eyebrow">Estimated revenue impact</div>
    <div class="revenue-impact-num"><span id="revenueLossNum">$0</span><span class="unit">/month</span></div>
    <div class="revenue-impact-desc" id="revenueLossDesc">&nbsp;</div>
    <div class="revenue-impact-fine">Estimate based on industry-average visibility-to-revenue conversion for local service businesses at this score range. Your actual number depends on traffic volume and conversion rate.</div>
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

  <div class="trust-block" id="trustBlock">
    <div class="trust-block-eyebrow">⭐ Real result · Lubbock, TX</div>
    <div class="trust-block-quote">"Score was 47 when we started. Three weeks later, 78. Calls went from 2-3 a day to 8-10. We didn't change anything about how we do the work — we just got found."</div>
    <div class="trust-block-attr"><strong>Local HVAC operator</strong> · client of 806 Growth · 30-day result</div>
  </div>

  <div class="cta-box">
    <h3>🚀 Get 3x more customer calls in 30 days.</h3>
    <p>Let's plug the leaks. 15-minute call, no pitch, just numbers — and the exact system that gets you found, called, and booked.</p>
    <a href="https://806growth.com/pricing.html?plan=growth" class="cta-btn" target="_blank" id="ctaBtn" onclick="posthog.capture('cta_clicked', {source: 'results-page'})">Get My Custom 30-Day Growth Plan &rarr;</a>
  </div>

  <div class="email-gate" id="emailGate">
    <h3>🔓 Unlock the full report</h3>
    <p>Drop your email and we'll instantly unlock the <strong style="color:var(--text-white)">3-5 recommendations hidden above</strong>, plus we'll email you a PDF copy with the specific fix-it steps for each one. No spam. Unsubscribe anytime.</p>
    <div class="email-row">
      <input type="email" id="emailInput" placeholder="you@yourbusiness.com">
      <button class="btn" id="emailBtn">Unlock + Email Me the PDF</button>
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
    // Stash whether email was supplied on the form so showResults can decide
    // whether to render full recs immediately or keep the lock-and-gate flow.
    data._emailProvided = !!email;
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

  // Populate the "Audit prepared for" header with the user's business info.
  const bizNameEl = document.getElementById('reportBusinessName');
  const bizMetaEl = document.getElementById('reportBusinessMeta');
  if (bizNameEl) bizNameEl.textContent = d.business_name || 'Your Business';
  if (bizMetaEl) {
    const metaParts = [];
    if (d.business_type) metaParts.push(d.business_type);
    if (d.location) metaParts.push(d.location);
    if (d.final_url) {
      // Strip protocol + trailing slash WITHOUT regex literals — they're inside
      // the HTML_PAGE template literal and \/ escapes get eaten during parsing.
      let displayUrl = d.final_url;
      if (displayUrl.indexOf('https://') === 0) displayUrl = displayUrl.slice(8);
      else if (displayUrl.indexOf('http://') === 0) displayUrl = displayUrl.slice(7);
      if (displayUrl.length && displayUrl.charAt(displayUrl.length - 1) === '/') {
        displayUrl = displayUrl.slice(0, -1);
      }
      metaParts.push(displayUrl);
    }
    bizMetaEl.textContent = metaParts.join(' · ') || ' ';
  }

  document.getElementById('overallScore').textContent=d.composite_score;
  document.getElementById('overallScore').style.color=scoreColor(d.composite_score);
  document.getElementById('overallMsg').textContent=scoreMsg(d.composite_score);

  // Revenue impact — directional estimate. Only shown for local-service business
  // types where visibility-to-revenue is most direct. Conservative multiplier so
  // we under-promise. Baseline assumes a small-to-mid local service shop doing
  // $20-30k/mo of work, with ~60% of new customers driven by online visibility.
  // Loss scales with the score gap (100 - score).
  (function showRevenueImpact() {
    const localTypes = /local service|home services|restaurant|food|healthcare|dental|fitness|gym|auto|med spa|wellness|professional/i;
    const isLocal = d.business_type && localTypes.test(d.business_type);
    const wrap = document.getElementById('revenueImpact');
    const numEl = document.getElementById('revenueLossNum');
    const descEl = document.getElementById('revenueLossDesc');
    if (!wrap || !numEl || !descEl) return;
    if (!isLocal) return; // hidden for e-commerce, nonprofit, "other"
    const score = Number(d.composite_score) || 0;
    const gap = Math.max(0, 100 - score);
    // Conservative baseline: $15k/mo at 100 score for visibility-driven leads.
    // Loss = baseline * (gap/100) * 0.65 multiplier — directional, not precise.
    const monthlyLoss = Math.round((15000 * (gap / 100) * 0.65) / 100) * 100;
    const annualLoss = monthlyLoss * 12;
    if (monthlyLoss < 500) return; // don't show trivial numbers (high scorers)
    numEl.textContent = '$' + monthlyLoss.toLocaleString('en-US');
    descEl.innerHTML =
      'Sites in your score range typically miss <strong style="color:var(--text-white)">~$' +
      monthlyLoss.toLocaleString('en-US') +
      '/month</strong> (about <strong style="color:var(--text-white)">$' +
      annualLoss.toLocaleString('en-US') +
      '/year</strong>) in leads that found a competitor with stronger SEO, AI visibility, or local signals. Fixing the issues below directly closes that gap.';
    wrap.style.display = 'block';
  })();

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

  // Quick wins — gate behavior depends on whether email was supplied on the form.
  // Email provided  → render ALL recommendations, hide the post-results email gate,
  //                   show a success ribbon confirming the PDF is on its way.
  // Email skipped   → render 2 teasers + lock indicator, keep the email gate visible.
  window.fullQuickWins = d.quick_wins || [];
  const badList = document.getElementById('badList');
  const emailGate = document.getElementById('emailGate');
  const goodSection = document.getElementById('goodSection');

  if (d._emailProvided) {
    // Full unlock
    badList.innerHTML = window.fullQuickWins.map(function(w){
      return '<div class="item item-bad">→ ' + w + '</div>';
    }).join('');
    if (emailGate) emailGate.style.display = 'none';

    // Inject a "✓ Full report unlocked" ribbon at the top of the recommendations
    // section so the user feels the value-exchange land.
    if (goodSection && !document.getElementById('unlockedRibbon')) {
      var ribbon = document.createElement('div');
      ribbon.id = 'unlockedRibbon';
      ribbon.className = 'unlocked-ribbon';
      ribbon.innerHTML = "<strong>✓ Full report unlocked.</strong> We've also emailed a PDF copy with the specific fix-it steps to <strong>" + (document.getElementById('inpEmail').value.trim() || 'your inbox') + "</strong>.";
      goodSection.parentNode.insertBefore(ribbon, goodSection);
    }
  } else {
    // Teaser + lock + post-results gate
    var teaserWins = window.fullQuickWins.slice(0, 2);
    var badHTML = teaserWins.map(function(w){ return '<div class="item item-bad">→ ' + w + '</div>'; }).join('');
    if (window.fullQuickWins.length > 2) {
      badHTML += '<div class="item item-bad" style="opacity:0.55;font-style:italic">🔒 ' + (window.fullQuickWins.length - 2) + ' more recommendations hidden — enter your email below to unlock.</div>';
    }
    badList.innerHTML = badHTML;
    if (emailGate) emailGate.style.display = '';
  }

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
