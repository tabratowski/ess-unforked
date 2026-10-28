# Christmass Lottery API (WordPress plugin)

Private REST API (`/wp-json/cl/v1`) used by the Next.js app. Stores lottery
users as WordPress users, groups as the `cl_group` post type, and draws as
group meta (`assignments`, `drawn_at`).

## Install

1. Zip the plugin folder: `cd wp-plugin && zip -r christmass-lottery-api.zip christmass-lottery-api`
2. WP admin → Plugins → Add New → Upload Plugin → choose the zip → Activate.
3. WP admin → Users → (an administrator) → Application Passwords → add one named
   `christmass-lottery`. Put that user's login in `WP_APP_USER` and the generated
   password in `WP_APP_PASSWORD` in the Next.js app's env.

Every route requires `manage_options`, so only the Next.js server (using the
admin application password) can call it.

## Test

```
php wp-plugin/tests/draw-test.php
```
