import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { singOut } from "../contexts/AuthContext";
import {AuthTokenError} from "./errors/AuthTokenError"

let isRefreshing = false;
let failedRequestQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3334/",
    headers: {
      Authorization: `Bearer ${cookies["nextAuth.token"]}`,
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response.status === 401) {
        if (error.response.data?.code === "token.expired") {
          //Renovar token
          cookies = parseCookies(ctx);

          const { "nextAuth.refreshToken": refreshToken } = cookies;
          const originalConfig = error.config;

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post("/refresh", {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data;

                setCookie(ctx, "nextAuth.token", token, {
                  maxAge: 60 * 60 * 24 * 30, // 30days
                  path: "/",
                });
                setCookie(
                  ctx,
                  "nextAuth.refreshToken",
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30days
                    path: "/",
                  }
                );

                api.defaults.headers.common["Authorization"] = `Bearer${token}`;

                failedRequestQueue.forEach((request) =>
                  request.onSuccess(token)
                );
                failedRequestQueue = [];
              })
              .catch((err) => {
                failedRequestQueue.forEach((request) => request.onFailure(err));
                failedRequestQueue = [];

                if (process.browser) {
                  singOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          return new Promise((resolve, reject) => {
            failedRequestQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers["Authorization"] = `Bearer ${token}`;

                resolve(api(originalConfig));
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          if (process.browser) {
            singOut();
          } else {
            return Promise.reject(error);
          }
        }
      }
      return Promise.reject(error);
    }
  );
  return api;
}
