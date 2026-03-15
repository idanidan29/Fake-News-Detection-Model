# Collaborative Decision Platform — TODO

> Updated: 2026-03-15
> Always read `README.md` and this file at the start of every session.

---

## ✅ Completed

- [x] Landing page (`/`) — hero, feature cards, nav with signin/signup
- [x] Signup page (`/signup`) — styled form, connected to backend, redirects to dashboard
- [x] Signin page (`/signin`) — styled form, connected to backend, redirects to dashboard
- [x] Dashboard page (`/dashboard`) — protected route, token validated, logout button
- [x] FastAPI backend — register, login, me endpoints
- [x] Supabase PostgreSQL connection via pooler
- [x] JWT auth (create + decode)
- [x] bcrypt hashing (pinned to 4.0.1)
- [x] CORS open for all origins
- [x] Shared `apiRequest` helper with real error messages
- [x] Form reset null crash fixed
- [x] Root `.gitignore` protecting credentials

---

## Phase 2 — Social Layer

- [x] **Friends system — backend**: DB model + endpoints
  - `POST /friends/request`
  - `GET /friends`
  - `GET /friends/requests`
  - `POST /friends/{id}/accept`
  - `DELETE /friends/{id}`
- [x] **Friends system — frontend**: Friends page at `/friends` (send request, incoming requests, friends list)
- [x] **Dashboard**: Friends button added to dashboard header

---

## Phase 3 — Sessions

- [ ] **Session model — backend**: DB tables for `sessions`, `session_participants`, `items`; CRUD endpoints
  - `POST /sessions`
  - `GET /sessions/:id`
  - `POST /sessions/:id/invite`
- [ ] **Session creation — frontend**: "Create Session" page — pick category, set title, invite friends
- [ ] **Session lobby — frontend**: Waiting room while participants join; show who's in

---

## Phase 4 — Swipe / Voting Interface

- [ ] **Item fetching**: Integrate external API (e.g. TMDb for movies) to populate items per category
- [ ] **Preference submission — backend**: `POST /sessions/:id/vote` endpoint; track per-user votes; detect when all users agree
- [ ] **Swipe UI — frontend**: Tinder-style card swipe interface (accept / reject per item)
- [ ] **Match detection — backend**: Confirm item when all votes are "accept", mark session as resolved

---

## Phase 5 — Real-Time

- [ ] **WebSocket server**: Add WebSocket endpoint to FastAPI; broadcast vote updates and match events
- [ ] **Redis integration**: Store live session state (active users, current item, votes) in Redis
- [ ] **Frontend WebSocket client**: Hook into WS for live voting state, show others' actions in real time

---

## Phase 6 — Chat

- [ ] **Chat — backend**: Message model, `GET /sessions/:id/chat`, WS broadcast for chat
- [ ] **Chat — frontend**: In-session chat panel alongside the swipe interface

---

## Phase 7 — Polish & Enhancements

- [ ] **Notifications**: Session invite notifications, match alerts
- [ ] **User profile page**: Avatar, preference history, matched sessions
- [ ] **Recommendation engine**: Score items by aggregated user preference history
- [ ] **Analytics dashboard**: Trends, most-voted categories/items per user

---

## Notes

- Backend runs with: `cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload`
- Frontend runs with: `cd client && npm run dev`
- bcrypt must stay pinned at `4.0.1` — passlib 1.7.4 is incompatible with 5.0.0
- Supabase pooler host: `aws-1-ap-northeast-1.pooler.supabase.com:6543`
- **Next immediate step:** Start Phase 3 — sessions backend
