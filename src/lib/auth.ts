import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  appName: "AdelAtende",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "http://192.168.15.12:3003",
    "https://atende.adelweb.com.br",
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ].filter((origin): origin is string => Boolean(origin)),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [
    organization({
      organizationLimit: 1,
      schema: {
        organization: {
          additionalFields: {
            emailDomain: {
              type: "string",
              required: true,
              input: true,
            },
            document: {
              type: "string",
              required: false,
              input: true,
            },
            tradeName: {
              type: "string",
              required: false,
              input: true,
            },
            phone: {
              type: "string",
              required: false,
              input: true,
            },
          },
        },
      },
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const { joinCompanyByEmailDomain } = await import(
            "@/lib/company-membership"
          );
          await joinCompanyByEmailDomain(user.id, user.email);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const { getMembershipOrganizationId } = await import(
            "@/lib/company-membership"
          );
          const organizationId = await getMembershipOrganizationId(
            session.userId
          );

          if (!organizationId) {
            return;
          }

          return {
            data: {
              ...session,
              activeOrganizationId: organizationId,
            },
          };
        },
      },
    },
  },
});
