# RUHIZ API Reference

Complete API documentation for the RUHIZ platform.

---

## 🔐 Authentication

All protected endpoints require authentication via Supabase session cookie.

**Headers:**
```
Cookie: sb-access-token=<token>
```

**Error Responses:**
```json
{ "error": "Unauthorized" } // 401
{ "error": "Not authorized" } // 403
```

---

## 📁 Projects

### List Projects
```http
GET /api/projects?status=OPEN&owner=me&cursor=<id>
```

**Query Parameters:**
- `status` (optional): Filter by project status
- `owner` (optional): `me` to filter user's own projects
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "projects": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "status": "OPEN",
      "timeline": "string",
      "maxMembers": 4,
      "memberCount": 2,
      "createdAt": "ISO8601",
      "skills": ["React", "Node.js"],
      "owner": {
        "id": "string",
        "name": "string",
        "image": "string",
        "university": "string",
        "uid": "string"
      }
    }
  ],
  "nextCursor": "string | null"
}
```

### Create Project
```http
POST /api/projects
```

**Body:**
```json
{
  "title": "string (required)",
  "problem": "string (required)",
  "description": "string (required)",
  "timeline": "string (optional)",
  "maxMembers": 4,
  "skills": ["React", "Node.js"]
}
```

**Response:**
```json
{
  "id": "string"
}
```

**Notes:**
- Auto-creates project group
- Creator becomes ADMIN
- Rolls back on group creation failure

### Get Project Details
```http
GET /api/projects/[projectId]
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "problem": "string",
  "description": "string",
  "status": "OPEN",
  "visibility": "PUBLIC",
  "timeline": "string",
  "maxMembers": 4,
  "ownerId": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "owner": { /* user object */ },
  "skills": ["React"],
  "members": [
    {
      "id": "string",
      "name": "string",
      "image": "string",
      "uid": "string",
      "role": "ADMIN"
    }
  ]
}
```

### Get Project Relationship
```http
GET /api/projects/[projectId]/relationship
```

**Response:**
```json
{
  "relationship": "OWNER | MEMBER | PENDING | REJECTED | NONE",
  "requestId": "string (optional)",
  "role": "ADMIN | MEMBER (optional)",
  "canRequest": true,
  "canAccess": false
}
```

**Use Cases:**
- Show correct button state on project detail page
- Determine if user can access workspace
- Check if user can request to join

---

## 👥 Project Members

### List Members
```http
GET /api/projects/[projectId]/members
```

**Authorization:** Project member or owner

**Response:**
```json
{
  "members": [
    {
      "id": "string",
      "userId": "string",
      "name": "string",
      "image": "string",
      "uid": "string",
      "university": "string",
      "bio": "string",
      "role": "ADMIN | MEMBER",
      "joinedAt": "ISO8601"
    }
  ]
}
```

### Change Member Role
```http
PATCH /api/projects/[projectId]/members/[userId]
```

**Authorization:** Project admin

**Body:**
```json
{
  "role": "ADMIN | MEMBER"
}
```

**Response:**
```json
{
  "success": true,
  "role": "ADMIN"
}
```

**Restrictions:**
- Cannot change own role
- Cannot change owner's role
- Creates notification for affected user

### Remove Member
```http
DELETE /api/projects/[projectId]/members/[userId]
```

**Authorization:** Project admin

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Removes from project
- Removes from group
- Cannot remove self (use leave instead)
- Cannot remove owner
- Cannot remove last admin
- Creates notification

---

## 🤝 Join Requests

### Submit Join Request
```http
POST /api/projects/[projectId]/join
```

**Body:**
```json
{
  "message": "string (optional, max 500 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "status": "PENDING"
}
```

**Validations:**
- Cannot join own project
- Project must be OPEN
- Cannot join if already member
- Project must not be full
- Can reapply after rejection

### List Join Requests (Admin)
```http
GET /api/projects/[projectId]/join
```

**Authorization:** Project admin

**Response:**
```json
[
  {
    "id": "string",
    "projectId": "string",
    "userId": "string",
    "message": "string",
    "status": "PENDING",
    "createdAt": "ISO8601",
    "user": {
      "id": "string",
      "name": "string",
      "image": "string",
      "uid": "string",
      "university": "string",
      "bio": "string"
    }
  }
]
```

### Approve/Reject Request
```http
PATCH /api/projects/[projectId]/join/[requestId]
```

**Authorization:** Project admin

**Body:**
```json
{
  "action": "ACCEPT | REJECT"
}
```

**Response:**
```json
{
  "success": true,
  "status": "ACCEPTED | REJECTED"
}
```

**On Approval:**
- Creates ProjectMember
- Adds to group
- Creates notification
- Checks capacity
- Rolls back on failure

**On Rejection:**
- Updates status
- Creates notification

---

## 📂 Files

### List Project Files
```http
GET /api/projects/[projectId]/files
```

**Authorization:** Project member

**Response:**
```json
{
  "files": [
    {
      "id": "string",
      "fileName": "string",
      "fileUrl": "string",
      "fileSize": 1024,
      "mimeType": "image/png",
      "uploadedBy": {
        "id": "string",
        "name": "string",
        "image": "string"
      },
      "createdAt": "ISO8601"
    }
  ]
}
```

### Upload File
```http
POST /api/upload
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File (required)
- `type`: `avatar | project | knowledge | marketplace | groupChat` (required)
- `entityId`: string (required for project/groupChat)

**Response:**
```json
{
  "id": "string",
  "url": "string",
  "fileName": "string",
  "size": 1024
}
```

**File Size Limits:**
- avatar: 2MB
- project: 10MB
- knowledge: 10MB
- marketplace: 5MB
- groupChat: 10MB

**Permission Checks:**
- `project`: Must be active member
- `groupChat`: Must be active participant with media permission
- `marketplace`: Must have seller role

### Delete File
```http
DELETE /api/files/[fileId]
```

**Authorization:** File owner or platform admin

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Deletes from GCS
- Deletes from database

---

## 🔔 Notifications

### List Notifications
```http
GET /api/notifications?unread=1&limit=30
```

**Query Parameters:**
- `unread` (optional): `1` to filter unread only
- `limit` (optional): Max 100, default 30

**Response:**
```json
{
  "unreadCount": 5,
  "notifications": [
    {
      "id": "string",
      "type": "PROJECT_JOIN_REQUEST_CREATED",
      "title": "string",
      "message": "string",
      "link": "/projects/123",
      "read": false,
      "actorId": "string",
      "entityType": "PROJECT",
      "entityId": "string",
      "createdAt": "ISO8601"
    }
  ]
}
```

**Notification Types:**
- `PROJECT_JOIN_REQUEST_CREATED`
- `PROJECT_JOIN_REQUEST_APPROVED`
- `PROJECT_JOIN_REQUEST_REJECTED`
- `PROJECT_MEMBER_REMOVED`
- `PROJECT_ROLE_CHANGED`

### Mark All as Read
```http
PATCH /api/notifications
```

**Response:**
```json
{
  "success": true
}
```

### Mark Single as Read
```http
PATCH /api/notifications/[id]
```

**Response:**
```json
{
  "success": true
}
```

### Delete Notification
```http
DELETE /api/notifications/[id]
```

**Response:**
```json
{
  "success": true
}
```

---

## 🚨 Reports

### Create Report
```http
POST /api/reports
```

**Body:**
```json
{
  "targetType": "USER | PROJECT | GROUP | MESSAGE | LISTING | RESOURCE | STARTUP | STUDY_GROUP",
  "targetId": "string",
  "reason": "string",
  "details": "string (optional)"
}
```

**Response:**
```json
{
  "id": "string"
}
```

**Validations:**
- Prevents duplicate reports
- User cannot report same target twice while report is OPEN or IN_REVIEW

### List Reports (Admin)
```http
GET /api/reports?status=OPEN&targetType=USER
```

**Authorization:** Platform admin or moderator

**Query Parameters:**
- `status` (optional): OPEN, IN_REVIEW, RESOLVED, DISMISSED
- `targetType` (optional): Filter by target type

**Response:**
```json
{
  "reports": [
    {
      "id": "string",
      "reporterId": "string",
      "targetType": "USER",
      "targetId": "string",
      "reason": "string",
      "details": "string",
      "status": "OPEN",
      "reviewedBy": "string",
      "reviewedAt": "ISO8601",
      "createdAt": "ISO8601",
      "reporter": {
        "id": "string",
        "name": "string",
        "image": "string",
        "uid": "string"
      }
    }
  ]
}
```

### Update Report Status (Admin)
```http
PATCH /api/reports/[reportId]
```

**Authorization:** Platform admin or moderator

**Body:**
```json
{
  "status": "IN_REVIEW | RESOLVED | DISMISSED"
}
```

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Creates audit log entry
- Sets reviewedBy and reviewedAt

---

## 👨‍💼 Admin - User Management

### List All Users (Admin)
```http
GET /api/admin/users
```

**Authorization:** Platform admin or moderator

**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "image": "string",
      "uid": "string",
      "platformRole": "USER",
      "marketplaceRole": "NONE",
      "marketplaceStatus": "DISABLED",
      "createdAt": "ISO8601"
    }
  ]
}
```

### Update User Roles (Admin)
```http
PATCH /api/admin/users/[userId]
```

**Authorization:** Platform admin or moderator

**Body:**
```json
{
  "platformRole": "USER | MODERATOR | ADMIN",
  "marketplaceRole": "NONE | BUYER | SELLER | VERIFIED_SELLER",
  "marketplaceStatus": "DISABLED | PENDING_REVIEW | ACTIVE | SUSPENDED"
}
```

**Response:**
```json
{
  "success": true
}
```

**Restrictions:**
- Cannot modify own admin status
- Creates audit log entry

---

## 🛍️ Marketplace

### List Listings
```http
GET /api/marketplace?category=BOOK&status=ACTIVE
```

**Authorization:** User with marketplace access

**Query Parameters:**
- `category` (optional): BOOK, GADGET, SERVICE
- `status` (optional): ACTIVE, SOLD, HIDDEN

**Response:**
```json
{
  "listings": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "price": 29.99,
      "category": "BOOK",
      "condition": "LIKE_NEW",
      "imageUrl": "string",
      "status": "ACTIVE",
      "sold": false,
      "createdAt": "ISO8601",
      "seller": {
        "id": "string",
        "name": "string",
        "image": "string"
      }
    }
  ]
}
```

### Create Listing
```http
POST /api/marketplace
```

**Authorization:** User with seller role

**Body:**
```json
{
  "title": "string",
  "description": "string",
  "price": 29.99,
  "category": "BOOK | GADGET | SERVICE",
  "condition": "NEW | LIKE_NEW | GOOD | FAIR",
  "imageUrl": "string"
}
```

**Response:**
```json
{
  "id": "string"
}
```

### Update Listing
```http
PATCH /api/marketplace/[id]
```

**Authorization:** Listing owner or admin

**Body:**
```json
{
  "title": "string",
  "description": "string",
  "price": 29.99,
  "status": "ACTIVE | SOLD | HIDDEN"
}
```

### Delete Listing
```http
DELETE /api/marketplace/[id]
```

**Authorization:** Listing owner or admin

---

## 💬 Groups

### Get Project Group
```http
GET /api/projects/[projectId]/group
```

**Authorization:** Active project member

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "type": "PROJECT",
  "entityId": "string",
  "createdBy": "string",
  "imageUrl": "string",
  "isAdmin": true,
  "createdAt": "ISO8601"
}
```

### List Group Messages
```http
GET /api/groups/[id]/messages?limit=50&before=<messageId>
```

**Authorization:** Active group participant

**Response:**
```json
{
  "messages": [
    {
      "id": "string",
      "content": "string",
      "senderId": "string",
      "messageType": "TEXT",
      "fileUrl": "string",
      "createdAt": "ISO8601",
      "sender": {
        "id": "string",
        "name": "string",
        "image": "string"
      }
    }
  ]
}
```

### Send Group Message
```http
POST /api/groups/[id]/messages
```

**Authorization:** Active group participant

**Body:**
```json
{
  "content": "string",
  "messageType": "TEXT | IMAGE | PDF | FILE",
  "fileUrl": "string (optional)"
}
```

---

## 📊 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Internal Server Error |

---

## 🔄 Common Patterns

### Pagination
```http
GET /api/projects?cursor=<lastItemId>
```

Response includes `nextCursor` for next page.

### Filtering
```http
GET /api/reports?status=OPEN&targetType=USER
```

Multiple query parameters for filtering.

### Permission Checks
All endpoints verify:
1. Authentication (requireAuth)
2. Resource ownership or membership
3. Role-based permissions

### Audit Logging
Admin actions automatically create audit logs:
- User role changes
- Report status updates
- Content moderation

---

## 🧪 Testing Examples

### cURL Examples

**Create Project:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=<token>" \
  -d '{
    "title": "My Project",
    "problem": "Problem statement",
    "description": "Detailed description",
    "skills": ["React", "Node.js"]
  }'
```

**Get Relationship:**
```bash
curl http://localhost:3000/api/projects/123/relationship \
  -H "Cookie: sb-access-token=<token>"
```

**Submit Join Request:**
```bash
curl -X POST http://localhost:3000/api/projects/123/join \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=<token>" \
  -d '{"message": "I would like to join"}'
```

---

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. All IDs are CUIDs (Collision-resistant Unique IDs)
3. File URLs are Google Cloud Storage URLs
4. Pagination uses cursor-based approach
5. Real-time updates use Supabase Realtime subscriptions

---

**Last Updated**: 2025
**API Version**: 1.0
**Base URL**: `http://localhost:3000` (development)
