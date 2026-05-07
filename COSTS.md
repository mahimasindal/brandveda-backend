# Brand Veda - Cost Discussion

## Summary
Launch is possible for near ₹0 upfront (beyond domain). All major costs scale with usage — you collect money before you spend it on AI and Stripe fees.

---

## Fixed / Predictable Costs

| Service | Cost | Notes |
|---------|------|-------|
| Domain | ₹1,300/year | Already sorted |
| Hosting | Free (credits) | See cloud credits section below |
| MongoDB Atlas | Free tier → $9–25/month | Free tier sufficient for MVP |
| Resend (Email) | Free up to 3,000 emails/month | More than enough early on |
| Perplexity API | ~$5–10 upfront credit load | No free tier, smallest cost |

---

## Transaction-Based Costs (only when users pay)

### Stripe Fees — 2.9% + 30¢ per charge
| Plan | Revenue | Stripe Fee | Net |
|------|---------|------------|-----|
| Starter $39 | $39 | ~$1.43 | ~$37.57 |
| Pro $69 | $69 | ~$2.30 | ~$66.70 |

### AI API Costs — Pay as you go
- ~54 LLM calls per analysis run (18 prompts × 3 providers)
- Estimated cost per run: **$1–3** across all 3 providers
- GPT-4o is most expensive, Gemini is cheapest

---

## Margin Check

| Plan | Revenue | Max AI Cost | Stripe Fee | ~Profit |
|------|---------|-------------|------------|---------|
| Starter $39 | $39 | $12 (4 runs × $3) | $1.43 | ~$25 |
| Pro $69 | $69 | $36 (12 runs × $3) | $2.30 | ~$30 |

Margins are healthy even at worst-case AI costs.

---

## Cloud Hosting Credits (Free Options)

| Provider | Credits | How to Get |
|----------|---------|------------|
| AWS Activate | Up to $5,000 | Apply via AWS Activate startup program |
| Google Cloud | $300 free | Auto on new account |
| Azure | $200 free | Auto on new account + startup programs |
| Railway | Free tier | Small apps, good for MVP |
| Render | Free tier | Small apps, good for MVP |

**Strategy:** Start on Railway/Render free tier for MVP. Once you have paying users, apply for AWS Activate or GCP startup credits — covers months of hosting for free.

---

## What You Actually Need to Pay Upfront

| Item | Cost |
|------|------|
| Domain | ₹1,300/year |
| Perplexity API credit | ~$5–10 (~₹420–840) |
| Everything else | ₹0 (free tiers + credits) |

**Total upfront: ~₹1,720–2,140**

---

## When Costs Start Scaling

Only after you have real users:
- Stripe fees kick in with first payment
- AI API costs kick in with first analysis run
- MongoDB upgrade needed around 500+ users
- Hosting upgrade needed when free tier is exhausted (apply for cloud credits by then)
