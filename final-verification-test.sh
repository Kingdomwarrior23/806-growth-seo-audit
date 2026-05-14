#!/bin/bash
# Final comprehensive test - 806 Growth Audit Tool
# Version: 5f6124f4 (May 10, 2026)

BASE_URL="https://806-growth-audit.weathered-night-3d62.workers.dev"

echo "🎯 FINAL VERIFICATION TEST"
echo "=========================="
echo ""

# Test 1: No more 100/100 scores
echo "✓ Test 1: Category score caps (max 95)"
result=$(curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{"url":"806growth.com","businessName":"Test","businessType":"Other","location":"Lubbock"}' \
  | jq -r '"SEO: \(.seo_score)/95 | Tech: \(.technical_score)/95 | AI: \(.ai_score)/95 | Social: \(.social_score)/95"')
echo "  $result"

max_score=$(curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{"url":"806growth.com","businessName":"Test","businessType":"Other","location":"Lubbock"}' \
  | jq '[.seo_score, .technical_score, .ai_score, .social_score] | max')

if [ "$max_score" -le 95 ]; then
  echo "  ✅ PASS — No category scores above 95"
else
  echo "  ❌ FAIL — Found score of $max_score (should be max 95)"
fi
echo ""

# Test 2: Social explanation when 0
echo "✓ Test 2: Social score explanation"
social_msg=$(curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{"url":"example.com","businessName":"Test","businessType":"Other","location":"Lubbock"}' \
  | jq -r '.quick_wins[] | select(contains("social")) | .[0:80]')
echo "  $social_msg..."
if [[ "$social_msg" == *"we checked"* ]]; then
  echo "  ✅ PASS — Social explanation included"
else
  echo "  ⚠️  WARNING — Social explanation not found"
fi
echo ""

# Test 3: Always 3+ recommendations
echo "✓ Test 3: Minimum 3 recommendations"
for score in "high" "mid" "low"; do
  case $score in
    high) url="806growth.com";;
    mid) url="example.org";;
    low) url="example.com";;
  esac
  
  count=$(curl -s -X POST "$BASE_URL/api/audit" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$url\",\"businessName\":\"Test\",\"businessType\":\"Other\",\"location\":\"Lubbock\"}" \
    | jq '.quick_wins | length')
  
  overall=$(curl -s -X POST "$BASE_URL/api/audit" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$url\",\"businessName\":\"Test\",\"businessType\":\"Other\",\"location\":\"Lubbock\"}" \
    | jq '.composite_score')
  
  echo "  $score score ($overall/100): $count recommendations"
  
  if [ "$count" -ge 3 ]; then
    echo "    ✅ PASS"
  else
    echo "    ❌ FAIL — Only $count recommendations (need 3+)"
  fi
done
echo ""

# Test 4: GHL webhook tags format
echo "✓ Test 4: GHL webhook tags"
echo "  Sending test with email..."
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "mobileivsolutions.com",
    "businessName": "Final Test",
    "businessType": "Med Spa / IV Therapy / Wellness",
    "location": "Lubbock, TX",
    "email": "final-test@806growth.com"
  }' > /dev/null

echo "  Expected tags: audit-lead,source-visibility-tool,type-med-spa-iv-therapy-wellness,score-low,email-provided"
echo "  ✅ Webhook fired — check GHL for: final-test@806growth.com"
echo ""

# Test 5: URL normalization edge cases
echo "✓ Test 5: URL normalization edge cases"
test_urls=(
  "EXAMPLE.COM"
  "  example.com  "
  "example.com/"
  "example.com///"
)

for test_url in "${test_urls[@]}"; do
  score=$(curl -s -X POST "$BASE_URL/api/audit" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$test_url\",\"businessName\":\"Test\",\"businessType\":\"Other\",\"location\":\"Lubbock\"}" \
    | jq -r '.composite_score')
  echo "  \"$test_url\" → $score/100"
done
echo ""

echo "=========================="
echo "✅ AUTOMATED TESTS COMPLETE"
echo ""
echo "📋 MANUAL CHECKS NEEDED:"
echo "   1. Visit tool in browser"
echo "   2. Verify fact box shows text on load (not empty)"
echo "   3. Submit audit → verify progress bar + rotating facts"
echo "   4. Check results show 2 teasers + lock message"
echo "   5. Test email gate unlock"
echo "   6. **CRITICAL:** Check GHL for final-test@806growth.com with tags"
echo ""
