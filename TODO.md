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

## Phase 3 — Profile Preferences

- [ ] **Preferences model — backend**: Add user preference storage (global + topic-specific)
  - Suggested entities: `user_preferences`, optional `user_topic_preferences`
  - Store likes/dislikes/constraints (genres, languages, year range, etc.)
- [ ] **Preferences API — backend**:
  - `GET /profile/preferences`
  - `PUT /profile/preferences`
- [ ] **Preferences page — frontend**: Create custom preferences page for each user
  - Editable chips/tags/selectors for preferred and excluded options
  - Topic-aware sections (movies/games/books/events)

---

## Phase 4 — Session Lifecycle & Invites

- [x] **Session model — backend**: DB tables for `sessions`, `session_participants`, `session_invites`
  - Include `topic` (movie, game, book, event, custom)
  - Include lifecycle state: `lobby`, `active`, `matched`, `closed`
- [x] **Session API — backend**:
  - `POST /sessions` (create session with selected topic)
  - `GET /sessions/mine`
  - `GET /sessions/{id}`
  - `POST /sessions/{id}/invite`
  - `GET /sessions/invites/mine`
  - `POST /sessions/invites/{invite_id}/respond` (accept/decline)
  - `POST /sessions/{id}/start`
- [x] **Session creation UI — frontend**: Topic-first flow (choose topic, then invite friends)
- [x] **Session lobby UI — frontend**: Lobby page with create session, invite, incoming invites, and start button

---

## Phase 5 — Collaborative Swiping & Match Consensus

- [x] **Topic catalog providers — backend (V1 seed)**: Seed cards by session topic for movies/games/books/events/custom
- [x] **Swipe vote API — backend (V1)**:
  - `GET /sessions/{id}/current-card`
  - `POST /sessions/{id}/swipe` with `left` (reject) or `right` (confirm)
  - Ensure each participant can vote once per card
- [x] **Swipe interface — frontend (V1)**: Card-by-card left/right interaction on dedicated session room page
- [x] **Consensus rule — backend (V1)**: Mark match when all participants vote right; otherwise advance to next card
- [ ] **Post-match decision vote — backend/frontend**:
  - After a match, session enters decision step: `end` or `keep going`
  - If all users vote to continue, resume swiping with next items
  - If majority or configured rule votes end, close the session

---

## Phase 6 — Real-Time Session Sync

- [ ] **WebSocket server**: Broadcast swipes, match announcements, and end/continue vote updates
- [ ] **Redis integration**: Store volatile live session state (current card, per-card votes, connected users)
- [ ] **Frontend real-time client**: Live updates so all participants see progress instantly

---

## Phase 7 — Chat

- [ ] **Chat — backend**: Message model, `GET /sessions/{id}/chat`, WS broadcast for chat
- [ ] **Chat — frontend**: In-session chat panel alongside the swipe interface

---

## Phase 8 — Polish & Enhancements

- [ ] **Notifications**: Session invite notifications, match alerts
- [ ] **Profile UX polish**: Avatar + clearer preference summary
- [ ] **Recommendation tuning**: Improve ranking quality using saved preferences + session behavior
- [ ] **Analytics dashboard**: Trends, most-voted categories/items per user

---

## Notes

- Backend runs with: `cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload`
- Frontend runs with: `cd client && npm run dev`
- bcrypt must stay pinned at `4.0.1` — passlib 1.7.4 is incompatible with 5.0.0
- Supabase pooler host: `aws-1-ap-northeast-1.pooler.supabase.com:6543`
- **Next immediate step:** Start Phase 5 — swipe flow + vote recording + consensus logic (then return to Phase 3 preferences page)
