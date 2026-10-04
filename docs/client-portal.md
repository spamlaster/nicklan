# Client Website Preview / Staging Portal

## Architecture and scope

The existing website uses React 19, TypeScript, Vite, hash navigation and a custom
CSS design. It deploys static files to GitHub Pages. There was no authentication,
database, dashboard or server. The public map and destination pages are preserved.

The portal lives at `https://nicklan.com/#/clients`, following the existing router.
The new Node API runs separately on the VPS. It uses Node's built-in SQLite module
(Node 22.13+; experimental in Node 22) without new runtime dependencies. Projects,
feedback, activity and hashed sessions are stored in SQLite. See
`server/schema.sql` for the schema, applied idempotently at startup.

This release manages preview addresses; it does not deploy repositories, provision
Nginx, check preview availability or create DNS records. Public review links and
public feedback submission are deferred. Client contact information and development
notes are only exposed through authenticated endpoints. A future public review API
should use revocable project-specific tokens and return only explicitly public fields.

## Local setup

1. Run `npm ci` with Node 22.13 or later.
2. Generate a password hash with `npm run password:hash`. The script reads the
   password from stdin. On macOS/zsh, avoid displaying it or storing it in history:

   ```sh
   read -rs 'portal_password?Admin password (12+ characters): '
   printf '%s' "$portal_password" | npm run password:hash
   unset portal_password
   ```

3. Create an ignored `.env` in the repository root:

   ```dotenv
   ADMIN_PASSWORD_HASH=<salt:hash output from the command>
   PORTAL_ORIGIN=http://localhost:5173
   DATABASE_PATH=./server/data/portal.sqlite
   PORT=3001
   ```

4. Run `npm run server` in one terminal and `npm run dev` in another. Open
   `http://localhost:5173/#/clients`. Vite proxies `/api` to loopback port 3001.
   If Vite chooses a different port, update `PORTAL_ORIGIN` and restart the API.

`npm test` covers API authentication, CSRF origin checks, login throttling,
project validation and CRUD, all statuses, duplicate slugs, feedback, activity,
session revocation and database persistence across restarts. `npm run lint` and
`npm run build` check the frontend. No mock projects or browser storage are used.

## VPS deployment while retaining GitHub Pages

The static GitHub Pages host cannot run the API. Use a separate API hostname such
as `portal-api.nicklan.com`, pointed at your VPS. Keep the apex domain pointed at
GitHub Pages. Set the repository Actions variable `VITE_PORTAL_API_BASE` to
`https://portal-api.nicklan.com`; the existing workflow passes it to the build.
This URL is public configuration; never put passwords or hashes in `VITE_*` values.

Install Node 22.13+ on the VPS, copy `server/` to `/opt/nicklan/server/`, and create
an unprivileged `nicklan` service account. Create `/var/lib/nicklan` owned by that
account for the database. Create `/etc/nicklan-portal.env` with permissions 600:

```dotenv
ADMIN_PASSWORD_HASH=<generated hash>
PORTAL_ORIGIN=https://nicklan.com
DATABASE_PATH=/var/lib/nicklan/portal.sqlite
PORT=3001
```

Run the API as a service; this example assumes Node is installed at `/usr/bin/node`:

```ini
[Unit]
Description=NickLan Client Portal API
After=network.target

[Service]
User=nicklan
WorkingDirectory=/opt/nicklan
EnvironmentFile=/etc/nicklan-portal.env
ExecStart=/usr/bin/node /opt/nicklan/server/index.mjs
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/nicklan
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Install it as `/etc/systemd/system/nicklan-portal.service`, then run
`systemctl daemon-reload` and `systemctl enable --now nicklan-portal`.

Add an Nginx virtual host for the API. Integrate it with your existing HTTPS
configuration and obtain a certificate for `portal-api.nicklan.com` before use:

```nginx
server {
    listen 443 ssl;
    server_name portal-api.nicklan.com;
    # ssl_certificate and ssl_certificate_key: your certificate paths
    client_max_body_size 64k;
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header Origin $http_origin;
    }
    location / { return 404; }
}
```

Redirect HTTP to HTTPS in your existing Nginx configuration. The API intentionally
binds only to loopback. It accepts credentialed requests only from the exact
configured portal origin. Sessions use host-only, HttpOnly, SameSite=Strict cookies
with Secure enabled for HTTPS origins, expire after eight hours, and survive API
restarts. The frontend and API hostnames must share the same scheme and registrable
domain for these cookies. Use the canonical `https://nicklan.com` portal address.

If hosting the frontend on the VPS later, serve `dist/` and reverse proxy `/api/`
on the same hostname; omit `VITE_PORTAL_API_BASE` in that build.

## Client preview websites

For each client, create an A/AAAA record such as `joesplumbing.nicklan.com` pointing
to the VPS, independently deploy their website, and configure its own Nginx host
and TLS certificate. You can use wildcard DNS if appropriate for your server,
but avoid overriding existing apex, www or API DNS records. The portal's suggested
`https://<slug>.nicklan.com` address only works after that deployment is complete.
Preview websites are independently public unless you protect them at the server.

## Operation and backups

Use a unique admin password. Failed login attempts are limited to ten per
15 minutes per direct peer IP. Behind Nginx this is a shared loopback bucket,
appropriate for a single admin; it resets on process restart. No untrusted
forwarded IP headers are used. Keep the API service running as one instance.

Back up SQLite with SQLite's online backup mechanism, or stop the service before
copying the database and its WAL files together. Keep backups private, verify
restoration, and keep the database directory outside static website roots.
To rotate the admin password, update the hash, stop the API, delete all rows from
the `sessions` table using SQLite tooling, and restart. Signing out revokes the
current session immediately. For subsequent schema changes, introduce versioned
migrations rather than relying only on CREATE TABLE IF NOT EXISTS.
