# Christmass Lottery — Design

## Intent

A small Secret-Santa-style web app. People register, join a group, and once the
group is full the system secretly assigns each member one other member to buy a
present for. Each person can reveal (and receive by email) only their own
assignment. The owner (Tomasz) creates the groups.

## Goals

- Next.js app in `christmass-lottery/` (repo root), headless: all persistent data
  lives in a WP Engine WordPress site.
- Registration with login, email, password. Login. Password reset by email link.
- Owner creates groups with a name and a required capacity (must be even, >= 2).
- Users see a list of open groups and pick one to join.
- When the last seat is filled, the draw happens automatically (no one clicks
  anything) and is stored in WordPress with the draw date.
- A logged-in user in a drawn group clicks **Draw** → their assignment is shown
  and emailed to them.
- All email is sent from `tomasz.abratowski@gmail.com` via Gmail SMTP with an app password.

## Non-goals

- Wishlists, chat, exclusions (e.g. couples not drawing each other), budgets.
- Leaving a group after joining (the owner can remove members from open groups).

## Added later: owner group management

Owner-only `/groups/manage`: list members, rename, resize open groups (even,
>= headcount; shrinking to headcount runs the draw), remove members from open
groups, redraw drawn groups (new draw date, no automatic emails), delete groups.
All state changes run under the per-group lock. Assignments stay hidden from
everyone, including the owner.

## Anti-goals

- Anyone (including the owner via the app UI) seeing someone else's assignment.
- A person drawing themselves, or two people drawing the same person.
- A draw that can get stuck or run twice for the same group.
- Passwords stored or handled by our own crypto — WordPress does that.

## Constraints

- WordPress is a **clean install** on WP Engine; we may add our own plugin.
- Next.js app follows existing repo conventions (see `next-app/`): Next 16,
  React 19, TypeScript, Material UI (MUI v9, Polish UI text), `engines.node: 26.12.0`, a `wpe-build`
  script (WP Engine headless platform).
- Email credentials come from env var `GMAIL_APP_PASSWORD` (Gmail app password
  for the sender account). The owner only has a Google API key, which Gmail
  does not accept for sending, so SMTP replaced the Gmail API.

## Decided how

### WordPress side — custom plugin `christmass-lottery-api`

Shipped in `christmass-lottery/wp-plugin/` and uploaded by the owner.

- **Users** = WordPress users with the `subscriber` role. WP hashes passwords and
  issues reset keys (`get_password_reset_key` / `check_password_reset_key` /
  `reset_password`).
- **Groups** = custom post type `cl_group` (not public), meta: `capacity` (int),
  `member_ids` (array of user IDs), `status` (`open` | `drawn`), `drawn_at`
  (ISO datetime).
- **Assignments** = stored on the group as meta `assignments`: map
  `giver_user_id → receiver_user_id`. Never returned in bulk by any endpoint.
- **REST namespace** `cl/v1`, every route requires an authenticated WP user with
  `manage_options` — i.e. only the Next.js server, which authenticates with a WP
  **application password** (env `WP_URL`, `WP_APP_USER`, `WP_APP_PASSWORD`).
  Browsers never talk to WP directly.
- Endpoints (shape left to builder), covering: register user, verify
  credentials, create reset key, reset password with key, list groups, create
  group, join group, get my assignment.
- **Join + draw is atomic in the plugin**: joining checks capacity and
  membership, adds the user, and if the group is now full runs the draw in the
  same request under a lock (e.g. MySQL `GET_LOCK` per group) so concurrent
  joins can't overfill or double-draw.

### Draw algorithm

Shuffle members randomly (cryptographically secure shuffle, `random_int`), then
member *i* gives to member *(i+1) mod n*. This forms one cycle: nobody draws
themselves, everyone is drawn exactly once, and it can never get stuck (the
owner's sequential pick-one-at-a-time description can dead-end, e.g. A→B, B→A,
C→D, D→?). Store `assignments`, `status=drawn`, `drawn_at=now`.

### Next.js side

- Pages: register, login, forgot password, reset password (from email link),
  groups list (join buttons, member counts, status), owner-only "create group"
  form, and per-group **Draw** button for members once the group is drawn.
- Session: signed, httpOnly cookie holding WP user id/login/email (e.g. `jose`
  JWT, secret `SESSION_SECRET`). All WP calls happen in server actions / route
  handlers.
- Owner identified by env `OWNER_EMAIL` (default `tomasz.abratowski@gmail.com`);
  checked server-side on create-group.
- Capacity validated server-side (Next and plugin): integer, even, >= 2.
- **Password reset**: user enters email → plugin returns a reset key (if user
  exists) → Next emails link `${APP_URL}/reset-password?login=…&key=…`. Always
  show the same "if that account exists, we've sent an email" message.
- **Draw click**: fetch my assignment for the group → show receiver's login →
  send email to the user with the receiver's login. Clicking again re-shows and
  re-sends (no harm).
- Email via `nodemailer` Gmail SMTP, from `tomasz.abratowski@gmail.com`.

## Calls made without asking (owner to confirm)

- Registration and joining are open to anyone with the URL (no invite code, no
  email verification).
- No "your group has been drawn" email; members see status on the groups page.
- "Even capacity" is enforced as requested, though the draw works for any n >= 2.

## Left to the builder

- Exact REST routes/payloads, plugin file layout, UI styling.
- Validation rules for login/password length.
- Whether a user may be in multiple groups (default: yes, one seat per group).
- Testing approach (at minimum unit-test the draw algorithm).
