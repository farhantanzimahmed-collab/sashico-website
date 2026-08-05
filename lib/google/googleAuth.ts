import { google, Auth } from "googleapis";

let _auth: Auth.GoogleAuth | null = null;
let _credentialsJson: string | null = null;

/** Call this before getGoogleAuth() when credentials come from DB */
export function setCredentials(json: string) {
  _credentialsJson = json;
  _auth = null; // reset so next call rebuilds
}

export function getGoogleAuth(): Auth.GoogleAuth {
  if (_auth) return _auth;

  // Priority: explicitly set → env var
  const raw = _credentialsJson ?? process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Google credentials not configured. Paste your service account JSON in the admin Google Sync page.");

  const credentials = JSON.parse(raw);

  _auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });

  return _auth;
}
