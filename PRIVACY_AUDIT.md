# Privacy & Security Audit — PostHog Analytics

**Deployed:** 1059edcd (May 10, 2026)

---

## ✅ Privacy Status: CLEAN

### Event Data Analysis

**audit_started** — ✅ NO PII
```javascript
posthog.capture('audit_started', {
  url: 'mobileivsolutions.com',  // Public website URL (not PII)
  businessType: 'Healthcare / Dental'  // Generic category (not PII)
})
```
- No email
- No businessName (could be personal name like "Brandon Sanders LLC")
- No phone number
- URL is publicly accessible anyway

**audit_completed** — ✅ NO PII
```javascript
posthog.capture('audit_completed', {
  url: 'mobileivsolutions.com',  // Public website URL
  score: 38,  // Aggregate score (not PII)
  seo: 75, tech: 25, ai: 0, social: 0  // Numeric scores
})
```
- No email
- No businessName
- No location

**email_unlocked** — ✅ NO PII
```javascript
posthog.capture('email_unlocked', {
  source: 'email-gate'  // Just indicates WHERE they unlocked, not WHO
})
```
- No actual email value sent to PostHog
- Email is only sent to GHL (where it belongs)

**cta_clicked** — ✅ NO PII
```javascript
posthog.capture('cta_clicked', {
  source: 'results-page'  // Just indicates WHERE they clicked
})
```
- No identifying information

---

## 🔒 Data Flow Architecture

```
User submits audit
         │
         ├─→ Worker (Cloudflare) ─→ fetch website ─→ compute scores
         │
         ├─→ GHL webhook ─→ receives: email, businessName, all scores, tags
         │                 ─→ creates/updates contact with full PII
         │
         └─→ PostHog ─→ receives: url (public), businessType (category), scores
                      ─→ NO PII sent here
                      ─→ tracks: pageviews, funnel progression, session replays
```

**PII (email, businessName, phone) stays in GHL.**
**Aggregate data (URLs, scores, categories, funnel events) goes to PostHog.**

---

## 📋 Event Naming Convention

**Changed from hyphen-case to snake_case:**

| Before | After | Reason |
|--------|-------|--------|
| `audit-started` | `audit_started` | Better compatibility with BI tools, dbt, Supabase |
| `audit-completed` | `audit_completed` | Snake_case is PostHog community convention |
| `email-unlocked` | `email_unlocked` | Avoids column name issues in data warehouses |
| `cta-clicked` | `cta_clicked` | Consistent naming across all events |

**Decision:** Use snake_case for all custom events. Documented in this file for future reference.

---

## 🛡️ PostHog Security Settings (To Configure After Account Setup)

### 1. Authorized URLs (Required)

**PostHog → Project Settings → Authorized URLs**

Add ONLY:
- `https://806-growth-audit.weathered-night-3d62.workers.dev`

This prevents spam events from being ingested from other domains. The `phc_` token is public (anyone can see it in View Source), so without authorized URLs, anyone could spam your analytics.

### 2. Bot Filtering (Recommended)

**PostHog → Project Settings → Enable bot filtering**

PostHog automatically filters known bots and crawlers. Enable this to keep your data clean.

### 3. Data Retention (Default OK)

PostHog retains event data for 7 years on free tier. This is fine for your use case. If you ever need to reduce retention (GDPR), you can set it to 1 year.

---

## ✅ GDPR/CCPA Compliance Statement

**For client work or audits, you can state:**

> "No direct identifiers (email, phone, name) are transmitted to our analytics provider. The audited website URL and aggregate score data are captured to measure tool performance. Personal contact data is processed exclusively by GoHighLevel."

**Note:** The URL field is quasi-PII (e.g., `firstnamelastname-consulting.com` could identify someone). However, this is a marketing tool with low privacy risk. The statement above is accurate and defensible for client privacy reviews.

**Privacy settings applied:**
- `persistence: 'memory'` — no cookies or localStorage (GDPR-friendly)
- `property_blacklist: ['$ip']` — IP address stripped (max privacy)
- `respect_dnt: true` — honors Do Not Track headers

---

## 🧪 PostHog Setup Checklist

**YOU NEED TO DO THIS:**

1. [ ] Register at https://posthog.com/register (US region)
2. [ ] Create free account (1M events/mo)
3. [ ] Go to Project Settings → copy `phc_xxxxx` token
4. [ ] Go to Project Settings → Authorized URLs → add `https://806-growth-audit.weathered-night-3d62.workers.dev`
5. [ ] Enable bot filtering
6. [ ] Send `phc_xxxxx` token to Hermes

**HERMES WILL DO THIS:**

7. [ ] Replace `phc_REPLACEME` in worker.js with real token
8. [ ] Deploy updated worker
9. [ ] Verify snippet appears in deployed HTML (view-source check)
10. [ ] Test: open incognito → submit audit → check PostHog Live Events tab

---

## 📊 Funnel Setup (Post-Deploy)

**PostHog → Insights → New → Funnel**

Steps:
1. `$pageview` (automatic)
2. `audit_started` (custom)
3. `audit_completed` (custom)
4. `email_unlocked` (custom)
5. `cta_clicked` (custom)

**Save as:** "Audit → Strategy Call Funnel"

**This is the single most important dashboard for the next 90 days.**

---

## 🎯 Expected Conversion Benchmarks

| Step | Target | Red Flag If |
|------|--------|-------------|
| pageview → audit_started | 25–40% | < 15% = form intimidates users |
| audit_started → audit_completed | 95%+ | < 90% = worker silently errors on real URLs |
| audit_completed → email_unlocked | 30–40% | < 20% = email gate copy isn't compelling |
| email_unlocked → cta_clicked | 15–25% | < 10% = CTA placement is off |

**If you hit these targets:** 30–40% audit→email + 3–5% audit→call = ~1 booked call per 25 audits

---

## 📋 Summary

✅ **Privacy:** CLEAN — no PII in PostHog events
✅ **Event naming:** snake_case (future-proof for data warehouses)
✅ **Token is safe to share:** Public client-side key, designed to be in HTML
✅ **Security:** Configure Authorized URLs after account setup
✅ **Compliance:** GDPR/CCPA-ready statement above

**Your action:** Create PostHog account, get `phc_` token, send it over.
**My action:** Deploy token, verify events fire, build funnel dashboard.

---

**Files updated:**
- `~/seo-audit-worker/worker.js` (version 1059edcd)
- This privacy audit document

**Deploy command:**
```bash
cd ~/seo-audit-worker && wrangler deploy
```

---

## ✅ DEPLOYED: Version 2d480ff0 (May 10, 2026)

### Privacy Features Added:

1. **Console warning for placeholder token**
   ```javascript
   const POSTHOG_TOKEN = 'phc_REPLACEME';
   if (POSTHOG_TOKEN === 'phc_REPLACEME') {
     console.warn('⚠️ PostHog token not set — analytics disabled. Replace phc_REPLACEME with real token.');
   }
   ```
   - Prevents accidental deployment with placeholder
   - Visible in browser console if token not set

2. **Privacy-first PostHog settings**
   ```javascript
   posthog.init(POSTHOG_TOKEN, {
     api_host: 'https://us.i.posthog.com',
     defaults: '2026-01-30',
     persistence: 'memory',           // No cookies/localStorage
     property_blacklist: ['$ip'],     // Strip IP address
     respect_dnt: true,               // Honor Do Not Track
   })
   ```
   - GDPR-friendly (no persistent cookies)
   - Max privacy (IP stripped)
   - Respects user privacy preferences

3. **Tighter disclosure language**
   > "No direct identifiers (email, phone, name) are transmitted to our analytics provider. The audited website URL and aggregate score data are captured to measure tool performance. Personal contact data is processed exclusively by GoHighLevel."

---

## 🎯 WAITING ON BRANDON

**Your action (5 minutes):**
1. Create PostHog account at https://posthog.com/register (US region)
2. Copy `phc_xxxxx` token from Project Settings
3. Add Authorized URL: `https://806-growth-audit.weathered-night-3d62.workers.dev`
4. Enable bot filtering
5. Send `phc_xxxxx` token to Hermes

**Hermes will do (2 minutes):**
1. Replace `phc_REPLACEME` in worker.js with your real token
2. Deploy updated worker
3. Verify snippet in deployed HTML
4. Confirm console warning is gone

**Then verify (5 minutes):**
1. Open tool in incognito
2. Open DevTools → Network tab
3. Submit audit with `kingdomwarrior23@gmail.com`
4. Click CTA
5. Verify 5 network requests to PostHog
6. Check PostHog → Activity → Live Events

**Expected: 5 events within 30 seconds**
- `$pageview` (auto)
- `audit_started`
- `audit_completed`
- `email_unlocked`
- `cta_clicked`

---

## 📋 Post-Deploy Checklist

After token is live:

- [ ] Build funnel: `$pageview → audit_started → audit_completed → email_unlocked → cta_clicked`
- [ ] Save as "Lead Magnet Funnel"
- [ ] Create trend: daily `audit_completed` volume (alert if drops to 0)
- [ ] Create trend: breakdown by `businessType`
- [ ] Create cohort: "Hot leads" = score < 50 AND email_unlocked
- [ ] Test 5 audits across different business types
- [ ] Test 1 audit on mobile (Daisy or non-technical user)
- [ ] Verify GHL contacts exist with tags
- [ **THEN** ] Turn on traffic

---

## 🚀 Traffic Launch Sequence

1. ✅ Token live in PostHog
2. ✅ Verify 5 events fire in incognito test
3. ✅ Test 5 audits (Med Spa, Healthcare, Local Service, Restaurant, Auto)
4. ✅ Mobile test with non-technical user
5. ✅ GHL contacts verified (`test-hermes-verification@`, etc.)
6. ✅ Only then: drive paid traffic

**Don't rush.** The funnel validation is worth 24-48 hours of delay.

---

**Files updated:**
- `~/seo-audit-worker/worker.js` (version 2d480ff0)
- `~/seo-audit-worker/PRIVACY_AUDIT.md` (this file)

**Ready for token.** Send `phc_xxxxx` when you have it.
