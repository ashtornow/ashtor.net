# Auth Testing Playbook — ashtor.net

## Step 1: MongoDB verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
```
Verify: bcrypt hash starts with `$2b$`; unique index on users.email; index on login_attempts.identifier; unique index on linkedin_profiles.sub.

## Step 2: API testing
```
curl -c cookies.txt -X POST <API>/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@ashtor.net","password":"AshtorAdmin#2026"}'
curl -b cookies.txt <API>/api/auth/me
curl -b cookies.txt <API>/api/admin/leads
curl -b cookies.txt <API>/api/admin/social-connections
curl -b cookies.txt <API>/api/admin/linkedin-profiles
curl -X POST -b cookies.txt <API>/api/auth/logout
```
Login returns user object and sets access_token + refresh_token httpOnly cookies. /auth/me returns the admin. Admin endpoints return lists. After logout, /auth/me returns 401.

## Step 3: negative cases
- Wrong password → 401 "Invalid credentials"
- 5 failed attempts → 429 lockout (15 min)
- /api/admin/leads without cookie → 401
- /api/auth/linkedin/me without session → 401
- /api/auth/linkedin/start without credentials configured → 503

## Step 4: LinkedIn OIDC (once LINKEDIN_CLIENT_ID/SECRET set)
1. Open landing, click Connect LinkedIn → redirects to linkedin.com/oauth/v2/authorization with scope=openid profile email
2. Approve consent → callback → redirect to /?linkedin=connected
3. GET /api/auth/linkedin/me (credentials: include) returns profile with name/picture
4. linkedin_profiles collection has one doc keyed by sub, no access tokens stored
