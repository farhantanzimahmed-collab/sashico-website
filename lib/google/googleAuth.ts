import { google, Auth } from "googleapis";

let _auth: Auth.GoogleAuth | null = null;

export function getGoogleAuth(): Auth.GoogleAuth {
  if (_auth) return _auth;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var not set");

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
