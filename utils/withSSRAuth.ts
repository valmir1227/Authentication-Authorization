import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";
import { destroyCookie, parseCookies } from "nookies";
import decode from "jwt-decode";
import { validadeUserPermissions } from "./validateUserPermissions";
import { AuthTokenError } from "../services/errors/AuthTokenError";

type WithSSROptions = {
  permissions?: string[];
  roles?: string[];
};

export function withSSRAuth<P>(
  fn: GetServerSideProps<P>,
  options?: WithSSROptions
) {
  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx);
    const token = cookies["nextAuth.token"];

    if (!token) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

    if (options) {
      const user = decode<{ permissions: string[]; roles: string[] }>(token);

      const userHasValidPermissions = validadeUserPermissions({
        user,
        permissions: options?.permissions,
        roles: options?.roles,
      });

      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: "/dashboard",
            permanent: false,
          },
        };
      }
    }

    try {
      return await fn(ctx);
    } catch (error) {
      if (error instanceof AuthTokenError) {
        destroyCookie(ctx, "nextAuth.token");
        destroyCookie(ctx, "nextAuth.refreshToken");
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }

      return {
        redirect: {
          destination: "/error",
          permanent: false,
        },
      };
    }
  };
}
