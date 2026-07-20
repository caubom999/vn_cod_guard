# Production deployment: GitLab, vtjr.online, and Shopify

This deployment has two independent release targets:

1. GitLab builds the web application image and deploys it to the server.
2. Shopify CLI deploys the TOML configuration and both Shopify Function extensions.

Keep both production jobs manual until the release process has been tested.

## 1. Prepare the server

Install Docker Engine, the Docker Compose plugin, Nginx, Curl, and Certbot on an
Ubuntu server. The deployment user must be able to run Docker without `sudo`.

```bash
sudo usermod -aG docker deploy
sudo mkdir -p /opt/vn-cod-guard
sudo chown deploy:deploy /opt/vn-cod-guard
```

Copy `.env.production.example` to `/opt/vn-cod-guard/.env.production`, replace
every placeholder, and restrict the file:

```bash
chmod 600 /opt/vn-cod-guard/.env.production
```

Do not store the production environment file in GitLab artifacts or in the Git
repository. Set `SHOPIFY_BILLING_TEST=false` for the public app. Verify the
`vtjr.online` domain in Resend before using `confirm@vtjr.online`.

Generate `INTEGRATION_ENCRYPTION_KEY` with a cryptographically secure random
value of at least 32 characters. This key encrypts merchant-owned SMS provider
credentials with AES-256-GCM. Back it up in the production secret manager and
do not rotate it without a credential migration, because existing connections
can't be decrypted after the key changes.

The recommended SMS model is merchant-direct billing: each merchant connects
their own provider on the **SMS connections** page and pays that provider
directly. COD Guard stores only encrypted credentials and doesn't submit a
Shopify SMS usage event for these connections. Global `TWILIO_*` environment
variables are an optional platform-owned fallback and aren't required for
merchant-direct connections.

Keep `SHOPIFY_SMS_USAGE_BILLING_ENABLED=false` until all of the following are
complete: the SMS sender is registered for every destination country, the
provider has accepted a production test message, and Shopify App Pricing has an
active usage meter whose handle exactly matches `SMS_USAGE_EVENT_HANDLE`. The
application reports the number of SMS segments, not only the number of orders,
because providers charge concatenated SMS per segment. This flag applies only
to the optional platform-owned SMS account.

Install `deploy/nginx/vtjr.online.conf` after checking the existing certificate
paths:

```bash
sudo cp deploy/nginx/vtjr.online.conf /etc/nginx/sites-available/vtjr.online
sudo ln -s /etc/nginx/sites-available/vtjr.online /etc/nginx/sites-enabled/vtjr.online
sudo nginx -t
sudo systemctl reload nginx
```

After the first application deployment, these URLs must work:

- `https://vtjr.online/health` returns `{ "ok": true }`.
- `https://vtjr.online/privacy` renders the privacy policy.
- `https://vtjr.online/terms` renders the terms page.

## 2. Create a dedicated deployment SSH key

Create a key that is used only by this GitLab project:

```bash
ssh-keygen -t ed25519 -C gitlab-vn-cod-guard-production -f gitlab_deploy_key
```

Append `gitlab_deploy_key.pub` to the deployment user's
`~/.ssh/authorized_keys` on the server.

From a trusted machine, capture the server host key:

```bash
ssh-keyscan -H vtjr.online > ssh_known_hosts
```

## 3. Configure GitLab CI/CD variables

In GitLab, open **Settings > CI/CD > Variables**. Configure production secrets
as protected variables so they are available only on the protected `main`
branch.

| Variable                       | Type     | Protected | Masked | Value                                                                      |
| ------------------------------ | -------- | --------- | ------ | -------------------------------------------------------------------------- |
| `SHOPIFY_API_KEY`              | Variable | No        | No     | Shopify app client ID; this is public and is also embedded in the frontend |
| `SHOPIFY_APP_AUTOMATION_TOKEN` | Variable | Yes       | Yes    | Token generated in Shopify Dev Dashboard                                   |
| `DEPLOY_HOST`                  | Variable | Yes       | No     | `vtjr.online`                                                              |
| `DEPLOY_USER`                  | Variable | Yes       | No     | Server deployment user, for example `deploy`                               |
| `DEPLOY_PATH`                  | Variable | Yes       | No     | `/opt/vn-cod-guard`                                                        |
| `SSH_PRIVATE_KEY`              | File     | Yes       | No     | Contents of `gitlab_deploy_key`, ending with a newline                     |
| `SSH_KNOWN_HOSTS`              | File     | Yes       | No     | Contents of `ssh_known_hosts`                                              |

`CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, and
`CI_REGISTRY_PASSWORD` are provided automatically when the GitLab Container
Registry is enabled.

The Docker-in-Docker build job requires a GitLab Runner that allows privileged
Docker services. If a shared runner rejects the Docker service, register a
project runner using the Docker executor with privileged mode enabled, or move
the image build to a daemonless builder.

Protect the `main` branch and require merge requests before production.

## 4. Configure Shopify production

The repository contains `shopify.app.production.toml`. Confirm that its
`client_id` belongs to the public app in the Shopify Dev Dashboard.

In the Shopify Dev Dashboard:

1. Open the production app.
2. Open **Settings**.
3. Generate an **App Automation Token**.
4. Store it in GitLab as `SHOPIFY_APP_AUTOMATION_TOKEN`.
5. Set the app URL to `https://vtjr.online` if it is not already managed from
   the deployed TOML.
6. Confirm the allowed callback URL is
   `https://vtjr.online/api/auth/callback`.

The `release_shopify` job runs:

```bash
shopify app deploy --config production --allow-updates
```

This creates and releases one Shopify app version containing the app
configuration and all extensions. The default pipeline intentionally does not
use `--allow-deletes`, because a missing extension in CI could otherwise remove
it and its store data.

## 5. Run the first release

1. Push the changes to a feature branch and open a merge request.
2. Confirm that the `test` job succeeds.
3. Merge into the protected `main` branch.
4. Confirm that `build_image` pushes both the commit SHA tag and `latest`.
5. Run the manual `deploy_production` job.
6. Verify `https://vtjr.online/health`, install flow, billing callback, webhooks,
   and email verification links.
7. Run the manual `release_shopify` job.
8. Test both Shopify Functions in a development store before submitting the app
   for App Store review.

## 6. Rollback

Every image is tagged with the full Git commit SHA. To roll back the web app,
set `APP_IMAGE` to a known-good SHA tag and run Compose again on the server:

```bash
export APP_IMAGE=registry.gitlab.com/your-group/vn-cod-guard:KNOWN_GOOD_SHA
docker compose --env-file .env.production -f docker-compose.production.yaml up -d
```

Roll back Shopify configuration or extensions separately from the app version
page in the Shopify Dev Dashboard. Database migrations must be designed to be
backward compatible because rolling back a container does not reverse a
migration.
