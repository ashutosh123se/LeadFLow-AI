# Backend Setup Guide — What You Need to Run LeadFlow-AI

## ✅ Step 1 — Prisma Client (Already Done)
`npx prisma generate` has been run successfully. The Prisma Client is ready.

---

## 🔴 Step 2 — Supabase Database (REQUIRED to start)

1. Go to **https://supabase.com** → Create a new project
   - Name: `leadflowai`
   - Region: **South Asia (Mumbai / ap-south-1)**
   - Set a strong database password

2. After project is ready, go to:
   **Project Settings → Database → Connection String**

3. Copy both connection strings into `backend/.env`:

```env
# Pooled URL (runtime queries) — port 6543
DATABASE_URL=postgresql://postgres.YOURREF:YOURPASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5

# Direct URL (migrations only) — port 5432
DIRECT_URL=postgresql://postgres.YOURREF:YOURPASSWORD@db.YOURREF.supabase.co:5432/postgres
```

4. Then run migrations to create all tables:
```bash
cd backend
npx prisma migrate deploy
```

---

## 🟡 Step 3 — Redis (REQUIRED for call queues)

Redis is used for Bull job queues (outbound calls, WhatsApp, email).

### Option A — Docker (easiest, already configured)
```bash
# From root of the project
docker-compose up -d
```
This starts Redis on port 6379 automatically. Your `.env` is already set:
```env
REDIS_URL=redis://localhost:6379
```

### Option B — Upstash Redis (cloud, free tier)
1. Go to **https://upstash.com** → Create Redis database
2. Copy the Redis URL:
```env
REDIS_URL=rediss://default:PASSWORD@global-grateful-xxx.upstash.io:6379
```

---

## 🟡 Step 4 — JWT Secrets (REQUIRED for auth)

Replace these placeholders in `backend/.env` with real random secrets (min 32 chars):

```env
JWT_ACCESS_SECRET=your-super-secret-32-char-minimum-string-here
JWT_REFRESH_SECRET=another-different-32-char-secret-string-here
```

Generate them with this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🟢 Step 5 — OpenAI (AI qualification scoring)

1. Go to **https://platform.openai.com/api-keys**
2. Create a new API key
3. Add to `.env`:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
```
> Needed for: GPT-4o lead scoring after calls + dialog turns during live call

---

## 🟢 Step 6 — Exotel (Outbound calling)

1. Sign up at **https://exotel.com** → Get API credentials
2. Get your: API Key, API Token, Subdomain, Virtual Number (Caller ID)
3. Add to `.env`:
```env
EXOTEL_API_KEY=your-key
EXOTEL_API_TOKEN=your-token
EXOTEL_SUBDOMAIN=api.exotel.com
EXOTEL_CALLER_ID=08XXXXXXXXX
EXOTEL_APP_ID=your-app-id
```
> Needed for: Triggering outbound AI qualifier calls to leads

---

## 🟢 Step 7 — Sarvam AI (Voice synthesis — Hindi TTS)

1. Sign up at **https://www.sarvam.ai** → Get API key
2. Add to `.env`:
```env
SARVAM_API_KEY=your-sarvam-api-key
SARVAM_API_URL=https://api.sarvam.ai
```
> Needed for: Natural Hindi/English voice generation during calls

---

## 🟢 Step 8 — Deepgram (Speech-to-text transcription)

1. Sign up at **https://deepgram.com** → Create API key (free $200 credit)
2. Add to `.env`:
```env
DEEPGRAM_API_KEY=your-deepgram-key
```
> Needed for: Transcribing customer speech during live calls

---

## 🔵 Step 9 — WhatsApp Business API (optional for MVP)

1. Go to **https://developers.facebook.com** → Create a Meta App
2. Add WhatsApp product → Get Phone Number ID and permanent System User token
3. Add to `.env`:
```env
WHATSAPP_TOKEN=your-system-user-access-token
WHATSAPP_VERIFY_TOKEN=any-custom-string-you-choose
```

---

## 🔵 Step 10 — Razorpay (optional for MVP)

1. Sign up at **https://razorpay.com** → Activate account
2. Go to **Settings → API Keys** → Generate keys
3. Add to `.env`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

---

## 🔵 Step 11 — SendGrid (optional for MVP)

1. Sign up at **https://sendgrid.com** → Create API key with Mail Send permission
2. Add to `.env`:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=LeadFlow-AI
```

---

## 🚀 Running the Backend

Once Steps 2, 3, 4 are complete (Supabase + Redis + JWT), you can start:

```bash
# Terminal 1 — Start Redis (if using Docker)
docker-compose up -d

# Terminal 2 — Run database migrations
cd backend
npx prisma migrate deploy

# Terminal 3 — Start API server (with hot-reload)
cd backend
npm run dev

# Terminal 4 (optional) — Start background queue workers
cd backend
npm run worker
```

The backend will be available at: **http://localhost:5000**
The frontend at: **http://localhost:3000**

---

## ⚡ Minimum Viable Setup (to test login/register/dashboard)

You only need these to test the full auth and dashboard flow:

| # | What | Where |
|:--|:-----|:-------|
| 1 | Supabase DB (free tier) | supabase.com |
| 2 | Redis (Docker or Upstash free) | docker-compose up -d |
| 3 | JWT secrets (any random string) | `backend/.env` |
| 4 | OpenAI key | platform.openai.com |

Everything else (Exotel, Sarvam, Deepgram, WhatsApp, Razorpay) is only needed when you test the actual AI calling and WhatsApp features.
