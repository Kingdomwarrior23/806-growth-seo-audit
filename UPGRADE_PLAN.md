# 806 Growth Audit Tool — Upgrade Plan

Based on Perplexity's audit feedback. Priority fixes to turn this from "tech check" into "converting lead magnet."

---

## CRITICAL (Converts Leads)

### ✅ 1. Gate recommendations behind email [IMPLEMENTING]
- **Current**: Shows full report up front, asks for email at bottom
- **Fix**: Show scores + 1-2 teaser issues → require email to unlock full action plan
- **Impact**: Forces lead capture before value delivery

### 2. Add GBP + Local SEO checks [NEXT]
- **Current**: No GBP check, no NAP consistency, no citations
- **Add checks**:
  - Google Business Profile presence (via Google Places API)
  - NAP consistency (name/address/phone)
  - Review count + rating
  - "Near me" keyword presence
  - Local citations (Yelp, BBB, Apple Maps)
- **Impact**: Differentiator as local West Texas agency

### 3. Always generate 3-7 recommendations [IMPLEMENTING]
- **Current**: High-scoring sites get 1 bullet or "add social links"
- **Fix**: Even 82/100 sites get 3-5 ranked issues
- **Method**: Add "optimization opportunities" for sites missing:
  - Local business schema fields
  - Google Maps embed
  - Review schema markup
  - Service area pages
  - Location-specific content

### 4. Wire to GHL properly [VERIFY]
- **Current**: Fire-and-forget webhook on line 27 + 589
- **Check**: Confirm leads flow to 806 Growth (not 806 Pro)
- **Verify tags**: `seo-audit-lead`, `source:free-audit-tool`

---

## HIGH IMPACT

### 5. Add competitor benchmark
- **Feature**: "You scored 82. Avg Lubbock [type] scores 61. Top competitor X scores 94."
- **Method**: Static lookup table by business type
- **Impact**: Comparison drives action

### 6. Make AI Visibility tangible
- **Current**: Just a score (0-100)
- **Fix**: Show what AI actually sees
- **Options**:
  - Query ChatGPT API: "Describe this business"
  - Show extracted schema data
  - Show FAQ answers found
- **Impact**: Proof of AI-readiness

### 7. Tighten scoring calibration
- **Current**: Sites can hit 100/100 (not believable)
- **Fix**: Median Lubbock SMB should score 55-70
- **Method**: Add deductions for:
  - Missing LocalBusiness schema fields
  - Thin meta descriptions
  - Missing H1 hierarchy
  - No local keywords
  - Missing service pages

### 8. Fix Social detection
- **Current**: Returns 0 by default if links not found
- **Fix**: Actually scan footer/header for FB/IG/LinkedIn
- **Add**: Explain why 0 score (e.g., "No social links found on homepage")

---

## POLISH

### 9. PDF export
- **Feature**: Branded 806 Growth PDF report as email deliverable
- **Method**: Generate via Puppeteer on Cloudflare or client-side jsPDF
- **Impact**: Real lead magnet asset

### 10. Loading states
- **Current**: Progress bar exists but facts rotate slowly
- **Fix**: Add "Scanning DNS… Checking schema… Querying AI…" copy
- **Impact**: Perceived value

### 11. Add business types
- **Current**: Missing "Home Services," "Auto," "Fitness," "Med Spa," "Nonprofit"
- **Fix**: Expand dropdown

### 12. Fix duplicate sections
- **Current**: "What We Found" duplicates "What's Working"
- **Fix**: Consolidate or differentiate

### 13. GA/PostHog tracking
- **Feature**: Track tool→call conversion with UTM passthrough
- **Impact**: Measure ROI

### 14. CTA copy
- **Current**: "Book Free Strategy Call"
- **Fix**: "Get My Custom 30-Day Growth Plan" (outcome over format)

---

## IMPLEMENTATION ORDER

**Today (Sunday):**
1. Gate recommendations behind email ✅ [DOING NOW]
2. Generate 3-7 recommendations always ✅ [DOING NOW]
3. Add missing business types ✅ [DOING NOW]
4. Tighten scoring (no 100/100s) ✅ [DOING NOW]
5. Fix Social detection explanation ✅ [DOING NOW]
6. Update CTA copy ✅ [DOING NOW]

**This Week:**
7. Add GBP + local SEO checks (requires Google Places API)
8. Add competitor benchmark (static lookup table)
9. Make AI Visibility tangible (schema extraction or ChatGPT query)
10. PDF export (client-side jsPDF)

**Later:**
11. GA/PostHog tracking
12. Fix duplicate sections

---

## NOTES

- GHL webhook URL is **806 GROWTH** not 806 Pro (line 27 uses jDoRsNEPg0qtXUYNouR3)
- Current cost: $0/audit (no paid APIs)
- Keep it free — don't add paid API dependencies unless absolutely necessary
- Target: Median Lubbock SMB scores 55-70 → creates urgency to book call
