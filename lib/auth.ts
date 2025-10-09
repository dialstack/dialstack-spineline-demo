import Practice from "../app/models/practice";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";
import logger from "@/lib/logger";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
    signOut: "/",
  },

  callbacks: {
    async signIn({ user }) {
      logger.info({ user }, "Signing in user");
      return true;
    },

    async session({ session, token }) {
      session.user.email = token.email;

      logger.info({ email: token.email }, "Got session for user");

      return session;
    },

    async jwt({ token, trigger, session, user }) {
      if (trigger === "update") {
        logger.info({ session }, "Updating session");
      }
      if (user) {
        token.user = Object.assign(token.user || {}, user);
      }
      return token;
    },
  },

  providers: [
    CredentialsProvider({
      id: "login",
      name: "Email & Password",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        await dbConnect();
        let user = null;
        try {
          const email = credentials?.email;
          const password = credentials?.password;
          if (!email) {
            logger.info("Could not find an email for provider");
            return null;
          }

          user = await Practice.findByEmail(email);
          if (!user) {
            return null;
          }

          const isValid = await Practice.validatePassword(user, password);
          if (!isValid) {
            return null;
          }
        } catch (err) {
          logger.warn({ err }, "Got an error authorizing a user during login");
          return null;
        }

        return {
          id: user.id?.toString(),
          email: user.email,
        };
      },
    }),
    CredentialsProvider({
      id: "signup",
      name: "Email & Password",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        await dbConnect();
        logger.info("Signing up");

        const email = credentials?.email;
        const password = credentials?.password;
        if (!email) {
          logger.info("Could not find an email for authorization");
          return null;
        }

        let user = null;
        try {
          // Look for existing user.
          user = await Practice.findByEmail(email);
          if (user) {
            logger.info("Found an existing user, cannot sign up again");
            return null;
          }

          logger.info("Creating Practice...");
          user = await Practice.create({
            email,
            password,
          });
          logger.info("Practice was created");
        } catch (error: unknown) {
          logger.error(
            { error },
            "Got an error authorizing and creating a user during signup",
          );
          return null;
        }

        return {
          id: user!.id?.toString(),
          email: user!.email,
        };
      },
    }),
  ],
};
