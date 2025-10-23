#!/bin/bash

# Simple API Test for MiniFlow

echo "🧪 MiniFlow 简单API测试"
echo "========================"

BASE_URL="http://localhost:8080"

echo "1. 健康检查..."
curl -s $BASE_URL/health | jq .

echo -e "\n2. 用户注册..."
curl -s -X POST -H "Content-Type: application/json" \
     -d '{"username":"apitest","password":"test123","display_name":"API Test User","email":"apitest@example.com"}' \
     $BASE_URL/api/v1/auth/register | jq .

echo -e "\n3. 用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
     -d '{"username":"apitest","password":"test123"}' \
     $BASE_URL/api/v1/auth/login)

echo "$LOGIN_RESPONSE" | jq .

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
echo -e "\n提取的Token: ${TOKEN:0:50}..."

echo -e "\n4. 获取用户资料（需要认证）..."
curl -s -H "Authorization: Bearer $TOKEN" \
     $BASE_URL/api/v1/user/profile | jq .

echo -e "\n5. 更新用户资料..."
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"display_name":"Updated API Test User","phone":"13800138000"}' \
     $BASE_URL/api/v1/user/profile | jq .

echo -e "\n6. 获取用户列表（管理员接口）..."
curl -s -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/v1/admin/users?page=1&page_size=5" | jq .

echo -e "\n7. 测试无认证访问保护接口..."
curl -s $BASE_URL/api/v1/user/profile | jq .

echo -e "\n✅ API测试完成！"
