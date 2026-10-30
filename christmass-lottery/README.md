# Christmass Lottery

Secret-Santa app: people register, join a group, and when the group is full
everyone is secretly assigned one other member to buy a present for.

- **Next.js app** (this folder): pages, sessions, email.
- **WordPress plugin** (`wp-plugin/`): stores users, groups and draws on the
  WP Engine site. The browser never talks to WordPress, only this app's server does.

## Setup

1. **WordPress**: install and activate the plugin, and create an application
   password. See [`wp-plugin/README.md`](wp-plugin/README.md).
2. **Env**: `cp .env.example .env.local` and fill it in.
   - `SESSION_SECRET`: `openssl rand -base64 32`
   - `GMAIL_APP_PASSWORD`: turn on 2-step verification for
     `tomasz.abratowski@gmail.com`, then create an app password at
     https://myaccount.google.com/apppasswords. Mail is sent through Gmail SMTP.
3. `npm install && npm run dev` and open http://localhost:3000.
4. **Register the owner account (`OWNER_EMAIL`) yourself before sharing the
   link.** Anyone who registers with that email gets the create-group form, and
   emails aren't verified. If a WordPress user already uses that email, log in
   with that account instead.

Deploying on WP Engine headless: set the same env vars in the environment; the
platform runs `npm run wpe-build`.

## How the draw works

When the last seat in a group is taken, the plugin shuffles the members into a
random circle and each person gives to the next one. Nobody draws themselves,
everyone is drawn exactly once, and the draw can't get stuck. The result and
the draw date are stored on the group in WordPress. Joins are serialised with a
MySQL lock, so a group can't be overfilled or drawn twice.

## Drawing

Once a member clicks **Losuj**, the plugin records it (group meta `revealed`).
From then on the groups page shows their result, a greyed-out **Losuj** and a
**Wyślij ponownie mail** button that emails the same result again.

## Managing groups (owner only)

The owner (`OWNER_EMAIL`) sees **Manage groups** on the groups page (`/groups/manage`):

- see each group's members (login and email)
- rename any group; resize open groups (even, not below the current headcount;
  shrinking to exactly the headcount runs the draw)
- remove a member from an open group
- redraw a drawn group (same people, new draw date). Everyone's Draw button
  becomes active again; people who already drew have the old result by email,
  so tell them to draw again
- delete a group and its draw

Nobody, including the owner, can see who drew whom.

## Tests

```
npm test                               # Next.js lib tests
php wp-plugin/tests/draw-test.php      # draw algorithm
```

## Manual end-to-end check

1. Register the owner (`OWNER_EMAIL`) and 3 other users.
2. As the owner, create a group with 4 people. Try 3: it should be rejected.
3. Join the group with all 4 users. After the 4th join it shows "drawn <date>".
4. As each user, click **Draw**. Each sees a different person, never themselves,
   and receives the same result by email.
5. In WP admin → Lottery groups, the group exists. Assignments are in post meta.
6. Log out → Forgot password → enter a registered email → open the link →
   set a new password → log in with it.
7. Forgot password with an unknown email shows the same message and sends nothing.
