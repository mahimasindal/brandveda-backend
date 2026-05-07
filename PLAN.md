# Brand Veda Backend - Implementation Plan

## Project Overview
A NestJS backend for a SaaS tool that tracks brand visibility across **ChatGPT (GPT-4o)**, **Perplexity AI**, and **Google Gemini**. MVP is laser-focused on **skincare brands only**.

## Core Loop
8-step onboarding → 18 auto-generated prompts → user confirmation → background job fires 54 LLM calls → parse/score → dashboard

Weekly CRON re-runs analysis and emails digest.

---

## Confirmed Technical Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Queue | MongoDB-backed CRON (no Redis) | Zero extra infra for MVP |
| Auth | Email/Password + JWT (15min access, 7-day refresh w/ rotation) | Full control, no OAuth dependency |
| LLMs | OpenAI GPT-4o, Perplexity AI, Google Gemini 1.5 Pro | As specified |
| Payments | Stripe (Trial 7d, Starter $39/mo, Pro $69/mo) | Industry standard |
| Email | Resend (3k free/mo) | Cheapest for startup |

---

## Subscription Tiers

| Plan | Price | Brands | Runs/Month | Weekly Email | Competitor Deep Dive |
|------|-------|--------|------------|--------------|----------------------|
| Trial | Free (7 days) | 1 | 1 | No | No |
| Starter | $39/mo | 1 | 4 | Yes | No |
| Pro | $69/mo | 3 | 12 | Yes | Yes |

---

## MongoDB Schemas

1. **users** — Email, passwordHash, fullName, status, onboarding state
2. **refresh_tokens** — JWT refresh token storage with rotation
3. **brands** — User brands with competitors and category
4. **prompts** — 18 prompts per brand (6 per stage: awareness, consideration, decision)
5. **analysis_runs** — Analysis run tracking with status and LLM call counts
6. **llm_responses** — Raw LLM responses with mention detection, position, sentiment
7. **scores** — Visibility, position, sentiment, share of voice scores
8. **jobs** — MongoDB-backed job queue for CRON processing
9. **subscriptions** — Stripe integration data

---

## API Endpoints

### Auth (`/auth`)
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh` (with token rotation)
- `POST /auth/logout`

### Onboarding (`/onboarding`) — JWT protected
- `GET  /onboarding/status`
- `POST /onboarding/step/brand-info`
- `POST /onboarding/step/category`
- `POST /onboarding/step/competitors`
- `POST /onboarding/step/target`
- `POST /onboarding/step/confirm` (generates prompts + creates analysis job)

### Brands (`/brands`) — JWT protected
- `GET    /brands`
- `GET    /brands/:id`
- `PATCH  /brands/:id`
- `DELETE /brands/:id`

### Prompts (`/brands/:brandId/prompts`) — JWT protected
- `GET   /brands/:brandId/prompts` — list of 18 prompts
- `PATCH /brands/:brandId/prompts/:promptId` — edit individual prompt

### Analysis (`/analysis`) — JWT protected
- `POST /analysis/run/:brandId`
- `GET  /analysis/runs/:brandId`
- `GET  /analysis/runs/:brandId/latest`

### Dashboard (`/dashboard/:brandId`) — JWT protected
- `GET /dashboard/:brandId` — full dashboard data
- `GET /dashboard/:brandId/history` — score history
- `GET /dashboard/:brandId/competitors` — competitor share of voice

### Subscriptions (`/subscriptions`) — JWT protected
- `GET  /subscriptions/me`
- `POST /subscriptions/create-checkout`
- `POST /subscriptions/portal`
- `POST /subscriptions/webhook` (Stripe webhook — no JWT, Stripe signature)

---

## Skincare Prompt Template Bank (18 Prompts)

### Awareness Stage (6) — Brand discovery
1. Recommend skincare brands for [category]
2. Best brands in [category]
3. Dermatologist-recommended brands for [category]
4. Top-rated [category] brands right now
5. What brands do people trust for [category]?
6. Which [category] brands are most popular?

### Consideration Stage (6) — Evaluation with brand name
7. [Brand] vs [Competitor1] — which is better?
8. [Brand] vs [Competitor2] — pros and cons
9. Is [Brand] worth it for [category]?
10. What do people say about [Brand]?
11. [Brand] reviews — is it good?
12. How does [Brand] compare to others in [category]?

### Decision Stage (6) — Purchase intent
13. Should I buy [Brand] for [category]?
14. Best place to buy [Brand]
15. Is [Brand] still recommended in 2026?
16. [Brand] — is it legit?
17. What's the best [Brand] product for [category]?
18. Is [Brand] safe to use?

---

## Scoring Algorithm (per provider)

- **Visibility Score** (40%): (brand mentions / total responses) × 100
- **Position Score** (30%): based on ordinal ranking in responses
- **Sentiment Score** (20%): keyword analysis, converted from -1→+1 scale to 0–100
- **Share of Voice** (10%): brand mentions / (brand + competitor mentions) × 100
- **Overall Score**: (visibility × 0.40) + (position × 0.30) + (sentiment × 0.20) + (SoV × 0.10)

Scores are calculated per provider then averaged for a combined score.

---

## Build Phases

### Phase 1 — Project Foundation
- [ ] NestJS project scaffolding
- [ ] Environment config (`@nestjs/config`, `.env`)
- [ ] MongoDB connection (`@nestjs/mongoose`)
- [ ] Global validation pipe (`class-validator`, `class-transformer`)
- [ ] Global exception filter
- [ ] `AppModule` wiring

### Phase 2 — Auth + Users
- [ ] `User` schema + model
- [ ] `RefreshToken` schema + model
- [ ] `AuthModule` with JWT strategy
- [ ] Signup endpoint (hash password with bcrypt)
- [ ] Login endpoint (issue access + refresh token)
- [ ] Refresh endpoint (rotate refresh token)
- [ ] Logout endpoint (invalidate refresh token)
- [ ] JWT auth guard

### Phase 3 — Onboarding + Brands + Prompts
- [ ] `Brand` schema + model
- [ ] `Prompt` schema + model
- [ ] `BrandsModule` (CRUD)
- [ ] `PromptsModule` (list + edit)
- [ ] `OnboardingModule` with step-by-step endpoints
- [ ] Prompt generation logic (18 skincare templates)
- [ ] Onboarding confirm step (generate prompts, create job)

### Phase 4 — LLM Integration + Jobs
- [ ] `LlmModule` (OpenAI, Perplexity, Gemini adapters)
- [ ] `LlmResponse` schema + model
- [ ] `AnalysisRun` schema + model
- [ ] `Job` schema + model
- [ ] `AnalysisModule` (trigger + status endpoints)
- [ ] `JobsModule` with CRON processor (`@nestjs/schedule`)
- [ ] Mention detection logic (brand + competitor)
- [ ] Position + sentiment extraction

### Phase 5 — Scoring + Dashboard
- [ ] `Score` schema + model
- [ ] `ScoringModule` (calculate all 4 scores per provider)
- [ ] `DashboardModule` (aggregate data for frontend)
- [ ] Score history aggregation
- [ ] Competitor share of voice aggregation

### Phase 6 — Subscriptions + Email
- [ ] `Subscription` schema + model
- [ ] `StripeModule` (checkout, portal, webhook)
- [ ] Plan limits enforcement (runs per month, brand count)
- [ ] `EmailModule` with Resend
- [ ] Weekly digest CRON email
- [ ] Trial expiry CRON (downgrade after 7 days)

---

## Key Dependencies

```
@nestjs/common @nestjs/core @nestjs/platform-express
@nestjs/mongoose mongoose
@nestjs/jwt @nestjs/passport passport passport-jwt
@nestjs/config
@nestjs/schedule
openai
@google/generative-ai
stripe
resend
class-validator class-transformer
bcrypt
```

---

## Verification Checklist

- [ ] Signup → login → refresh → logout flow works
- [ ] Onboarding steps save correctly, confirm generates 18 prompts
- [ ] Analysis job created on confirm
- [ ] CRON picks up job and fires 54 LLM calls
- [ ] Mentions, position, sentiment parsed correctly
- [ ] Scores calculated and saved per provider
- [ ] Dashboard returns correct aggregated data
- [ ] Stripe checkout creates subscription, webhook updates DB
- [ ] Weekly CRON sends digest email to active subscribers
- [ ] Trial expiry CRON downgrades expired trials
