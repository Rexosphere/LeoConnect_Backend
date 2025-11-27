# Deployment Guide

This guide details how to deploy the LeoConnect Backend to Cloudflare Workers and configure Firebase authentication.

## Prerequisites

- [Node.js](https://nodejs.org/) installed.
- [Cloudflare Account](https://dash.cloudflare.com/sign-up).
- [Firebase Project](https://console.firebase.google.com/).

## 1. Firebase Configuration

The backend uses a Service Account to securely communicate with Firestore.

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Generate Service Account Key**:
    - Navigate to **Project Settings** > **Service accounts**.
    - Click **Generate new private key**.
    - Save the downloaded JSON file securely. **Do not commit this file to version control.**

## 2. Project Configuration

1.  **Update `wrangler.jsonc`**:
    - Open `wrangler.jsonc` in the root of the `backend` directory.
    - Update `FIREBASE_PROJECT_ID` with your project ID from the JSON file.
    - Update `FIREBASE_CLIENT_EMAIL` with the `client_email` from the JSON file.

    ```jsonc
    "vars": {
        "FIREBASE_PROJECT_ID": "your-project-id",
        "FIREBASE_CLIENT_EMAIL": "your-service-account-email@..."
    }
    ```

2.  **Set the Private Key Secret**:
    - Run the following command to securely store your private key in Cloudflare:
      ```bash
      npx wrangler secret put FIREBASE_PRIVATE_KEY
      ```
    - When prompted, paste the entire `private_key` string from your Service Account JSON file. It should look like:
      `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...`

## 3. Deployment

To deploy the worker to Cloudflare's global network:

```bash
npm run deploy
```

## 4. Local Development

To run the worker locally for testing:

```bash
npm run dev
```

Note: You will still need the `FIREBASE_PRIVATE_KEY` set up. For local development, you might need to create a `.dev.vars` file in the project root with the secret:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

## 5. Verification

Once deployed, you can verify the health of the service:

```bash
curl https://backend.<your-subdomain>.workers.dev/
```

You should receive: `{"message":"LeoConnect Backend is running!"}`
