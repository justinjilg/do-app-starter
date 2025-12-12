# 📱 Mobile App API Integration Guide

Complete guide to connecting your mobile app to the API with authentication and data persistence.

## Overview

Your app provides a RESTful API that mobile apps can consume. This guide covers:
- **Authentication** (JWT tokens)
- **User management** (signup, login, profile)
- **Data persistence** (CRUD operations)
- **Security** (CORS, rate limiting, input validation)

## Architecture

```
Mobile App (iOS/Android/React Native)
    ↓ HTTPS
DigitalOcean App Platform
    ↓
Express API (Node.js)
    ↓
PostgreSQL Database
```

## Quick Start

### 1. Base URL

Your API will be available at:
```
Production: https://your-app-xxxxx.ondigitalocean.app
Local Dev:  http://localhost:8080
```

### 2. Authentication Flow

```
1. User signs up    → POST /api/auth/signup
2. Get JWT token    → POST /api/auth/login
3. Store token      → Mobile app secure storage
4. Make requests    → Include: Authorization: Bearer <token>
5. Refresh token    → POST /api/auth/refresh (when needed)
```

## API Endpoints

### Public Endpoints (No Auth Required)

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-12T21:00:00.000Z",
  "uptime": 12345.67
}
```

#### Database Health
```http
GET /health/db
```

#### User Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Protected Endpoints (Auth Required)

All requests must include JWT token in header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Get Current User Profile
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-12-12T21:00:00.000Z"
  }
}
```

#### Update User Profile
```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

#### Get User's Items
```http
GET /api/users/me/items
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "items": [
    {
      "id": 1,
      "name": "My Item",
      "description": "Item description",
      "user_id": 1,
      "created_at": "2025-12-12T21:00:00.000Z"
    }
  ]
}
```

#### Create Item
```http
POST /api/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Item",
  "description": "Item description",
  "metadata": {
    "color": "blue",
    "priority": "high"
  }
}
```

#### Update Item
```http
PUT /api/items/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Item",
  "description": "New description"
}
```

#### Delete Item
```http
DELETE /api/items/:id
Authorization: Bearer <token>
```

#### Upload File (with item)
```http
POST /api/items/:id/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary data>
```

## Mobile App Integration Examples

### React Native (Expo)

```javascript
// api.js
const API_URL = 'https://your-app-xxxxx.ondigitalocean.app';

// Store token in secure storage
import * as SecureStore from 'expo-secure-store';

async function saveToken(token) {
  await SecureStore.setItemAsync('auth_token', token);
}

async function getToken() {
  return await SecureStore.getItemAsync('auth_token');
}

// API Client
class ApiClient {
  async signup(email, password, name) {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    const data = await response.json();
    if (data.success) {
      await saveToken(data.token);
    }
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (data.success) {
      await saveToken(data.token);
    }
    return data;
  }

  async getProfile() {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  }

  async createItem(name, description) {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description })
    });
    return response.json();
  }

  async getMyItems() {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/users/me/items`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  }
}

export default new ApiClient();
```

### iOS (Swift)

```swift
// APIClient.swift
import Foundation

class APIClient {
    static let shared = APIClient()
    private let baseURL = "https://your-app-xxxxx.ondigitalocean.app"

    // Store token in Keychain
    private var token: String? {
        get { KeychainHelper.shared.get("auth_token") }
        set {
            if let token = newValue {
                KeychainHelper.shared.save(token, forKey: "auth_token")
            }
        }
    }

    func signup(email: String, password: String, name: String) async throws -> AuthResponse {
        let body = ["email": email, "password": password, "name": name]
        let response: AuthResponse = try await post("/api/auth/signup", body: body)
        token = response.token
        return response
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = ["email": email, "password": password]
        let response: AuthResponse = try await post("/api/auth/login", body: body)
        token = response.token
        return response
    }

    func getProfile() async throws -> User {
        let response: UserResponse = try await get("/api/users/me")
        return response.user
    }

    func createItem(name: String, description: String) async throws -> Item {
        let body = ["name": name, "description": description]
        let response: ItemResponse = try await post("/api/items", body: body)
        return response.item
    }

    // Generic request methods
    private func get<T: Decodable>(_ path: String) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + path)!)
        request.httpMethod = "GET"
        if let token = token {
            request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        var request = URLRequest(url: URL(string: baseURL + path)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = token {
            request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(T.self, from: data)
    }
}

struct AuthResponse: Codable {
    let success: Bool
    let token: String
    let user: User
}

struct User: Codable {
    let id: Int
    let email: String
    let name: String
}
```

### Android (Kotlin)

```kotlin
// ApiClient.kt
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class ApiClient(private val context: Context) {
    companion object {
        private const val BASE_URL = "https://your-app-xxxxx.ondigitalocean.app"
    }

    private val client = OkHttpClient()
    private val sharedPrefs = context.getSharedPreferences("auth", Context.MODE_PRIVATE)

    private var token: String?
        get() = sharedPrefs.getString("token", null)
        set(value) = sharedPrefs.edit().putString("token", value).apply()

    suspend fun signup(email: String, password: String, name: String): AuthResponse {
        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
            put("name", name)
        }

        val response = post("/api/auth/signup", json)
        val authResponse = parseAuthResponse(response)
        token = authResponse.token
        return authResponse
    }

    suspend fun login(email: String, password: String): AuthResponse {
        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
        }

        val response = post("/api/auth/login", json)
        val authResponse = parseAuthResponse(response)
        token = authResponse.token
        return authResponse
    }

    suspend fun getProfile(): User {
        val response = get("/api/users/me")
        return parseUserResponse(response)
    }

    suspend fun createItem(name: String, description: String): Item {
        val json = JSONObject().apply {
            put("name", name)
            put("description", description)
        }

        val response = post("/api/items", json)
        return parseItemResponse(response)
    }

    private suspend fun get(path: String): String {
        val request = Request.Builder()
            .url(BASE_URL + path)
            .apply {
                token?.let { header("Authorization", "Bearer $it") }
            }
            .build()

        return client.newCall(request).execute().use { response ->
            response.body?.string() ?: throw Exception("Empty response")
        }
    }

    private suspend fun post(path: String, json: JSONObject): String {
        val body = json.toString()
            .toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(BASE_URL + path)
            .post(body)
            .apply {
                token?.let { header("Authorization", "Bearer $it") }
            }
            .build()

        return client.newCall(request).execute().use { response ->
            response.body?.string() ?: throw Exception("Empty response")
        }
    }
}

data class AuthResponse(val success: Boolean, val token: String, val user: User)
data class User(val id: Int, val email: String, val name: String)
```

## Security Best Practices

### 1. Always Use HTTPS
```javascript
// Mobile app should reject HTTP connections
// iOS: Add App Transport Security settings
// Android: Use Network Security Configuration
```

### 2. Store Tokens Securely
- **iOS:** Keychain
- **Android:** EncryptedSharedPreferences
- **React Native:** expo-secure-store or react-native-keychain

### 3. Include Token in Headers
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 4. Handle Token Expiration
```javascript
// Check for 401 Unauthorized
if (response.status === 401) {
  // Clear token and redirect to login
  await clearToken();
  navigation.navigate('Login');
}
```

### 5. Implement Token Refresh
```javascript
async function refreshToken() {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oldToken}`
    }
  });

  const data = await response.json();
  await saveToken(data.token);
  return data.token;
}
```

## Testing Your API

### Using cURL

```bash
# Signup
curl -X POST https://your-app.ondigitalocean.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login and save token
TOKEN=$(curl -X POST https://your-app.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  | jq -r '.token')

# Get profile
curl https://your-app.ondigitalocean.app/api/users/me \
  -H "Authorization: Bearer $TOKEN"

# Create item
curl -X POST https://your-app.ondigitalocean.app/api/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item","description":"Created from cURL"}'
```

### Using Postman

1. **Import Collection:**
   - Create a new collection
   - Add environment variable: `base_url` = your app URL
   - Add environment variable: `token` (will be set automatically)

2. **Setup Tests (in Login request):**
   ```javascript
   pm.test("Login successful", function () {
       var jsonData = pm.response.json();
       pm.environment.set("token", jsonData.token);
   });
   ```

3. **Use Token in Requests:**
   - Authorization tab → Type: Bearer Token
   - Token: `{{token}}`

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email/password incorrect |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `INVALID_TOKEN` | 401 | JWT token invalid |
| `UNAUTHORIZED` | 403 | No permission for resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `SERVER_ERROR` | 500 | Internal server error |

## Rate Limiting

API is rate-limited to prevent abuse:
- **Public endpoints:** 100 requests/15 minutes per IP
- **Authenticated endpoints:** 1000 requests/15 minutes per user

Headers included in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1670877600
```

## Next Steps

1. **Add to your mobile app** - Use code examples above
2. **Test authentication** - Signup/login flow
3. **Implement data sync** - Create/read/update/delete items
4. **Add offline support** - Cache data locally, sync when online
5. **Push notifications** - Add FCM/APNS integration (separate guide)

## Resources

- Full API code: See `server-mobile.js` and `routes/` folder
- Database schema: `db/schema.sql`
- Postman collection: `postman_collection.json` (create this)
- API testing: Use the examples above
