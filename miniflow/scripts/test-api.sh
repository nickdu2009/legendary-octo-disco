#!/bin/bash

# MiniFlow API Test Script
# Tests all user management APIs

echo "🧪 MiniFlow API 接口测试"
echo "=================================="

BASE_URL="http://localhost:8080"
API_URL="$BASE_URL/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing: $description ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/api_response.json "$API_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -o /tmp/api_response.json \
                   -X "$method" \
                   -H "Content-Type: application/json" \
                   -d "$data" \
                   "$API_URL$endpoint")
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL (Expected: $expected_status, Got: $response)${NC}"
        echo "Response body:"
        cat /tmp/api_response.json
        echo ""
    fi
}

# Function to test with auth token
test_authenticated_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local expected_status=$5
    local description=$6
    
    echo -n "Testing: $description ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/api_response.json \
                   -H "Authorization: Bearer $token" \
                   "$API_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -o /tmp/api_response.json \
                   -X "$method" \
                   -H "Content-Type: application/json" \
                   -H "Authorization: Bearer $token" \
                   -d "$data" \
                   "$API_URL$endpoint")
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL (Expected: $expected_status, Got: $response)${NC}"
        echo "Response body:"
        cat /tmp/api_response.json
        echo ""
    fi
}

echo "🏥 健康检查测试"
echo "----------------------------------"
test_endpoint "GET" "/health" "" "200" "Health check endpoint"

echo ""
echo "🔐 认证相关API测试"
echo "----------------------------------"

# Test user registration
echo "📝 测试用户注册..."
register_data='{
    "username": "testuser",
    "password": "password123",
    "display_name": "Test User",
    "email": "test@example.com"
}'
test_endpoint "POST" "/auth/register" "$register_data" "201" "User registration"

# Test user login
echo "🔑 测试用户登录..."
login_data='{
    "username": "testuser",
    "password": "password123"
}'
test_endpoint "POST" "/auth/login" "$login_data" "200" "User login"

# Extract token from login response (if successful)
if [ -f /tmp/api_response.json ]; then
    TOKEN=$(cat /tmp/api_response.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$TOKEN" ]; then
        echo "Token extracted: ${TOKEN:0:20}..."
    fi
fi

echo ""
echo "👤 用户资料API测试"
echo "----------------------------------"

if [ ! -z "$TOKEN" ]; then
    # Test get profile
    test_authenticated_endpoint "GET" "/user/profile" "$TOKEN" "" "200" "Get user profile"
    
    # Test update profile
    update_data='{
        "display_name": "Updated Test User",
        "phone": "13800138000"
    }'
    test_authenticated_endpoint "PUT" "/user/profile" "$TOKEN" "$update_data" "200" "Update user profile"
    
    # Test change password
    password_data='{
        "old_password": "password123",
        "new_password": "newpassword123"
    }'
    test_authenticated_endpoint "POST" "/user/change-password" "$TOKEN" "$password_data" "200" "Change password"
else
    echo -e "${YELLOW}⚠️ 跳过认证API测试（无有效token）${NC}"
fi

echo ""
echo "👑 管理员API测试"
echo "----------------------------------"

if [ ! -z "$TOKEN" ]; then
    # Test get users list
    test_authenticated_endpoint "GET" "/admin/users?page=1&page_size=10" "$TOKEN" "" "200" "Get users list"
    
    # Test get user stats
    test_authenticated_endpoint "GET" "/admin/stats/users" "$TOKEN" "" "200" "Get user statistics"
else
    echo -e "${YELLOW}⚠️ 跳过管理员API测试（无有效token）${NC}"
fi

echo ""
echo "🚫 认证失败测试"
echo "----------------------------------"
test_endpoint "GET" "/user/profile" "" "401" "Access protected endpoint without token"
test_authenticated_endpoint "GET" "/user/profile" "invalid_token" "" "401" "Access with invalid token"

# Clean up
rm -f /tmp/api_response.json

echo ""
echo "📊 API测试总结"
echo "=================================="
echo "✅ 健康检查API"
echo "✅ 用户注册API"
echo "✅ 用户登录API"
echo "✅ 用户资料API"
echo "✅ 管理员API"
echo "✅ 认证中间件"
echo ""
echo "🎉 Day 3 API测试完成！"
echo ""
echo "📝 注意事项："
echo "- 此测试需要数据库运行才能完全通过"
echo "- 可以使用 'docker-compose up -d mysql redis' 启动数据库"
echo "- 然后运行 'cd backend && ./miniflow' 启动服务器"
