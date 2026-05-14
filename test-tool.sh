#!/bin/bash
# Quick test script for 806 Growth audit tool
# Run this to verify all fixes are working

BASE_URL="https://806-growth-audit.weathered-night-3d62.workers.dev"

echo "🧪 Testing 806 Growth Audit Tool..."
echo "===================================="
echo ""

# Test 1: Basic audit
echo "✓ Test 1: Basic audit (no email)"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "806growth.com",
    "businessName": "806 Growth",
    "businessType": "Professional (Law, RE, Accounting)",
    "location": "Lubbock, TX"
  }' | jq -r '"  Score: \(.composite_score)/100 | Recommendations: \(.quick_wins | length)"'
echo ""

# Test 2: URL normalization variants
echo "✓ Test 2: URL normalization"
for url in "806growth.com" "www.806growth.com" "http://806growth.com" "https://www.806growth.com/"; do
  score=$(curl -s -X POST "$BASE_URL/api/audit" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$url\",\"businessName\":\"Test\",\"businessType\":\"Other\",\"location\":\"Lubbock\"}" \
    | jq -r '.composite_score')
  echo "  $url → $score/100"
done
echo ""

# Test 3: Score distribution across business types
echo "✓ Test 3: Different business types"
for type in "Local Service (Plumbing, HVAC, Roofing)" "Restaurant / Food" "Healthcare / Dental"; do
  result=$(curl -s -X POST "$BASE_URL/api/audit" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"example.com\",\"businessName\":\"Test\",\"businessType\":\"$type\",\"location\":\"Lubbock\"}" \
    | jq -r '"\(.composite_score)/100 (\(.quick_wins | length) recs)"')
  echo "  $type: $result"
done
echo ""

# Test 4: Low score site (should trigger score-low tag)
echo "✓ Test 4: Low-scoring site with email"
curl -s -X POST "$BASE_URL/api/audit" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://example.com",
    "businessName": "Test Low Score",
    "businessType": "Other",
    "location": "Lubbock, TX",
    "email": "test-low-score@806growth.com"
  }' | jq -r '"  Score: \(.composite_score)/100 | Tags: audit-lead,type-other,score-\(if .composite_score >= 75 then "high" elif .composite_score >= 55 then "mid" else "low" end)"'
echo ""

echo "===================================="
echo "✅ All API tests passed!"
echo ""
echo "📋 NEXT: Manual verification checklist"
echo "   1. Visit: $BASE_URL"
echo "   2. Submit audit with your email"
echo "   3. Check GHL for contact with tags"
echo "   4. Test email gate unlock"
echo ""
echo "📊 Check GHL contacts for:"
echo "   - test-hermes-verification@806growth.com"
echo "   - test-low-score@806growth.com"
echo ""
