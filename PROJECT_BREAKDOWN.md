# Seedling Backend - Comprehensive Project Breakdown

## 🎯 Project Overview

**Seedling** is a competition platform where founders can submit entries to competitions, get judged by industry experts, and win prizes. The platform handles payments via Stripe, file uploads via AWS S3, and sends email notifications via SendGrid.

**Tech Stack:**
- **Backend Framework:** FastAPI (Python 3.11)
- **Database:** SQLite (local) / PostgreSQL (production via asyncpg)
- **ORM:** SQLAlchemy 2.0 with async/await
- **Migrations:** Alembic
- **Authentication:** JWT tokens (OAuth2 password flow)
- **Payment Processing:** Stripe (subscriptions, payouts, Connect for judge payouts)
- **File Storage:** AWS S3 (competition images, submission videos, user avatars)
- **Email Service:** SendGrid
- **Deployment:** Railway (with Nixpacks builder)

---

## 📁 Project Structure

```
seedling-backend/
├── app/                          # Main application code
│   ├── api/                      # API layer
│   │   └── routes/              # API endpoint routers
│   │       ├── admin.py         # Admin-only endpoints (manage competitions, judging)
│   │       ├── auth.py          # Login, password reset
│   │       ├── competitions.py  # CRUD for competitions, leaderboards
│   │       ├── connect_accounts.py  # Stripe Connect onboarding
│   │       ├── health.py        # Health check endpoint
│   │       ├── judging.py       # Judge assignment, scoring, feedback
│   │       ├── payments.py      # Stripe payment intents, webhooks
│   │       ├── submissions.py   # Create/update submissions, upload videos
│   │       └── users.py         # User profile, avatar upload, bank accounts
│   │
│   ├── core/                    # Core services
│   │   ├── s3_service.py       # AWS S3 upload/presigned URLs
│   │   ├── security.py         # JWT creation/validation, password hashing
│   │   └── stripe_service.py   # Stripe API wrapper
│   │
│   ├── models/                  # SQLAlchemy database models
│   │   ├── competition.py      # Competition (status, prize pool, deadlines)
│   │   ├── judge_assignment.py # Judge-to-submission assignments
│   │   ├── password_reset_token.py  # Password reset tokens
│   │   ├── payment.py          # Payment records (Stripe payment intents)
│   │   ├── submission.py       # Submission (video, status, scores, placement)
│   │   ├── user.py             # User (role: founder/judge/admin, Stripe IDs)
│   │   └── user_bank_account.py  # User bank account for payouts
│   │
│   ├── schemas/                 # Pydantic request/response models
│   │   ├── admin.py            # Admin schemas (create competition, assign judges)
│   │   ├── auth.py             # Login, password reset
│   │   ├── bank_account.py     # Bank account schemas
│   │   ├── competition.py      # Competition create/update/response
│   │   ├── connect_account.py  # Stripe Connect schemas
│   │   ├── judging.py          # Judge scoring, feedback
│   │   ├── submission.py       # Submission create/update/response
│   │   ├── token.py            # JWT token schemas
│   │   └── user.py             # User registration, profile update
│   │
│   ├── services/                # Business logic services
│   │   └── email_service.py    # SendGrid email sending (welcome, reset password)
│   │
│   ├── config.py                # Environment variable configuration (Pydantic Settings)
│   ├── database.py              # SQLAlchemy async engine, session factory
│   └── main.py                  # FastAPI app creation, CORS, router registration
│
├── alembic/                     # Database migrations
│   ├── versions/                # Migration files (managed by Alembic)
│   └── env.py                   # Alembic configuration
│
├── frontend/                    # Next.js 14 frontend (separate codebase)
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   ├── lib/                     # API client, auth utilities
│   └── ...
│
├── scripts/                     # Utility scripts
│
├── .env                         # Local environment variables (not committed)
├── .env.example                 # Template for environment variables
├── alembic.ini                  # Alembic configuration file
├── requirements.txt             # Python dependencies
├── runtime.txt                  # Python version for Railway (python-3.11)
├── railway.json                 # Railway deployment config
├── nixpacks.toml                # Nixpacks system dependencies (Pillow)
├── Procfile                     # Railway start command (backup)
├── PRODUCTION_DEPLOYMENT.md     # Production deployment guide
└── PRODUCTION_TEST_RESULTS.md   # Production testing results
```

---

## 🗄️ Database Models (SQLAlchemy)

### **User** (`app/models/user.py`)
- **Purpose:** User accounts (founders, judges, admins)
- **Key Fields:**
  - `id`, `email`, `username`, `hashed_password`
  - `role`: `FOUNDER` (default), `JUDGE`, or `ADMIN`
  - `stripe_customer_id`: Stripe customer for payments
  - `stripe_connect_account_id`: Stripe Connect for receiving payouts (judges)
  - `avatar_url`: S3 key for profile picture
  - `is_active`: Account status
- **Relationships:**
  - `competitions` (created competitions)
  - `submissions` (user's submissions)
  - `judge_assignments` (assigned judging tasks)

### **Competition** (`app/models/competition.py`)
- **Purpose:** Competitions that founders can enter
- **Key Fields:**
  - `id`, `title`, `description`, `domain`
  - `entry_fee`, `prize_pool`, `platform_fee_percentage`
  - `max_entries`, `current_entries`
  - `deadline`, `open_date`, `judging_sla_days`
  - `status`: `DRAFT`, `UPCOMING`, `ACTIVE`, `CLOSED`, `JUDGING`, `COMPLETE`
  - `image_key`, `image_url`: S3 image for competition card
  - `creator_id`: Foreign key to User
- **Relationships:**
  - `creator` (User who created it)
  - `submissions` (all submissions)

### **Submission** (`app/models/submission.py`)
- **Purpose:** User's entry to a competition
- **Key Fields:**
  - `id`, `title`, `description`, `video_url` (S3 key)
  - `status`: `DRAFT`, `PENDING_PAYMENT`, `SUBMITTED`, `UNDER_REVIEW`, `NOT_SELECTED`, `SELECTED`
  - `payment_status`: `PENDING`, `PAID`, `REFUNDED`
  - `final_score`, `human_scores_average`, `num_judges_assigned`, `num_judges_completed`
  - `judging_complete`: Boolean
  - `placement`: Winner rank (1st, 2nd, 3rd, etc.)
  - `user_id`, `competition_id`: Foreign keys
- **Relationships:**
  - `user`, `competition`
  - `judge_assignments` (judges assigned to score)
  - `payment` (Stripe payment record)

### **JudgeAssignment** (`app/models/judge_assignment.py`)
- **Purpose:** Assign judges to submissions
- **Key Fields:**
  - `id`, `judge_id`, `submission_id`
  - `status`: `PENDING`, `IN_PROGRESS`, `COMPLETED`
  - `score`: 0-100
  - `feedback`: JSON (structured feedback from judge)
  - `assigned_at`, `completed_at`
- **Relationships:**
  - `judge` (User with role=JUDGE)
  - `submission` (Submission being judged)

### **Payment** (`app/models/payment.py`)
- **Purpose:** Track Stripe payments for submissions
- **Key Fields:**
  - `id`, `submission_id`, `user_id`
  - `stripe_payment_intent_id`
  - `amount`, `currency`, `status`
  - `created_at`, `updated_at`
- **Relationships:**
  - `submission`, `user`

### **UserBankAccount** (`app/models/user_bank_account.py`)
- **Purpose:** Store user bank account info for payouts
- **Key Fields:**
  - `id`, `user_id`
  - `account_holder_name`, `routing_number`, `account_number` (encrypted)
  - `account_type`: `CHECKING` or `SAVINGS`
  - `is_verified`, `created_at`

### **PasswordResetToken** (`app/models/password_reset_token.py`)
- **Purpose:** Temporary tokens for password reset flow
- **Key Fields:**
  - `id`, `user_id`, `token`, `expires_at`, `used`

---

## 🔌 API Endpoints

### **Health** (`/health`)
- `GET /health` - Health check

### **Authentication** (`/api/v1/auth`)
- `POST /api/v1/auth/login` - Login with username/password, returns JWT
- `POST /api/v1/auth/register` - Create new user account
- `POST /api/v1/auth/forgot-password` - Request password reset email
- `POST /api/v1/auth/reset-password` - Reset password with token

### **Users** (`/api/v1/users`)
- `GET /api/v1/users/me` - Get current user profile (requires auth)
- `PATCH /api/v1/users/me` - Update current user profile
- `POST /api/v1/users/me/avatar` - Upload avatar image to S3
- `GET /api/v1/users/{user_id}` - Get public user profile
- `POST /api/v1/users/me/bank-account` - Add bank account for payouts
- `GET /api/v1/users/me/winnings` - Get user's prize winnings

### **Competitions** (`/api/v1/competitions`)
- `GET /api/v1/competitions/` - List competitions (with filters: status, domain)
- `GET /api/v1/competitions/{id}` - Get competition details
- `GET /api/v1/competitions/{id}/leaderboard` - Get competition leaderboard
- `GET /api/v1/competitions/{id}/results` - Get final results (winners)

### **Submissions** (`/api/v1/submissions`)
- `POST /api/v1/submissions/` - Create draft submission
- `GET /api/v1/submissions/{id}` - Get submission details
- `PATCH /api/v1/submissions/{id}` - Update submission
- `POST /api/v1/submissions/{id}/upload-video` - Upload video to S3
- `GET /api/v1/submissions/my-submissions` - Get user's submissions
- `POST /api/v1/submissions/{id}/submit` - Submit for judging (after payment)

### **Payments** (`/api/v1/payments`)
- `POST /api/v1/payments/create-payment-intent` - Create Stripe payment intent
- `GET /api/v1/payments/payment-status/{submission_id}` - Check payment status
- `POST /api/v1/payments/webhook` - Stripe webhook handler (payment confirmation)

### **Judging** (`/api/v1/judging`)
- `GET /api/v1/judging/my-assignments` - Get judge's assigned submissions
- `POST /api/v1/judging/{assignment_id}/score` - Submit score and feedback
- `GET /api/v1/judging/submissions/{submission_id}` - Get submission for judging

### **Admin** (`/api/v1/admin`)
- `POST /api/v1/admin/competitions` - Create new competition (admin only)
- `PATCH /api/v1/admin/competitions/{id}` - Update competition
- `POST /api/v1/admin/competitions/{id}/assign-judges` - Assign judges to submissions
- `POST /api/v1/admin/competitions/{id}/finalize` - Finalize competition (calculate winners)
- `POST /api/v1/admin/competitions/{id}/distribute-prizes` - Distribute prizes via Stripe

### **Connect Accounts** (`/api/v1/connect`)
- `POST /api/v1/connect/create-account` - Create Stripe Connect account (for judges)
- `GET /api/v1/connect/account-status` - Get Connect account status
- `POST /api/v1/connect/create-account-link` - Get Stripe Connect onboarding link

---

## 🔐 Authentication & Authorization

- **JWT Tokens:** Bearer token authentication
- **Password Hashing:** bcrypt via passlib
- **Token Expiry:** 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Role-Based Access Control:**
  - `FOUNDER`: Can create submissions, view leaderboards
  - `JUDGE`: Can score assigned submissions
  - `ADMIN`: Full access (create competitions, assign judges, distribute prizes)

**Protected Routes:** Most endpoints require `Authorization: Bearer <token>` header

---

## 💳 Payment Flow (Stripe Integration)

1. **User creates submission** → Status: `DRAFT`
2. **User clicks "Pay Now"** → Frontend calls `/api/v1/payments/create-payment-intent`
3. **Backend creates Stripe PaymentIntent** → Returns `client_secret`
4. **Frontend submits card** → Stripe processes payment
5. **Stripe webhook** → Backend receives `payment_intent.succeeded` event
6. **Backend updates submission** → Status: `SUBMITTED`, payment_status: `PAID`
7. **Admin finalizes competition** → Distributes prizes via Stripe Connect transfers

---

## 📧 Email Notifications (SendGrid)

Emails sent for:
- **Welcome email** on registration
- **Password reset** with token link
- **Submission confirmation** after payment
- **Judging assignment** notification to judges
- **Prize payout** notification to winners

---

## 🚀 Deployment (Railway)

### **Configuration Files:**
- `railway.json` - Build and start commands
- `runtime.txt` - Python 3.11
- `nixpacks.toml` - System dependencies (libjpeg, zlib, libpng for Pillow)
- `Procfile` - Backup start command

### **Start Command:**
```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### **Environment Variables (Railway Dashboard):**
```
DEBUG=false
SECRET_KEY=<generated-with-openssl-rand-hex-32>
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-provided by Railway
ALLOWED_ORIGINS=["https://tryseedling.live","https://www.tryseedling.live"]
FRONTEND_URL=https://tryseedling.live
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
AWS_S3_BUCKET=seedling-submissions-prod
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@tryseedling.live
```

### **Database Migrations:**
- **Schema management:** 100% Alembic (no `create_all`)
- **Migration command:** `alembic upgrade head` runs on every deploy
- **Migration files:** `alembic/versions/*.py`

---

## 🛠️ Development Setup

### **1. Install dependencies:**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### **2. Configure environment:**
```bash
cp .env.example .env
# Edit .env with your local values
```

### **3. Run database migrations:**
```bash
alembic upgrade head
```

### **4. Start development server:**
```bash
uvicorn app.main:app --reload
```

### **5. Access API docs:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 📝 Key Files Explained

### **app/main.py**
- Creates FastAPI app
- Configures CORS middleware
- Registers all API routers
- Lifespan manager calls `init_db()` on startup

### **app/database.py**
- Creates async SQLAlchemy engine
- Auto-converts `postgresql://` to `postgresql+asyncpg://` for Railway
- Async session factory
- `init_db()` function (now empty - schema managed by Alembic)

### **app/config.py**
- Pydantic Settings class
- Loads all environment variables
- Provides type hints and defaults
- Accessed via `get_settings()` singleton

### **app/core/security.py**
- `create_access_token()` - Generate JWT
- `verify_token()` - Validate JWT
- `get_password_hash()` - Hash passwords with bcrypt
- `verify_password()` - Check password against hash
- `get_current_user()` - FastAPI dependency for protected routes

### **app/core/s3_service.py**
- `upload_file_to_s3()` - Upload file to S3 bucket
- `generate_presigned_url()` - Generate temporary signed URLs
- `delete_file_from_s3()` - Delete file from S3

### **app/core/stripe_service.py**
- Stripe API wrapper
- Create payment intents, customers, Connect accounts
- Handle webhook signature verification

---

## 🔄 Recent Production Fixes

1. ✅ **Replaced psycopg2 with asyncpg** - Async PostgreSQL driver
2. ✅ **Auto-convert DATABASE_URL** - Railway compatibility
3. ✅ **Removed create_all** - Delegated to Alembic to prevent race conditions
4. ✅ **Added Pillow system dependencies** - nixpacks.toml for image processing
5. ✅ **Gated console.log statements** - Security (no tokens/keys in production logs)
6. ✅ **Fixed TypeScript build errors** - Frontend production readiness

---

## 📊 Database Schema Summary

```
users
├── id, email, username, hashed_password, role, is_active
├── stripe_customer_id, stripe_connect_account_id
└── avatar_url

competitions
├── id, title, description, domain, status
├── entry_fee, prize_pool, platform_fee_percentage
├── max_entries, current_entries
├── deadline, open_date, judging_sla_days
├── creator_id (FK → users)
└── image_key, image_url

submissions
├── id, title, description, video_url, status, payment_status
├── final_score, human_scores_average, judging_complete
├── placement, user_id (FK → users), competition_id (FK → competitions)

judge_assignments
├── id, judge_id (FK → users), submission_id (FK → submissions)
├── status, score, feedback (JSON)
└── assigned_at, completed_at

payments
├── id, submission_id (FK), user_id (FK)
├── stripe_payment_intent_id, amount, currency, status

user_bank_accounts
├── id, user_id (FK)
├── account_holder_name, routing_number, account_number
└── account_type, is_verified

password_reset_tokens
├── id, user_id (FK), token, expires_at, used
```

---

## 🐛 Common Issues & Solutions

### **Issue: Railway deployment fails with "duplicate index" error**
**Solution:** Removed `Base.metadata.create_all()`, delegated to Alembic migrations

### **Issue: PostgreSQL connection fails**
**Solution:** Added asyncpg driver, auto-convert `postgresql://` to `postgresql+asyncpg://`

### **Issue: Pillow build fails on Railway**
**Solution:** Added system dependencies in `nixpacks.toml` (libjpeg-dev, zlib1g-dev, libpng-dev)

### **Issue: CORS errors from frontend**
**Solution:** Verified `ALLOWED_ORIGINS` includes production domain in Railway environment variables

### **Issue: Stripe webhook signature verification fails**
**Solution:** Updated `STRIPE_WEBHOOK_SECRET` with production webhook secret from Stripe dashboard

---

## 📞 Contact & Resources

- **Repository:** https://github.com/jjnnsslimaye/seedling-backend
- **Frontend:** Located in `frontend/` directory (Next.js 14)
- **Documentation:** See `PRODUCTION_DEPLOYMENT.md` for detailed deployment guide
- **Test Results:** See `PRODUCTION_TEST_RESULTS.md` for production testing verification

---

*Last Updated: 2026-02-20*
