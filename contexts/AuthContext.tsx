import Router from "next/router";
import { createContext, ReactNode, useEffect, useState } from "react";
import { setCookie, parseCookies } from "nookies";

import { api } from "../services/api";

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
  singIn(Credentials: SingInCredentials): Promise<void>;
  user: User;
  isAuthenticated: boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();

  const isAuthenticated = !!user;

  useEffect(() => {
    const { "nextAuth.token": token } = parseCookies();

    if (token) {
      api.get("/me").then((response) => {
        const { email, permissions, roles } = response.data;

        setUser({ email, permissions, roles });
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

      api.defaults.headers.common["Authorization"] = `Bearer${token}`;

      setUser({ email, permissions, roles });

      Router.push("/dashboard");

      console.log(response);
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <AuthContext.Provider value={{ singIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}
