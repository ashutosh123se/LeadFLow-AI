# Supabase Setup Instructions for LeadLFlowAI

Follow these steps to set up your Supabase database and prepare it for use with Prisma:

## 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project** and select your organization.
3. Set your project details:
   - **Name**: `LeadLFlowAI`
   - **Password**: Generate a secure database password and save it in a safe place.
   - **Region**: Select **Southeast Asia (Singapore)** or **Mumbai (ap-south-1)** if available, to ensure lowest latency for users in India.
4. Click **Create new project** and wait for provisioning to complete.

## 2. Obtain Connection Strings
1. Once your project is ready, navigate to **Settings** (gear icon) -> **Database**.
2. Scroll down to **Connection String** section and select **URI**.
3. Copy the **Session mode** connection string (typically port `6543`).
   - Example: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Use this as your `DATABASE_URL` in your backend `.env`. Make sure to replace `[password]` with your database password.
4. Copy the **Direct connection** connection string (typically port `5432`).
   - Example: `postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres`
   - Use this as your `DIRECT_URL` in your backend `.env`. Make sure to replace `[password]` with your database password.

> [!IMPORTANT]
> The pooled URL (DATABASE_URL) must have `?pgbouncer=true` appended to it, and direct URL (DIRECT_URL) must NOT have any pgbouncer parameters.

## 3. Configure Row Level Security (RLS)
1. Go to the **Database** -> **Tables** section in the Supabase Dashboard.
2. Ensure Row Level Security (RLS) is enabled on all tables that Prisma will create.
3. While Prisma handles the multi-tenancy logical isolation via `organizationId` filters on all queries, enabling RLS adds a critical second layer of protection at the database level.

## 4. Run Initial Migrations
1. Fill in the `.env` file in the `backend/` directory with your database connection strings.
2. Run migrations from your terminal:
   ```bash
   npx prisma migrate deploy
   ```
   *Note: Always use DIRECT_URL (port 5432) for running migrations. Never run migrations through the pooled URL (port 6543).*

## 5. Enable Database Backups
1. Go to **Settings** -> **Database** in the Supabase Dashboard.
2. Scroll to the **Backups** section.
3. By default, Supabase provides automatic daily backups. For high-reliability production applications, you can enable Point-in-Time Recovery (PITR) to allow database restoration to any specific second.

## 6. Verify Table Structures
1. Go to **Table Editor** in the Supabase Dashboard.
2. Check that all schemas and tables (`Organization`, `User`, `Lead`, `Call`, `WhatsappMessage`, etc.) are fully created and populated with appropriate columns.
