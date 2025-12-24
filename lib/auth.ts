import Practice from "../app/models/practice";
import Provider from "../app/models/provider";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";
import logger from "@/lib/logger";
import { getDialstack } from "@/lib/dialstack";

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
      session.user.dialstackAccountId = token.user.dialstackAccountId;

      logger.info({ email: token.email }, "Got session for user");

      return session;
    },

    async jwt({ token, trigger, session, user }) {
      if (trigger === "update") {
        logger.info({ session }, "Updating session");
      }
      if (user) {
        token.user = { ...token.user, ...user };
      }
      return token;
    },
  },

  providers: [
    CredentialsProvider({
      id: "updateemail",
      name: "Email",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        await dbConnect();
        let user = null;
        try {
          const email = credentials?.email;
          if (!email) {
            logger.info("Could not find an email for provider");
            return null;
          }

          user = await Practice.findByEmail(email);
          if (!user) {
            return null;
          }

          const password = credentials?.password;
          if (!password) {
            logger.info("Could not find a password");
            return null;
          }

          const isValid = await Practice.validatePassword(user, password);
          if (!isValid) {
            logger.info("Invalid password");
            return null;
          }
        } catch (err) {
          logger.warn(
            { err },
            "Got an error authorizing a user during email update",
          );
          return null;
        }

        return {
          id: user.id?.toString(),
          email: user.email,
          dialstackAccountId: user.dialstack_account_id,
        };
      },
    }),
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
          dialstackAccountId: user.dialstack_account_id,
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

          // Create DialStack account
          logger.info("Creating DialStack account...");
          const account = await getDialstack().accounts.create({ email });
          logger.info({ accountId: account.id }, "DialStack account created");

          // Store the DialStack account ID (user created on-demand when needed)
          await Practice.update(email, { dialstack_account_id: account.id });

          // Create default providers for the practice
          logger.info("Creating default providers...");
          await Provider.createDefaults(user!.id!);
          logger.info("Default providers created");

          return {
            id: user!.id?.toString(),
            email: user!.email,
            dialstackAccountId: account.id,
          };
        } catch (error: unknown) {
          logger.error(
            {
              err: error,
              message: error instanceof Error ? error.message : String(error),
            },
            "Got an error authorizing and creating a user during signup",
          );
          return null;
        }
      },
    }),
  ],
};
