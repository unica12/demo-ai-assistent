# Telegram AI Assistant (Lead Qualification)

Production-ready Telegram assistant built with Node.js, TypeScript, Telegraf, OpenAI, PostgreSQL (Prisma), and Redis. Designed for sales-oriented lead qualification, contact capture, and manager notifications.

## Architecture Decisions

- **Clean architecture**: domain logic (leads, AI, services) is separated from infrastructure (database, Redis, Telegram). This keeps the bot maintainable and testable.
- **Prisma + PostgreSQL**: structured lead data, conversations, and message history are stored relationally for auditability and analytics.
- **Redis**: used for rate limiting to protect the bot from spam and accidental floods without adding latency to database writes.
- **AI response schema**: the OpenAI response is validated with Zod to avoid malformed responses and keep business logic deterministic.
- **Config-first**: system prompt, model, temperature, and manager chat ID are controlled via env vars, enabling fast iteration without code changes.

## Folder Structure

```
src/
 ├── ai/            # OpenAI client + response parsing
 ├── bot/           # Telegram bot setup & handlers
 ├── config/        # Environment + system prompt
 ├── database/      # Prisma + Redis clients
 ├── leads/         # Lead collection flow
 ├── middlewares/   # Error handling + rate limiting
 ├── services/      # Shared business services
 ├── types/         # Shared TS types & schemas
 └── utils/         # Logger utilities
```

## Core Features

- AI-driven Telegram replies with conversation context.
- Lead qualification flow that requests **name**, **phone**, and **service needed**.
- Hot lead and lead-captured notifications sent to the manager.
- Rate limiting via Redis.
- PostgreSQL persistence for users, conversations, messages, and leads.

## Prerequisites

- Node.js 20+
- Docker (optional for local services)
- PostgreSQL + Redis (local or cloud)

## Quick Start (Local)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in required values.

3. **Start PostgreSQL + Redis (optional via Docker)**
   ```bash
   docker compose up -d postgres redis
   ```

4. **Run migrations**
   ```bash
   npm run prisma:generate
   npx prisma migrate dev --name init
   ```

5. **Start the bot**
   ```bash
   npm run dev
   ```

## Running with Docker Compose

```bash
docker compose up --build
```

## Deployment Notes

### Railway / Render / Fly.io

- Use a **PostgreSQL** add-on and a **Redis** instance.
- Set env vars from `.env.example`.
- Run migrations on deploy:
  ```bash
  npm run prisma:migrate
  ```
- Ensure `TELEGRAM_BOT_TOKEN` and `OPENAI_API_KEY` are set.

## Configuration

| Variable | Purpose |
| --- | --- |
| TELEGRAM_BOT_TOKEN | Bot token from BotFather |
| OPENAI_API_KEY | OpenAI API key |
| OPENAI_MODEL | Model name (default: `gpt-4o-mini`) |
| OPENAI_TEMPERATURE | Response temperature |
| MANAGER_CHAT_ID | Telegram chat ID for notifications |
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis connection string |
| SYSTEM_PROMPT_OVERRIDE | Override system prompt (optional) |
| RATE_LIMIT_WINDOW_SECONDS | Rate limit window size |
| RATE_LIMIT_MAX_REQUESTS | Allowed requests per window |

## Security Notes

- Sensitive values are only stored in env vars.
- AI responses are schema validated (Zod) to prevent malformed control data.
- Rate limiting protects against abuse and repeated prompt injection attempts.

## Scripts

- `npm run dev` - Run in development mode
- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled app
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run DB migrations
