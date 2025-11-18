import type { DisasterAwareAuthResponse } from "../types";
import { config } from "../config";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function authorize(): Promise<void> {
  try {
    const res = await fetch(`/api/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.disasterAware.username,
        password: config.disasterAware.password
      })
    });

    if (!res.ok) {
      throw new Error(`Authentication failed: ${res.status} ${res.statusText}`);
    }

    const data: DisasterAwareAuthResponse = await res.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;

    localStorage.setItem("accessToken", accessToken || "");
    localStorage.setItem("refreshToken", refreshToken || "");

    console.log("Authorized successfully");
  } catch (error) {
    console.error("Authorization failed:", error);
    throw error;
  }
}

export function getAccessToken(): string {
  return localStorage.getItem("accessToken") || "";
}

export async function refreshAccessToken(): Promise<void> {
  await authorize();
}

export async function authFetch(url: string): Promise<Response | undefined> {
  let accessToken = getAccessToken();

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // If token is invalid or expired, refresh it
    if (res.status === 401 || res.status === 403) {
      console.log("Token expired, refreshing...");
      await refreshAccessToken();
      accessToken = getAccessToken();

      return await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } else if (res.ok) {
      return res;
    } else {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error("AuthFetch error:", error);
    throw error;
  }
}
