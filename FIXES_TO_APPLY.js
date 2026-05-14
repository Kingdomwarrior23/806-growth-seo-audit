// CRITICAL FIXES FOR WORKER.JS
// Apply these changes to improve UX and error handling

/* ============================================
   FIX 1: Better error handling (no alert)
   ============================================ */

// REPLACE line 545 (alert) with inline error display:

// BEFORE:
//     alert('Error: '+err.message+'. Please check the URL and try again.');
//     document.getElementById('progressCard').classList.add('hidden');
//     document.getElementById('formCard').classList.remove('hidden');

// AFTER:
    // Show error inline
    document.getElementById('progressCard').classList.add('hidden');
    document.getElementById('formCard').classList.remove('hidden');
    const errorBox = document.createElement('div');
    errorBox.className = 'fact-box';
    errorBox.style.cssText = 'background:#fff5f5;border-left:3px solid var(--red);margin-top:16px';
    errorBox.innerHTML = '❌ <strong>Error:</strong> '+err.message+'. Please check the URL and try again.';
    const form = document.getElementById('auditForm');
    form.insertAdjacentElement('afterend', errorBox);
    setTimeout(() => errorBox.remove(), 8000); // Auto-dismiss after 8s


/* ============================================
   FIX 2: Add rotating loading facts
   ============================================ */

// ADD after line 533 (inside submit handler, after progress animation starts):

// Start rotating facts during actual API call
let factInterval = setInterval(() => {
  const el = document.getElementById('factText2');
  if (el && el.textContent) {
    fi = (fi + 1) % facts.length;
    el.textContent = facts[fi];
  }
}, 3000);

// THEN in the try block success (line 543, after showResults), add:
clearInterval(factInterval);

// ALSO in the catch block (after line 545), add:
clearInterval(factInterval);


/* ============================================
   FIX 3: URL normalization in runAudit
   ============================================ */

// REPLACE line 73 (URL normalization) with more robust version:

// BEFORE:
//   if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

// AFTER:
  // Normalize URL
  targetUrl = targetUrl.trim().toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, 'https://'); // Strip protocol + www, add https
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;


/* ============================================
   FIX 4: Enhanced GHL webhook with tags
   ============================================ */

// REPLACE lines 27-43 (GHL webhook) with tagged version:

// BEFORE: (just email, scores, source)

// AFTER:
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
              // Add tags for workflow routing
              tags: [
                'audit-lead',
                'source-visibility-tool',
                'type-' + (body.businessType || 'other').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                results.composite_score >= 75 ? 'score-high' : 
                  results.composite_score >= 55 ? 'score-mid' : 'score-low',
                body.email ? 'email-provided' : 'email-skipped'
              ].join(',')
            })
          }).catch(() => {});


/* ============================================
   FIX 5: Email gate webhook tags
   ============================================ */

// REPLACE line 626-632 (email gate webhook) with tagged version:

// BEFORE:
//     await fetch('https://services.leadconnectorhq.com/hooks/jDoRsNEPg0qtXUYNouR3/webhook-trigger/1W0WEZzu3MzXX1PpAmXw',{
//       method:'POST',headers:{'Content-Type':'application/json'},
//       body:JSON.stringify({email,source:'email-gate'})
//     });

// AFTER:
    await fetch('https://services.leadconnectorhq.com/hooks/jDoRsNEPg0qtXUYNouR3/webhook-trigger/1W0WEZzu3MzXX1PpAmXw',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        email,
        source:'email-gate',
        tags:'audit-lead,source-visibility-tool,email-unlocked'
      })
    });


/* ============================================
   FIX 6: Add "Other" fallback option
   ============================================ */

// No code change needed — just verify "Other" option exists in the select dropdown (it does)


/* ============================================
   NOTES ON IMPLEMENTATION ORDER
   ============================================ */

// 1. Fix error handling (FIX 1) — prevents alert() jank
// 2. Add loading facts rotation (FIX 2) — improves perceived speed
// 3. URL normalization (FIX 3) — handles www/http/https variants
// 4. GHL webhook tags (FIX 4 + 5) — enables workflow automation
// 5. Test all fixes with real submission
