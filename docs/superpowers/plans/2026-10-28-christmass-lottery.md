# Christmass Lottery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Secret-Santa Next.js app in `christmass-lottery/` that stores users, groups and draws in a WP Engine WordPress site via a custom plugin, and emails via Gmail API.

**Architecture:** A WordPress plugin (`christmass-lottery/wp-plugin/christmass-lottery-api/`) exposes a private REST namespace `cl/v1` (admin-only, called with an application password). The Next.js server is the only client: server actions call WP, keep a signed cookie session, and send email through Gmail. The draw runs inside the plugin's join endpoint under a MySQL lock.

**Tech Stack:** Next 16, React 19, TypeScript, Tailwind 4, `jose`, `googleapis`, Vitest; PHP 8 WordPress plugin, tested with plain PHP CLI scripts.

**Spec:** `docs/superpowers/specs/2026-10-28-christmass-lottery-design.md`

## Global Constraints

- App lives in `christmass-lottery/` at repo root; mirror `next-app/` config: `next@16.2.6`, `react@19.2.4`, `react-dom@19.2.4`, Tailwind 4 via `@tailwindcss/postcss`, `engines.node: "26.12.0"`, scripts `dev`, `build`, `start`, `wpe-build: "next build"`, `test: "vitest run"`, tsconfig path alias `@/*`.
- Next 16 has breaking changes: read the relevant guide in `christmass-lottery/node_modules/next/dist/docs/` before writing server actions, cookies, redirects, or proxy/middleware code. Copy `next-app/AGENTS.md` + `CLAUDE.md` into `christmass-lottery/`.
- Browsers never call WordPress. All WP calls are server-side with Basic auth `WP_APP_USER:WP_APP_PASSWORD` against `${WP_URL}/wp-json/cl/v1`.
- Env vars (all in `christmass-lottery/.env.example`): `WP_URL`, `WP_APP_USER`, `WP_APP_PASSWORD`, `SESSION_SECRET`, `APP_URL`, `OWNER_EMAIL` (default `tomasz.abratowski@gmail.com`), `MAIL_FROM` (default `tomasz.abratowski@gmail.com`), `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.
- Capacity: integer, even, `>= 2`, `<= 100` (upper bound is builder's call), validated in both Next and plugin.
- Login: 3–30 chars `[A-Za-z0-9_.-]`; password: `>= 8` chars; email: basic `x@y.z`.
- Password reset never reveals whether an email exists: always "If that account exists, we've sent an email."
- No endpoint ever returns more than the caller's own assignment.

## REST contract (`cl/v1`, all routes `permission_callback` = `current_user_can('manage_options')`)

Errors use WP's `WP_Error` shape `{code, message, data:{status}}`.

| Method & route | Body / query | Success | Errors |
|---|---|---|---|
| `POST /users` | `{login,email,password}` | 201 `User` | 400 `invalid_input`, 409 `login_taken` / `email_taken` |
| `POST /auth` | `{login,password}` (login or email) | 200 `User` | 401 `invalid_credentials` |
| `POST /password-reset` | `{email}` | 200 `{login,key}` | 404 `not_found` |
| `POST /password-reset/confirm` | `{login,key,password}` | 200 `{ok:true}` | 400 `invalid_key` / `invalid_input` |
| `GET /groups` | `?user_id=N` | 200 `Group[]` (newest first) | — |
| `POST /groups` | `{name,capacity}` | 201 `Group` (with `user_id` absent → `isMember:false`) | 400 `invalid_input` |
| `POST /groups/{id}/join` | `{user_id}` | 200 `Group` | 404 `not_found`, 409 `group_full` / `already_member` / `group_drawn` |
| `GET /groups/{id}/assignment` | `?user_id=N` | 200 `{groupName, receiverLogin}` | 404 `not_found` / `not_member` / `not_drawn` |

`User = {id:number, login:string, email:string}`
`Group = {id:number, name:string, capacity:number, memberCount:number, status:"open"|"drawn", drawnAt:string|null, isMember:boolean}`

## Review Focus

1. Two people take the last seat at the same moment → group never exceeds capacity, draw runs exactly once (lock in Task 2; pure join logic tested in Task 1).
2. Owner email typed with different case/whitespace in env or registration (`" Tomasz.Abratowski@Gmail.com "`) → still recognised as owner (test in Task 3).
3. Forgot-password with an unknown email → same success message, no email, no error (wp client returns `null` on 404, tested in Task 4).
4. Clicking Draw on a group you're not in, or before it's drawn → friendly message, no crash (wp client returns `null`, tested in Task 4; UI in Task 7).
5. Capacity inputs `"4.5"`, `"-2"`, `"abc"`, `""`, `"3"`, `"102"` → rejected with a message (Task 3); Polish characters/emoji in group name and login in email subject → arrive intact (Task 5).

---

### Task 1: Draw and join logic (pure PHP)

**Files:**
- Create: `christmass-lottery/wp-plugin/christmass-lottery-api/includes/draw.php`
- Test: `christmass-lottery/wp-plugin/tests/draw-test.php`

**Interfaces:**
- Produces:
  - `cl_draw(array $member_ids): array` — map `giver_id => receiver_id`.
  - `cl_apply_join(array $state, int $user_id): array` — `$state = ['capacity'=>int,'member_ids'=>int[],'status'=>'open'|'drawn','assignments'=>array,'drawn_at'=>?string]`; returns `['state'=>array,'error'=>?string]` where error ∈ `group_full|already_member|group_drawn|null`. When the join fills the group it sets `status='drawn'`, `assignments=cl_draw(...)`, `drawn_at=gmdate('c')`.
- No WordPress functions in this file (pure, CLI-testable).

- [ ] **Step 1: Write failing tests** — a plain PHP script with a tiny `check($cond, $msg)` helper that exits 1 on failure:
  - `cl_draw([1,2,3,4])` run 500 times: keys and values are each exactly `{1,2,3,4}`, no `k === v`, and following the map from 1 visits all 4 before returning to 1.
  - `cl_draw([7,9])` → `[7=>9, 9=>7]`.
  - Over 500 runs of `cl_draw([1,2,3,4])`, more than one distinct result appears.
  - `cl_apply_join` with capacity 4, members `[1,2]`, join 3 → no error, status `open`, members `[1,2,3]`.
  - join 1 again → `already_member`; capacity 2 members `[1,2]` status `drawn`, join 3 → `group_drawn`; status `open` but members already at capacity → `group_full`.
  - capacity 4, members `[1,2,3]`, join 4 → status `drawn`, 4 assignments, `drawn_at` non-null.
- [ ] **Step 2: Run** `php christmass-lottery/wp-plugin/tests/draw-test.php` → fails (missing file).
- [ ] **Step 3: Implement** — shuffle with Fisher–Yates using `random_int`, then `i → (i+1) % n`.
- [ ] **Step 4: Run** the test → prints `OK`, exit 0.
- [ ] **Step 5: Commit** `feat(lottery): pure draw and join logic for WP plugin`

### Task 2: WordPress plugin — CPT, REST routes, locking

**Files:**
- Create: `christmass-lottery/wp-plugin/christmass-lottery-api/christmass-lottery-api.php` (plugin header, requires includes, hooks)
- Create: `christmass-lottery/wp-plugin/christmass-lottery-api/includes/rest-users.php`
- Create: `christmass-lottery/wp-plugin/christmass-lottery-api/includes/rest-groups.php`
- Create: `christmass-lottery/wp-plugin/README.md` (install: zip folder → Plugins → Upload; create application password for an admin user)

**Interfaces:**
- Consumes: `cl_apply_join`, `cl_draw` from Task 1.
- Produces: the REST contract table above, exactly.

Details:
- Register CPT `cl_group` (`public=>false, show_ui=>true, supports=>['title']`); meta keys `capacity`, `member_ids`, `status`, `drawn_at`, `assignments`.
- `/users`: `wp_insert_user` role `subscriber`; map `existing_user_login` → 409 `login_taken`, `existing_user_email` → 409 `email_taken`; validate login/email/password per Global Constraints.
- `/auth`: `wp_authenticate($login, $password)`.
- `/password-reset`: `get_user_by('email')` → `get_password_reset_key($user)`. `/confirm`: `check_password_reset_key($key,$login)` then `reset_password`.
- `/groups/{id}/join`: `$wpdb->get_var("SELECT GET_LOCK('cl_group_{$id}', 10)")`; if not `1` → 503 `busy`. Inside `try`: `wp_cache_delete($id,'post_meta')`, read state, `cl_apply_join`, persist meta; `finally` `RELEASE_LOCK`.
- `/assignment`: return `receiverLogin` = `get_userdata($assignments[$user_id])->user_login`.

- [ ] **Step 1: Write the plugin files.**
- [ ] **Step 2: Lint** `for f in $(find christmass-lottery/wp-plugin -name '*.php'); do php -l "$f"; done` → `No syntax errors detected` for each.
- [ ] **Step 3: Re-run** Task 1 test → `OK`.
- [ ] **Step 4: Commit** `feat(lottery): WordPress REST plugin for users, groups and draws`

(No live WP in this environment; end-to-end checks happen in Task 8's manual checklist.)

### Task 3: Scaffold Next app + validation + owner check

**Files:**
- Create: `christmass-lottery/{package.json,tsconfig.json,next.config.ts,postcss.config.mjs,vitest.config.ts,.gitignore,.env.example,AGENTS.md,CLAUDE.md}`
- Create: `christmass-lottery/app/{layout.tsx,globals.css,page.tsx}`
- Create: `christmass-lottery/lib/validation.ts`, `christmass-lottery/lib/owner.ts`
- Test: `christmass-lottery/lib/validation.test.ts`, `christmass-lottery/lib/owner.test.ts`

**Interfaces:**
- Produces:
  - `type Result<T> = {ok:true; value:T} | {ok:false; error:string}`
  - `validateCapacity(input: unknown): Result<number>`
  - `validateRegistration(input:{login:string; email:string; password:string}): Result<{login:string; email:string; password:string}>` (trims login/email, lowercases email)
  - `validatePassword(pw: string): Result<string>`
  - `isOwner(email: string | undefined | null): boolean` — trimmed, case-insensitive vs `process.env.OWNER_EMAIL ?? "tomasz.abratowski@gmail.com"`.
- `app/page.tsx`: for now always redirect to `/register`; Task 6 adds the session check.

- [ ] **Step 1: Scaffold** files and `npm install` (deps: next, react, react-dom, jose, googleapis; dev: typescript, @types/*, tailwindcss, @tailwindcss/postcss, vitest).
- [ ] **Step 2: Failing tests:** `validateCapacity` accepts `"4"`, `4`, `"100"`; rejects `"4.5"`, `"-2"`, `"abc"`, `""`, `"3"`, `"0"`, `"102"`. `validateRegistration` rejects login `"ab"`, `"a b"`, email `"x"`, password `"short"`; accepts and normalises `{login:" santa ", email:" A@B.CO ", password:"12345678"}` → `{login:"santa", email:"a@b.co"}`. `isOwner(" Tomasz.Abratowski@Gmail.com ")` true; `isOwner("x@y.z")`, `isOwner(undefined)` false; respects `OWNER_EMAIL` override.
- [ ] **Step 3: Run** `cd christmass-lottery && npm test` → fails.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** `npm test` → pass; `npx tsc --noEmit` → clean.
- [ ] **Step 6: Commit** `feat(lottery): scaffold Next app with validation and owner check`

### Task 4: WordPress client

**Files:**
- Create: `christmass-lottery/lib/wp.ts`, `christmass-lottery/lib/types.ts`
- Test: `christmass-lottery/lib/wp.test.ts` (mock `global.fetch` with `vi.fn`)

**Interfaces:**
- Produces (`import "server-only"` in wp.ts; types `User`, `Group` in types.ts per contract):
  - `class WpError extends Error { code: string; status: number }`
  - `registerUser(i:{login,email,password}): Promise<User>`
  - `verifyCredentials(login: string, password: string): Promise<User | null>` (401 → null)
  - `createResetKey(email: string): Promise<{login:string; key:string} | null>` (404 → null)
  - `resetPassword(login: string, key: string, password: string): Promise<void>`
  - `listGroups(userId: number): Promise<Group[]>`
  - `createGroup(name: string, capacity: number): Promise<Group>`
  - `joinGroup(groupId: number, userId: number): Promise<Group>`
  - `getAssignment(groupId: number, userId: number): Promise<{groupName:string; receiverLogin:string} | null>` (404 → null)
  - All other non-2xx → throw `WpError` with WP's `code`. All requests `cache: "no-store"`.

- [ ] **Step 1: Failing tests:** sends `Authorization: Basic base64(user:pass)` to `${WP_URL}/wp-json/cl/v1/auth`; `verifyCredentials` → null on 401; `createResetKey` → null on 404; `getAssignment` → null on 404; `joinGroup` 409 `{code:"group_full"}` → rejects with `WpError` `code==="group_full"`; `listGroups(5)` requests `/groups?user_id=5`.
- [ ] **Step 2: Run** `npm test -- wp` → fails.
- [ ] **Step 3: Implement** one private `wpFetch(path, init)` helper.
- [ ] **Step 4: Run** → pass.
- [ ] **Step 5: Commit** `feat(lottery): typed WordPress REST client`

### Task 5: Session and Gmail mailer

**Files:**
- Create: `christmass-lottery/lib/session.ts`, `christmass-lottery/lib/mail.ts`
- Create: `christmass-lottery/scripts/get-refresh-token.mjs`
- Test: `christmass-lottery/lib/mail.test.ts`, `christmass-lottery/lib/session.test.ts`

**Interfaces:**
- Produces:
  - `type Session = {id:number; login:string; email:string}`
  - `signSession(s: Session): Promise<string>` / `verifySession(token: string): Promise<Session | null>` (jose HS256, `SESSION_SECRET`, 30d expiry)
  - `createSession(s: Session): Promise<void>`, `getSession(): Promise<Session | null>`, `destroySession(): Promise<void>` — cookie `cl_session`, httpOnly, sameSite `lax`, secure in production.
  - `buildRawMessage(m:{from:string; to:string; subject:string; text:string}): string` — RFC 2822, `Content-Type: text/plain; charset=UTF-8`, subject `=?UTF-8?B?…?=`, body base64 with `Content-Transfer-Encoding: base64`, whole message base64url.
  - `sendMail(m:{to:string; subject:string; text:string}): Promise<void>` — `googleapis` OAuth2 client with refresh token, `gmail.users.messages.send({userId:"me", requestBody:{raw}})`, from `MAIL_FROM`.
- `scripts/get-refresh-token.mjs`: reads `GMAIL_CLIENT_ID`/`SECRET`, prints consent URL (scope `https://www.googleapis.com/auth/gmail.send`, `access_type=offline`, `prompt=consent`, redirect `http://localhost:3999/callback`), listens on 3999, exchanges code, prints refresh token.

- [ ] **Step 1: Failing tests:** `verifySession(await signSession(s))` deep-equals `s`; tampered token → null. Decoding `buildRawMessage({…subject:"Losowanie 🎄 Święta", text:"Kupujesz prezent dla Łukasz"})` yields headers `To:`/`From:` and decoded subject/body equal to inputs.
- [ ] **Step 2: Run** → fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → pass.
- [ ] **Step 5: Commit** `feat(lottery): cookie session and Gmail mailer`

### Task 6: Auth pages

**Files:**
- Create: `christmass-lottery/app/actions/auth.ts` (`"use server"`)
- Create: `christmass-lottery/app/register/page.tsx`, `app/login/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/components/AuthForm.tsx` (client, `useActionState`)
- Modify: `christmass-lottery/app/page.tsx` (session-based redirect)

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces server actions, each `(prev: FormState, formData: FormData) => Promise<FormState>` with `type FormState = {error?: string; message?: string}`:
  - `registerAction` → validate, `registerUser`, `createSession`, redirect `/groups`. `login_taken`/`email_taken` → "That login/email is already registered."
  - `loginAction` → `verifyCredentials`; null → "Wrong login or password."; else session + redirect `/groups`.
  - `logoutAction()` → destroy, redirect `/login`.
  - `forgotPasswordAction` → `createResetKey`; if found, `sendMail` with `${APP_URL}/reset-password?login=…&key=…` (URL-encoded); always returns message "If that account exists, we've sent an email."
  - `resetPasswordAction` → `validatePassword`, `resetPassword`; `invalid_key` → "This reset link is invalid or expired."; success → redirect `/login?reset=1`.
- `/register` is the first screen (links to login); logged-in users visiting auth pages go to `/groups`.

- [ ] **Step 1: Implement** pages and actions (read Next 16 docs on server actions/`redirect`/`cookies()` first).
- [ ] **Step 2: Verify** `npx tsc --noEmit` clean, `npm test` pass, `npm run build` succeeds (with dummy env vars).
- [ ] **Step 3: Commit** `feat(lottery): register, login and password reset`

### Task 7: Groups page — list, create, join, draw

**Files:**
- Create: `christmass-lottery/app/groups/page.tsx` (server component; redirect `/login` if no session)
- Create: `christmass-lottery/app/actions/groups.ts`
- Create: `christmass-lottery/app/groups/CreateGroupForm.tsx`, `app/groups/DrawButton.tsx` (client)

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces:
  - `createGroupAction(prev: FormState, fd: FormData): Promise<FormState>` — rejects unless `isOwner(session.email)`; `validateCapacity`; name trimmed non-empty; `revalidatePath("/groups")`.
  - `joinGroupAction(groupId: number): Promise<FormState>` — maps `group_full` → "This group is already full.", `already_member` → "You're already in this group.", `group_drawn` → "This group has already been drawn."
  - `drawAction(groupId: number): Promise<{error?: string; receiverLogin?: string}>` — `getAssignment`; null → "Your group hasn't been drawn yet or you're not a member."; else `sendMail` to session email, subject `"Christmass Lottery: your draw in <groupName>"`, text `"You are buying a present for <receiverLogin>."`; returns `receiverLogin`. If mail fails, still return the receiver plus `error: "Couldn't send the email, but here's your draw."`
- Page shows: header with login + logout; owner-only create form; each group with name, `memberCount/capacity`, status, `drawnAt` (local date) and one button: **Join** (open, not member), "Waiting for N more" (open, member), **Draw** (drawn, member), nothing otherwise.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** `npx tsc --noEmit`, `npm test`, `npm run build` all pass.
- [ ] **Step 3: Commit** `feat(lottery): groups list, owner group creation, join and draw`

### Task 8: Docs and final check

**Files:**
- Create: `christmass-lottery/README.md` — setup: install plugin, create WP application password, env vars, `node scripts/get-refresh-token.mjs`, `npm run dev`; manual end-to-end checklist: register 4 users → owner creates group capacity 4 → all join → status drawn → each Draw shows a different person, never themselves → email received → forgot-password email link resets password.

- [ ] **Step 1: Write README.**
- [ ] **Step 2: Run** `php christmass-lottery/wp-plugin/tests/draw-test.php && cd christmass-lottery && npm test && npx tsc --noEmit && npm run build` → all succeed.
- [ ] **Step 3: Commit** `docs(lottery): setup and manual test guide`
