# Local Load Balancing with Nginx

This setup uses Nginx to distribute HTTP requests between two PU-GPT backend instances.

## Architecture

- Nginx reverse proxy: `http://localhost:8080`
- Backend instance 1: `http://localhost:3001`
- Backend instance 2: `http://localhost:3002`

Both backend instances connect to the configured MongoDB database.

## Prerequisites

- Node.js and npm
- Nginx for Windows
- A configured backend `.env` file

## Start the backend instances

Open two terminals from the project root.

**Terminal 1:**

```powershell
cd backend
$env:PORT=3001
npm run dev
```

**Terminal 2:**

```powershell
cd backend
$env:PORT=3002
npm run dev
```

Ensure both instances start successfully.

## Configure Nginx

1. Install or extract Nginx for Windows.
2. Copy `nginx.conf` from this directory into Nginx's `conf` directory.
3. Start Nginx from its installation directory:

```powershell
.\nginx.exe
```

Nginx listens on port `8080` and uses the `least_conn` strategy to select between backend instances.

## Test

Open a new PowerShell terminal and run:

```powershell
Invoke-RestMethod http://localhost:8080/api/health
```

The health endpoint should return a successful response.

## Notes

- Both backend instances use the same configured MongoDB database.
- This is a local development setup, not a production deployment configuration.
- Ensure ports `3001`, `3002`, and `8080` are available.
