## Architecture

### Core Problem
Multi-channel reservation sync (Airbnb, Booking, Direct) with conflict detection.

### Solution
- **Data Layer:** Supabase (Postgres + RLS)
- **Sync Layer:** Webhook handlers for channel updates + iCal polling
- **Business Logic:** Conflict detection before reservation creation
- **API Layer:** Next.js App Router with typed routes
- **Frontend:** React with server components + client state

### Key Decisions
1. **Conflict detection (lib/domain/conflicts.ts)**
   - Checked at reservation POST time
   - Returns 409 Conflict if overlap detected
   - Prevents double-bookings across channels

2. **Webhook handling (app/api/webhooks/)**
   - Receives booking updates from Airbnb/Booking
   - Validates with HMAC signature
   - Triggers sync job if new booking detected

3. **RLS (Row-Level Security)**
   - Multi-tenant ready (property_id filtering)
   - Supabase auth handles permissions

### Trade-offs
- Single-monolith vs microservices: Monolith faster to ship, adequate for small property
- Supabase vs self-managed Postgres: Trade cost for ops simplicity