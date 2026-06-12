import axios, { AxiosError } from "axios";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ApiRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  headers?: HeadersInit;
  token?: string;
  cache?: RequestCache;
  params?: Record<string, string | number | boolean | undefined>;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function normalizeBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) {
    return "http://localhost:3000/api/v1";
  }

  const normalized = configured.endsWith("/") ? configured.slice(0, -1) : configured;

  if (normalized.endsWith("/api")) {
    return `${normalized}/v1`;
  }

  return normalized;
}

export const API_BASE_URL = normalizeBaseUrl();

const CLIENT_AUTH_TOKEN_TTL_MS = 60_000;

let cachedClientAuthToken: { token: string; expiresAt: number } | null = null;
let pendingClientAuthToken: Promise<string | null> | null = null;

function toRecord(headers?: HeadersInit) {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function flattenValidationMessages(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenValidationMessages);
  }
  if (typeof value === "object") {
    const node = value as {
      constraints?: Record<string, unknown>;
      children?: unknown;
      message?: unknown;
      property?: unknown;
    };
    const out: string[] = [];
    if (node.constraints && typeof node.constraints === "object") {
      for (const v of Object.values(node.constraints)) {
        if (typeof v === "string" && v.trim()) out.push(v.trim());
      }
    }
    if (node.children) out.push(...flattenValidationMessages(node.children));
    if (typeof node.message === "string" && node.message.trim()) {
      out.push(node.message.trim());
    }
    return out;
  }
  return [];
}

function extractMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload.trim();
  }

  if (payload && typeof payload === "object") {
    const obj = payload as { message?: unknown; errors?: unknown };
    const fromMessage = flattenValidationMessages(obj.message);
    if (fromMessage.length > 0) return fromMessage.join(", ");

    const fromErrors = flattenValidationMessages(obj.errors);
    if (fromErrors.length > 0) return fromErrors.join(", ");

    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message.trim();
    }
  }

  return `Request failed with status ${status}`;
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const status = axiosError.response?.status ?? 500;
    const payload = axiosError.response?.data ?? null;

    return new ApiError(extractMessage(payload, status), status, payload);
  }

  return new ApiError("Error inesperado", 500, null);
}

function normalizeUnexpectedError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error && typeof error.message === "string" && error.message.trim().length > 0) {
    return new ApiError(error.message, 500, null);
  }

  return new ApiError("Error inesperado", 500, null);
}

function buildRequestUrl(path: string, params?: ApiRequestOptions["params"]) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
  const url = isAbsolute ? new URL(path) : new URL(path.replace(/^\/+/, ""), base);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value !== "undefined") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url;
}

function isBodyInit(value: unknown): value is BodyInit {
  if (typeof value === "string") {
    return true;
  }

  if (
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  ) {
    return true;
  }

  return typeof ReadableStream !== "undefined" && value instanceof ReadableStream;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text.trim().length > 0 ? text : null;
}

async function resolveToken(token?: string) {
  if (token) {
    return token;
  }

  if (typeof window !== "undefined") {
    return undefined;
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export function clearClientAuthTokenCache() {
  cachedClientAuthToken = null;
  pendingClientAuthToken = null;
}

async function fetchClientAuthToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token");

    if (res.status === 401 || res.status === 403) {
      clearClientAuthTokenCache();
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const body = (await res.json()) as { token?: unknown };
    return typeof body.token === "string" && body.token.length > 0
      ? body.token
      : null;
  } catch {
    clearClientAuthTokenCache();
    return null;
  }
}

export async function getClientAuthToken(): Promise<string | null> {
  const now = Date.now();

  if (cachedClientAuthToken && cachedClientAuthToken.expiresAt > now) {
    return cachedClientAuthToken.token;
  }

  if (!pendingClientAuthToken) {
    pendingClientAuthToken = fetchClientAuthToken().then((token) => {
      pendingClientAuthToken = null;

      if (token) {
        cachedClientAuthToken = {
          token,
          expiresAt: Date.now() + CLIENT_AUTH_TOKEN_TTL_MS,
        };
      } else {
        cachedClientAuthToken = null;
      }

      return token;
    });
  }

  return pendingClientAuthToken;
}

function hasAuthorizationHeader(headers: unknown): boolean {
  if (!headers || typeof headers !== "object") {
    return false;
  }

  const maybeHeaderBag = headers as {
    get?: (name: string) => unknown;
    has?: (name: string) => boolean;
  };

  if (typeof maybeHeaderBag.has === "function" && maybeHeaderBag.has("Authorization")) {
    return true;
  }

  if (typeof maybeHeaderBag.get === "function") {
    const value = maybeHeaderBag.get("Authorization");
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    if (value != null) {
      return true;
    }
  }

  return Object.entries(headers as Record<string, unknown>).some(
    ([key, value]) =>
      key.toLowerCase() === "authorization" &&
      typeof value === "string" &&
      value.trim().length > 0,
  );
}

function setAuthorizationHeader(headers: unknown, token: string) {
  if (!headers || typeof headers !== "object") {
    return;
  }

  const value = `Bearer ${token}`;
  const maybeHeaderBag = headers as {
    set?: (name: string, value: string) => void;
    Authorization?: string;
  };

  if (typeof maybeHeaderBag.set === "function") {
    maybeHeaderBag.set("Authorization", value);
    return;
  }

  maybeHeaderBag.Authorization = value;
}

const clientApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

let interceptorBound = false;

function ensureClientInterceptors() {
  if (interceptorBound) {
    return;
  }

  // Attach the Bearer token from the httpOnly cookie via a lightweight Next.js
  // relay. The relay result is cached in-memory per browser tab to avoid
  // paying an extra Vercel route-handler hop before every backend request.
  clientApi.interceptors.request.use(async (config) => {
    if (hasAuthorizationHeader(config.headers)) {
      return config;
    }

    try {
      const token = await getClientAuthToken();
      if (token) {
        if (!config.headers) {
          config.headers = {
            Authorization: `Bearer ${token}`,
          } as typeof config.headers;
        } else {
          setAuthorizationHeader(config.headers, token);
        }
      }
    } catch {
      // Silently fail — the backend will return 401 if the token is missing.
    }
    return config;
  });

  clientApi.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const normalized = normalizeError(error);

      if (normalized.status === 401 || normalized.status === 403) {
        clearClientAuthTokenCache();
      }

      if (
        typeof window !== "undefined" &&
        (normalized.status === 401 || normalized.status === 403) &&
        !window.location.pathname.startsWith("/login")
      ) {
        const next = window.location.pathname + window.location.search;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      }

      return Promise.reject(normalized);
    },
  );

  interceptorBound = true;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  // Auto-detect execution context. In the browser, delegate to
  // apiRequestFromClient so the Bearer token is attached via the cached
  // httpOnly cookie relay. Server-side keeps the original path that reads the
  // cookie directly via next/headers.
  if (typeof window !== "undefined") {
    return apiRequestFromClient<T>(path, options);
  }

  const { method = "GET", body, headers, token, params, cache } = options;
  const resolvedToken = await resolveToken(token);
  const requestHeaders = new Headers(toRecord(headers));
  const requestUrl = buildRequestUrl(path, params);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (resolvedToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${resolvedToken}`);
  }

  let requestBody: BodyInit | undefined;
  if (typeof body !== "undefined" && method !== "GET") {
    if (isBodyInit(body)) {
      requestBody = body;
    } else {
      if (!requestHeaders.has("Content-Type")) {
        requestHeaders.set("Content-Type", "application/json");
      }
      requestBody = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: requestHeaders,
      body: requestBody,
      cache,
    });
    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      throw new ApiError(extractMessage(payload, response.status), response.status, payload);
    }

    return payload as T;
  } catch (error) {
    throw normalizeUnexpectedError(error);
  }
}

export async function apiRequestFromClient<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers, params } = options;
  ensureClientInterceptors();

  try {
    const response = await clientApi.request<T>({
      url: path,
      method,
      data: body,
      params,
      headers: {
        ...toRecord(headers),
      },
    });

    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}
