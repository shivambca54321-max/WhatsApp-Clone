# Velo Chat - Enterprise-Grade Real-Time Messaging Platform

Velo is a production-ready, modern, real-time messaging application inspired by WhatsApp, Telegram, Discord, and iMessage. It features a custom glassmorphism design language, security hardening, multi-device session tracking, group administration controls, file attachment uploads, and WebRTC voice/video signaling.

---

## 🏗️ Monorepo Architecture

Velo is structured as an npm workspaces monorepo:

```text
WhatsApp/
├── client/                 # React, Vite, TS, Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/     # Modals, sidebars, video call panels, overlays
│   │   ├── context/        # Socket.io Client Provider
│   │   ├── pages/          # Login, Register, Verify Email, Forgot, Dashboard
│   │   ├── services/       # Axios API client with automatic token refreshing
│   │   └── store/          # Zustand global auth state management
├── server/                 # Express, MongoDB, Socket.io, TS Backend
│   ├── src/
│   │   ├── config/         # Mongoose & Multer configurations
│   │   ├── controllers/    # Domain service layers (Auth, User, Chat, Message)
│   │   ├── middleware/     # JWT Auth, Rate limiting, Zod validation, Error catchers
│   │   ├── models/         # Mongoose Schemas (User, Chat, Message, Story, Session, OTP)
│   │   ├── routes/         # HTTP Routing mounts
│   │   ├── socket/         # Socket.io handler (typing, presence, WebRTC signaling)
│   │   └── services/       # Nodemailer mail transport & local Multer file uploads
```

---

## ⚡ Setup & Launch Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or an Atlas URI connection string)

### 1. Environment Configurations
Create a `.env` file inside the `server/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/whatsapp-clone
JWT_ACCESS_SECRET=your_jwt_access_secret_super_secure_1234
JWT_REFRESH_SECRET=your_jwt_refresh_secret_super_secure_5678
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# SMTP Mail config (optional, falls back to printing codes in console log if empty)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@whatsapp-clone.com
```

### 2. Install Dependencies
Run the following at the root workspace directory to install all packages for both the client and server:
```bash
npm run install:all
```

### 3. Launch Development Mode
Run the orchestrator command at the root to start the backend and frontend concurrently:
```bash
npm run dev
```
- Frontend will run on: `http://localhost:5173`
- Backend will run on: `http://localhost:5000`

---

## 🔐 Core Security Implementation

1. **Password Hashing**: Passwords are salted using `bcrypt` (12 rounds) and are protected from leaks using Mongoose's `select: false` selector.
2. **Refresh Token Rotation (RTR)**: Upon requests to `/refresh`, the backend issues a brand new access and refresh token pair, invalidating the old refresh token. This prevents replay attacks if cookies are hijacked.
3. **HTTP-only Cookies**: Refresh tokens are stored in secure, `httpOnly`, `sameSite` cookies to prevent XSS-based reading.
4. **Input Validation**: Express inputs are sanitized and parsed through schema validators utilizing Zod.
5. **Rate Limiting**: Critical endpoints (such as auth and registrations) are capped at a maximum rate of 15 attempts per 15 minutes using `express-rate-limit`.

---

## 🚀 Key API Endpoints

### 🔑 Authentication (`/api/auth`)
- `POST /register`: Registers a new user; generates and logs/sends email OTP.
- `POST /verify-email`: Accepts email and OTP code. Activates account, signs JWT, and issues refresh token.
- `POST /login`: Standard credential check.
- `POST /logout`: Clears session tracking in DB and wipes HTTP cookie.
- `POST /refresh`: Uses refresh cookie to rotate tokens.
- `GET /me`: Returns logged-in user profile.

### 👤 Users & Contacts (`/api/users`)
- `PATCH /profile`: Edits user profile metadata.
- `POST /profile/avatar`: Uploads and sets user avatar (Multer-ready).
- `GET /search?query=xxx`: Searches users by username/email.
- `GET /contacts`: Returns contact lists, favorites, and blocked profiles.
- `POST /contacts`: Adds user to contact directory.

### 💬 Conversations & Groups (`/api/chats`)
- `POST /`: Checks or establishes a 1-to-1 conversation room.
- `GET /`: Lists all active conversations with latest messages and unread counts.
- `POST /group`: Creates group chat with multiple contacts and promotes creator to admin.
- `PATCH /group/add`: Adds contact (Group admin only).
- `PATCH /group/remove`: Removes member (Group admin only or self-leave).
- `PATCH /group/promote`: Promotes member to admin.

---

## 📡 Socket.io Events

- `setup`: Client handshake confirmation.
- `join-chat` / `leave-chat`: Joins/leaves a conversation channel room.
- `typing` / `stop-typing`: Broadcasts typing state to members.
- `message-received`: Emitted when new messages are stored in DB.
- `message-edited` / `message-deleted`: Syncs modifications/deletions.
- `reaction-updated`: Syncs quick reactions.
- `call-user` / `answer-call` / `ice-candidate` / `end-call`: WebRTC signaling.
