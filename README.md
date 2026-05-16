# Kharcha — Personal Expense Tracker

AI-powered expense tracker with SMS parsing. Each user gets their own private account.

## Tech Stack
- **Next.js 14** — React framework
- **Supabase** — Auth + database (free tier)
- **Anthropic Claude** — AI SMS parsing
- **Vercel** — Hosting (free tier)

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project named `kharcha`, pick **Singapore** region
3. Once ready, go to **SQL Editor** and run:

```sql
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('income','expense')) not null,
  amount numeric not null,
  desc text not null,
  date date not null,
  category text not null,
  created_at timestamptz default now()
);

alter table transactions enable row level security;

create policy "Users can only see their own data"
on transactions for all
using (auth.uid() = user_id);
```

4. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

---

## Step 2 — Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key and copy it

---

## Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo `kharcha-app`
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `ANTHROPIC_API_KEY` = your Anthropic API key
4. Click **Deploy**

Your app will be live at `https://kharcha-app.vercel.app` (or similar)

---

## Running Locally (optional)

```bash
npm install
cp .env.local.example .env.local
# Fill in your keys in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features
- ✅ Email/password auth — each person has their own account
- ✅ Add income & expenses manually
- ✅ Paste any Indian bank/UPI SMS and AI extracts the transaction
- ✅ Dashboard with income, expense, balance summary
- ✅ Bar chart — weekly or monthly view
- ✅ Filter by this month / 3 months / 6 months / this year
- ✅ Delete transactions
- ✅ Mobile-friendly design
