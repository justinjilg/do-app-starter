#!/bin/bash
# Test script for mobile API endpoints

API_URL="${1:-http://localhost:8080}"
echo "🧪 Testing Mobile API at: $API_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test health endpoints
echo -e "${BLUE}1. Testing Health Endpoints${NC}"
echo "GET $API_URL/health"
curl -s "$API_URL/health" | jq '.'
echo ""

echo "GET $API_URL/health/db"
curl -s "$API_URL/health/db" | jq '.'
echo ""

# Test signup
echo -e "${BLUE}2. Testing User Signup${NC}"
SIGNUP_EMAIL="test-$(date +%s)@example.com"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SIGNUP_EMAIL\",\"password\":\"Test123!\",\"name\":\"Test User\"}")

echo "$SIGNUP_RESPONSE" | jq '.'
TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Signup failed - no token received${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Signup successful - Token received${NC}"
echo ""

# Test login
echo -e "${BLUE}3. Testing User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SIGNUP_EMAIL\",\"password\":\"Test123!\"}")

echo "$LOGIN_RESPONSE" | jq '.'
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$LOGIN_TOKEN" != "null" ] && [ -n "$LOGIN_TOKEN" ]; then
  echo -e "${GREEN}✅ Login successful${NC}"
  TOKEN="$LOGIN_TOKEN"
else
  echo -e "${RED}❌ Login failed${NC}"
fi
echo ""

# Test get profile
echo -e "${BLUE}4. Testing Get Profile (Protected)${NC}"
echo "GET $API_URL/api/users/me"
curl -s "$API_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo -e "${GREEN}✅ Profile retrieved${NC}"
echo ""

# Test update profile
echo -e "${BLUE}5. Testing Update Profile${NC}"
curl -s -X PUT "$API_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Test User"}' | jq '.'
echo -e "${GREEN}✅ Profile updated${NC}"
echo ""

# Test create item
echo -e "${BLUE}6. Testing Create Item (Protected)${NC}"
CREATE_ITEM_RESPONSE=$(curl -s -X POST "$API_URL/api/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item from API","description":"Created via test script","metadata":{"test":true}}')

echo "$CREATE_ITEM_RESPONSE" | jq '.'
ITEM_ID=$(echo "$CREATE_ITEM_RESPONSE" | jq -r '.item.id')

if [ "$ITEM_ID" != "null" ] && [ -n "$ITEM_ID" ]; then
  echo -e "${GREEN}✅ Item created - ID: $ITEM_ID${NC}"
else
  echo -e "${RED}❌ Item creation failed${NC}"
fi
echo ""

# Test get user's items
echo -e "${BLUE}7. Testing Get User's Items${NC}"
curl -s "$API_URL/api/users/me/items" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo -e "${GREEN}✅ Items retrieved${NC}"
echo ""

# Test get single item
if [ "$ITEM_ID" != "null" ] && [ -n "$ITEM_ID" ]; then
  echo -e "${BLUE}8. Testing Get Single Item${NC}"
  curl -s "$API_URL/api/items/$ITEM_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo -e "${GREEN}✅ Single item retrieved${NC}"
  echo ""

  # Test update item
  echo -e "${BLUE}9. Testing Update Item${NC}"
  curl -s -X PUT "$API_URL/api/items/$ITEM_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Updated Test Item","description":"Modified via test script"}' | jq '.'
  echo -e "${GREEN}✅ Item updated${NC}"
  echo ""

  # Test delete item
  echo -e "${BLUE}10. Testing Delete Item${NC}"
  curl -s -X DELETE "$API_URL/api/items/$ITEM_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo -e "${GREEN}✅ Item deleted${NC}"
  echo ""
fi

# Test logout
echo -e "${BLUE}11. Testing Logout${NC}"
curl -s -X POST "$API_URL/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo -e "${GREEN}✅ Logout successful${NC}"
echo ""

# Test using revoked token (should fail)
echo -e "${BLUE}12. Testing Revoked Token (Should Fail)${NC}"
REVOKED_RESPONSE=$(curl -s "$API_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN")
echo "$REVOKED_RESPONSE" | jq '.'

if echo "$REVOKED_RESPONSE" | grep -q "SESSION_EXPIRED\|INVALID_TOKEN"; then
  echo -e "${GREEN}✅ Revoked token correctly rejected${NC}"
else
  echo -e "${RED}❌ Revoked token not rejected (security issue!)${NC}"
fi
echo ""

echo -e "${GREEN}🎉 All tests completed!${NC}"
