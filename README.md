# Brand Veda — Backend

A NestJS backend for a SaaS platform that tracks **brand visibility across AI assistants** — ChatGPT (GPT-4o), Perplexity AI, and Google Gemini. MVP is focused on **skincare brands**.

---

## How It Works

1. User completes an 8-step onboarding (brand info, category, competitors, target audience)
2. System auto-generates **18 prompts** across awareness, consideration, and decision stages
3. User confirms → background job fires **54 LLM calls** (18 prompts × 3 providers) in parallel
4. Responses are parsed for brand mentions, position, and sentiment
5. Four scores are calculated per provider and averaged into a combined score
6. Dashboard shows visibility trends, share of voice, and competitor comparisons
7. Weekly CRON re-runs analysis and emails a digest to active subscribers

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | NestJS 11 + TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Auth | Email/Password + JWT (15min access, 7-day refresh w/ rotation) |
| Queue | MongoDB-backed CRON via `@nestjs/schedule` (no Redis) |
| LLMs | OpenAI GPT-4o, Perplexity AI (sonar), Google Gemini 2.0 Flash |
| Payments | Stripe v20 |
| Email | Resend |

---

## Subscription Tiers

| Plan | Price | Brands | Runs/Month | Weekly Digest |
|---|---|---|---|---|
| Trial | Free (7 days) | 1 | 1 | No |
| Starter | $39/mo | 1 | 4 | Yes |
| Pro | $69/mo | 3 | 12 | Yes |

---

## Scoring Algorithm

Scores are calculated **per provider** then averaged into a combined score.

| Metric | Weight | How |
|---|---|---|
| Visibility | 40% | Brand mentions / total responses × 100 |
| Position | 30% | Ordinal ranking in response |
| Sentiment | 20% | Keyword analysis, −1→+1 scaled to 0–100 |
| Share of Voice | 10% | Brand mentions / (brand + competitor mentions) × 100 |

---

## API Endpoints

### Auth — `/auth`
```
POST /auth/signup
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Onboarding — `/onboarding` (JWT)
```
GET  /onboarding/status
POST /onboarding/step/brand-info
POST /onboarding/step/category
POST /onboarding/step/competitors
POST /onboarding/step/target
POST /onboarding/step/confirm      ← generates 18 prompts + queues analysis job
```

### Brands — `/brands` (JWT)
```
GET    /brands
GET    /brands/:id
PATCH  /brands/:id
DELETE /brands/:id
```

### Prompts — `/brands/:brandId/prompts` (JWT)
```
GET   /brands/:brandId/prompts
PATCH /brands/:brandId/prompts/:promptId
```

### Analysis — `/analysis` (JWT)
```
POST /analysis/run/:brandId
GET  /analysis/runs/:brandId
GET  /analysis/runs/:brandId/latest
```

### Dashboard — `/dashboard/:brandId` (JWT)
```
GET /dashboard/:brandId
GET /dashboard/:brandId/history
GET /dashboard/:brandId/competitors
```

### Subscriptions — `/subscriptions` (JWT)
```
GET  /subscriptions/me
POST /subscriptions/create-checkout
POST /subscriptions/portal
POST /subscriptions/webhook          ← Stripe webhook (no JWT, Stripe signature)
```

---

## Setup

### Prerequisites
- Node 24 (`nvm use 24`)
- MongoDB Atlas cluster
- API keys for OpenAI, Perplexity, Gemini
- Stripe account + webhook configured
- Resend account

### Install & run

```bash
npm install

# development
npm run start:dev

# production
npm run start:prod
```

### Environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `OPENAI_API_KEY` | OpenAI API key |
| `PERPLEXITY_API_KEY` | Perplexity API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `USE_OPENROUTER` | Route all LLM calls via OpenRouter (cheaper) |
| `OPENROUTER_API_KEY` | OpenRouter key (required if `USE_OPENROUTER=true`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | Stripe price ID for Starter plan |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for Pro plan |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | From address for outbound emails |

#### LLM cost control

Set `USE_OPENROUTER=true` to route all providers through OpenRouter using cheaper models (`gpt-4o-mini`, `gemini-2.0-flash-001`, `perplexity/sonar`) — roughly 10× cheaper than direct GPT-4o.

Individual providers can be disabled via `OPENAI_ENABLED`, `PERPLEXITY_ENABLED`, `GEMINI_ENABLED`.

Burst rate limits are configurable via `OPENAI_BURST_SIZE`, `PERPLEXITY_BURST_SIZE`, `GEMINI_BURST_SIZE` (default: 5 calls/batch with 1s delay between batches).

---

## Project Structure

```
src/
  auth/           JWT auth, signup/login/refresh/logout
  users/          User schema + service
  onboarding/     8-step onboarding flow
  brands/         Brand CRUD
  prompts/        18 auto-generated prompts per brand
  analysis/       Analysis run tracking + LLM job triggering
  llm/            OpenAI, Perplexity, Gemini adapters
  scoring/        Visibility, position, sentiment, SoV scoring
  dashboard/      Aggregated dashboard + history
  jobs/           MongoDB-backed CRON job processor
  subscriptions/  Stripe checkout, portal, webhook
  email/          Resend email service + weekly digest
  common/         Global exception filter, batch utilities
```
