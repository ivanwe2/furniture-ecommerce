#!/usr/bin/env bash
# smoke-test.sh — production smoke test checklist for nasteh.bg
# Usage: source this script or run individual curl commands against the deployed URL
#
# Set BASE_URL to your production URL before running:
#   export BASE_URL=https://nasteh.bg

set -euo pipefail

BASE_URL="${BASE_URL:-https://nasteh.bg}"

echo "=== nasteh.bg Production Smoke Test ==="
echo "Target: ${BASE_URL}"
echo "Date: $(date)"
echo ""

echo "--- 1. Home page loads ---"
curl -sS -o /dev/null -w "HTTP %{http_code} (%{time_total}s)\n" "${BASE_URL}/"
echo ""

echo "--- 2. Category navigation (example: first category from sitemap) ---"
# Fetch a category page — adjust slug if needed after seed
RESPONSE=$(curl -sS -w "%{http_code}" "${BASE_URL}/kategoria/mebelen-obkov/" -o /dev/null)
echo "Category page: HTTP ${RESPONSE}"
echo ""

echo "--- 3. Product page with items table ---"
RESPONSE=$(curl -sS -w "%{http_code}" "${BASE_URL}/produkt/ugol-shift-yuzhen-lyav/" -o /dev/null)
echo "Product page: HTTP ${RESPONSE}"
echo ""

echo "--- 4. Add to cart → checkout flow ---"
echo "  [MANUAL] Visit a product page, select an item from the table, click 'Добави в количката'"
echo "  [MANUAL] Verify /kolichka shows the item with correct price"
echo "  [MANUAL] Click 'Завърши поръчка', fill checkout form on /poruchka"
echo "  [MANUAL] Verify success page /poruchka/uspeshna loads"
echo "  [MANUAL] Check owner email arrives at ORDER_INBOX_EMAIL"
echo "  [MANUAL] Check customer confirmation email arrives"
echo ""

echo "--- 5. Admin login ---"
RESPONSE=$(curl -sS -w "%{http_code}" "${BASE_URL}/admin/login" -o /dev/null)
echo "Admin login page: HTTP ${RESPONSE}"
echo "  [MANUAL] Login with admin credentials, verify dashboard loads"
echo ""

echo "--- 6. Image transformation URL ---"
echo "  [CHECK] Visit a product image in browser dev tools network tab"
echo "  [CHECK] Confirm /cdn-cgi/image/ URLs return 200 and correct format (webp/avif)"
echo "  [CHECK] Example:"
curl -sS -o /dev/null -w "Transform test: HTTP %{http_code}\n" \
  "${BASE_URL}/cdn-cgi/image/width=480,format=auto/test.jpg" 2>/dev/null || true
echo ""

echo "--- 7. Redirect rows (301 verification) ---"
# These are PrestaShop → new site redirects from data/redirects.csv
REDIRECTS=("/index.php?id_category=5" "/index.php?id_product=12")
for REDIR in "${REDIRECTS[@]}"; do
  RESPONSE=$(curl -sS -I -w "%{http_code}" "${BASE_URL}${REDIR}" -o /dev/null)
  LOCATION=$(curl -sS -I "${BASE_URL}${REDIR}" | grep -i '^location:' || true)
  echo "  ${REDIR}: HTTP ${RESPONSE} — ${LOCATION}"
done
echo ""

echo "--- 8. Sitemap fetch ---"
RESPONSE=$(curl -sS -w "%{http_code}" "${BASE_URL}/sitemap.xml" -o /dev/null)
echo "Sitemap: HTTP ${RESPONSE}"
echo ""

echo "--- 9. 404 page ---"
RESPONSE=$(curl -sS -w "%{http_code}" "${BASE_URL}/nonexistent-page-12345" -o /dev/null)
echo "404 test: HTTP ${RESPONSE} (expected 404)"
echo ""

echo "--- 10. Robots.txt ---"
RESPONSE=$(curl -sS -w "%{http_code}" "${BASE_URL}/robots.txt" -o /dev/null)
echo "Robots: HTTP ${RESPONSE}"
echo ""

echo "=== Smoke test complete ==="
echo ""
echo "REMAINING MANUAL CHECKS (mark in PROGRESS.md launch checklist):"
echo "  [ ] Full checkout round-trip with real order + both emails received"
echo "  [ ] Admin login works, can create/edit products"
echo "  [ ] Image transformations serve webp/avif on the real zone"
echo "  [ ] All 10 redirect rows verified (curl -I → 301 + correct Location)"
echo "  [ ] Google Search Console property added, sitemap submitted"
