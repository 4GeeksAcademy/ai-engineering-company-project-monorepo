Dockerize the monorepo for development and deploy it to the VPS (infra-40)

Every new developer lost hours to Node and Python version conflicts and
undocumented global setup. Define the development environment as code so
`docker compose up` brings the whole platform up the same way on any machine,
and run the same stack in production on the VPS.

Containers
- uis/Dockerfile (node:22-alpine): installs the dependencies of website and
  backoffice separately from the npm workspace and starts both from one
  container through uis/start.sh: website (Vite) on :3000, backoffice
  (Next.js) on :3001, both with hot reload
- services/Dockerfile (python:3.12-slim): installs uv, installs
  requirements.txt with `uv pip install` and runs uvicorn with --reload
- Add a .dockerignore in uis/ and in services/ (node_modules, .next, .env*,
  *.log, __pycache__, *.pyc, tests/)
- Pass packages/shared to the builds as a named context, so the build
  contexts stay ./uis and ./services

Orchestration
- Add docker-compose.yml at the repository root: bind mounts over the source,
  an explicitly named network (nexova-net) and the service names as hosts
  (API_PROXY_TARGET=http://api:8000); no localhost and no hardcoded IP
- Read the configuration from .env (gitignored, documented in .env.example);
  every value has a default, so the stack also starts without it
- Wait for the API healthcheck before starting the interfaces and restart
  both services unless stopped, so the stack survives a server reboot

Application changes
- Add DATA_DIR to core/config.py to keep the TinyDB and SQLite files in one
  volume; without it the paths do not change
- Read DEV_ALLOWED_ORIGINS in next.config.mjs: `next dev` answered 403 to
  its JavaScript chunks when the backoffice was opened through an IP or a
  domain, which left the login form without JavaScript
- Add infra/update-vps.sh to refresh the stack on the server in one command

Deployment
- Run the same compose file on the VPS with its own .env (production values
  never go to Git); publish the backoffice on :80 and the website on :8080,
  and keep the API reachable only from inside the host and the Docker network
- Document the setup in infra/README.md

Verification
- `docker compose up` from a clean checkout, with and without .env: website,
  backoffice and /health answer 200
- Check hot reload on the API (WatchFiles) and on the website (Vite HMR)
- Check from the interfaces container that api resolves by service name, in
  production
- Run the API suite inside the image: 660 passed; the 64 failures and errors
  are tests that read data/ and scripts/ from the repository root, which are
  outside the services build context
- Check in production that the login works, that the API answers 401 without
  a token and that the stack comes back after a server reboot

Known limits
- uis/website is a Vite app, not Next.js: start.sh runs it with vite
- The VPS runs the development stack (hot reload) over HTTP, as the ticket
  asks; a production build behind TLS is a separate step
