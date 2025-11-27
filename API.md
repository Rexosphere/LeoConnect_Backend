# LeoConnect Backend API Documentation

This document provides a comprehensive guide to the LeoConnect Backend API, built with Cloudflare Workers and Firestore.

## Base URL

The base URL depends on your Cloudflare Workers deployment. Locally, it is typically:
`http://localhost:8787`

## Authentication

Protected endpoints require a valid Firebase ID Token passed in the `Authorization` header.

**Header Format:**
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

## Endpoints

### 1. Health Check
Checks if the backend is running.

- **URL**: `/`
- **Method**: `GET`
- **Auth**: Public
- **Response**:
  ```json
  {
    "message": "LeoConnect Backend is running!"
  }
  ```

---

### 2. Google Authentication
Authenticates a user with a Google/Firebase ID token and returns the user profile.

- **URL**: `/auth/google`
- **Method**: `POST`
- **Auth**: Bearer Token required
- **Response**:
  ```json
  {
    "uid": "user123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://...",
    "leoId": "LEO123",
    "isWebmaster": false,
    "assignedClubId": "club456"
  }
  ```

---

### 3. Get Home Feed
Fetches the latest posts for the home feed.

- **URL**: `/feed`
- **Method**: `GET`
- **Auth**: Required
- **Query Params**:
  - `limit` (optional): Number of posts to return.
- **Response**:
  ```json
  {
    "posts": [
      {
        "postId": "post123",
        "clubId": "club456",
        "authorName": "John Doe",
        "authorLogo": "https://...",
        "content": "Hello world",
        "imageUrl": "https://...",
        "likesCount": 42,
        "isLikedByUser": false,
        "timestamp": "2023-10-27T10:00:00Z"
      }
    ]
  }
  ```

---

### 4. Create Post
Creates a new post.

- **URL**: `/posts`
- **Method**: `POST`
- **Auth**: Required
- **Body**:
  ```json
  {
    "content": "Hello, LeoConnect!",
    "imageBytes": "base64_encoded_image_string", // Optional
    "clubId": "club123" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "postId": "new_post_id",
    "clubId": "club123",
    "authorName": "John Doe",
    "authorLogo": "https://...",
    "content": "Hello, LeoConnect!",
    "imageUrl": "https://...",
    "likesCount": 0,
    "isLikedByUser": false
  }
  ```

---

### 5. Like Post
Likes a specific post.

- **URL**: `/posts/:id/like`
- **Method**: `POST`
- **Auth**: Required
- **URL Params**:
  - `id`: The ID of the post to like.
- **Response**:
  ```json
  {
    "message": "Liked post <id>",
    "likesCount": 1,
    "isLikedByUser": true
  }
  ```

---

### 6. Get Districts
Retrieves a list of available districts.

- **URL**: `/districts`
- **Method**: `GET`
- **Auth**: Public
- **Response**:
  ```json
  [
    "District 306 A1",
    "District 306 A2",
    "District 306 B1"
  ]
  ```

---

### 7. Get Clubs
Retrieves a list of clubs, optionally filtered by district.

- **URL**: `/clubs`
- **Method**: `GET`
- **Auth**: Public
- **Query Params**:
  - `district` (optional): Filter clubs by this district name.
- **Response**:
  ```json
  [
    {
      "clubId": "club123",
      "name": "Leo Club of Colombo",
      "district": "District 306 A1",
      "description": "We serve the community...",
      "president": "John Doe"
    }
  ]
  ```

## Data Models

### UserProfile
- `uid`: Firebase UID
- `email`: User email
- `displayName`: User display name
- `photoURL`: Profile picture URL
- `leoId`: Leo Club ID (optional)
- `isWebmaster`: Boolean indicating admin status
- `assignedClubId`: Club ID the user belongs to

### Post
- `postId`: Unique ID
- `clubId`: ID of the club
- `authorName`: Name of the author
- `authorLogo`: URL of author's logo
- `content`: Text content
- `imageUrl`: URL of the post image
- `likesCount`: Number of likes
- `isLikedByUser`: Boolean
- `timestamp`: ISO timestamp

### Club
- `clubId`: Unique ID
- `name`: Club name
- `district`: District name
- `description`: Club description
- `president`: President's name
