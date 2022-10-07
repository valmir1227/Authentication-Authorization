import { createContext, ReactNode, useEffect, useState } from "react";
import { setCookie, parseCookies, destroyCookie } from "nookies";

import Router from "next/router";

import { api } from "../services/apiClient";

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SingInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  singIn(credentials: SingInCredentials): Promise<void>;
  singOut: () => void;
  user: User;
  isAuthenticated: boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

let authChannel: BroadcastChannel;

export function singOut() {
  destroyCookie(undefined, "nextAuth.token"),
    destroyCookie(undefined, "nextAuth.refreshToken");

  authChannel.postMessage("singOut");

  Router.push("/");
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();

  const isAuthenticated = !!user;

  useEffect(() => {
    authChannel = new BroadcastChannel("auth");

    authChannel.onmessage = (message) => {
      switch (message.data) {
        case "singOut":
          singOut();
          break;
        default:
          break;
      }
    };
  }, []);

  useEffect(() => {
    const { "nextAuth.token": token } = parseCookies();

    if (token) {
      api
        .get("/me")
        .then((response) => {
          const { email, permissions, roles } = response.data;

          setUser({ email, permissions, roles });
        })
        .catch(() => {
          singOut();
        });
    }
  }, []);

  async function singIn({ email, password }: SingInCredentials) {
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;

      setCookie(undefined, "nextAuth.token", token, {
        maxAge: 60 * 60 * 24 * 30, // 30days
        path: "/",
      });
      setCookie(undefined, "nextAuth.refreshToken", refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30days
        path: "/",
      });

      setUser({ email, permissions, roles });

      api.defaults.headers.common["Authorization"] = `Bearer${token}`;

      Router.push("/dashboard");
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <AuthContext.Provider value={{ singIn, singOut, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}
