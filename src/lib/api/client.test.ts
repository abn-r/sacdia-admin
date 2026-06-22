import { afterEach, describe, expect, it, vi } from "vitest";

const axiosMock = vi.hoisted(() => {
  type RequestConfig = {
    headers?: Record<string, string>;
    [key: string]: unknown;
  };
  type RequestInterceptor = (
    config: RequestConfig,
  ) => RequestConfig | Promise<RequestConfig>;
  type ResponseRejectInterceptor = (error: unknown) => unknown;
  type RequestHandler = (config: RequestConfig) => Promise<{ data: unknown }>;

  const requestInterceptors: RequestInterceptor[] = [];
  const responseRejectInterceptors: ResponseRejectInterceptor[] = [];

  let requestHandler: RequestHandler = async (config: RequestConfig) => ({
    data: { config },
  });

  const request = vi.fn(async (config: RequestConfig) => {
    let nextConfig: RequestConfig = {
      ...config,
      headers: config.headers ?? {},
    };

    for (const interceptor of requestInterceptors) {
      nextConfig = await interceptor(nextConfig);
    }

    try {
      return await requestHandler(nextConfig);
    } catch (error) {
      let rejection = error;

      for (const interceptor of responseRejectInterceptors) {
        try {
          return await interceptor(rejection);
        } catch (nextError) {
          rejection = nextError;
        }
      }

      throw rejection;
    }
  });

  return {
    request,
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn((interceptor: RequestInterceptor) => {
            requestInterceptors.push(interceptor);
          }),
        },
        response: {
          use: vi.fn(
            (
              _onFulfilled: unknown,
              onRejected: ResponseRejectInterceptor,
            ) => {
              responseRejectInterceptors.push(onRejected);
            },
          ),
        },
      },
      request,
    })),
    isAxiosError: vi.fn((error: unknown) => {
      return Boolean(
        error &&
          typeof error === "object" &&
          (error as { isAxiosError?: unknown }).isAxiosError,
      );
    }),
    resetRequestHandler() {
      requestHandler = async (config: RequestConfig) => ({
        data: { config },
      });
    },
    setRequestHandler(handler: RequestHandler) {
      requestHandler = handler;
    },
  };
});

vi.mock("axios", () => ({
  default: {
    create: axiosMock.create,
    isAxiosError: axiosMock.isAxiosError,
  },
}));

import {
  apiRequestFromClient,
  clearClientAuthTokenCache,
  getClientAuthToken,
} from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  clearClientAuthTokenCache();
  axiosMock.request.mockClear();
  axiosMock.resetRequestHandler();
  globalThis.fetch = originalFetch;
  window.history.pushState(null, "", "/");
  vi.restoreAllMocks();
});

describe("getClientAuthToken", () => {
  it("reuses a token from in-memory cache within the TTL", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ token: "cached-admin-jwt" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    await expect(getClientAuthToken()).resolves.toBe("cached-admin-jwt");
    await expect(getClientAuthToken()).resolves.toBe("cached-admin-jwt");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/token", {
      credentials: "include",
    });
  });

  it("deduplicates concurrent token fetches", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    globalThis.fetch = fetchMock;

    const first = getClientAuthToken();
    const second = getClientAuthToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(
      new Response(JSON.stringify({ token: "deduped-admin-jwt" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(first).resolves.toBe("deduped-admin-jwt");
    await expect(second).resolves.toBe("deduped-admin-jwt");
  });
});

describe("apiRequestFromClient", () => {
  it("does not fetch a relay token when Authorization is provided explicitly", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    globalThis.fetch = fetchMock;

    const result = await apiRequestFromClient<{
      config: { headers: { Authorization?: string } };
    }>("/clubs", {
      headers: { Authorization: "Bearer explicit-admin-jwt" },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.config.headers.Authorization).toBe("Bearer explicit-admin-jwt");
  });

  it("refreshes the relay token and retries once after a 401 response", async () => {
    window.history.pushState(null, "", "/login");

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "stale-admin-jwt" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "refreshed-admin-jwt" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock;

    await expect(getClientAuthToken()).resolves.toBe("stale-admin-jwt");

    let attempt = 0;
    axiosMock.setRequestHandler(async () => {
      attempt += 1;
      if (attempt === 2) {
        return { data: { ok: true } };
      }

      throw {
        isAxiosError: true,
        config: {
          url: "/clubs",
          method: "GET",
          headers: {},
        },
        response: {
          status: 401,
          data: { message: "Unauthorized" },
        },
      };
    });

    await expect(apiRequestFromClient("/clubs")).resolves.toEqual({ ok: true });

    await expect(getClientAuthToken()).resolves.toBe("refreshed-admin-jwt");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    expect(axiosMock.request).toHaveBeenCalledTimes(2);
  });
});
