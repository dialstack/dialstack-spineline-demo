import Practice from "../app/models/practice";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";

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
      console.log("Signing in user", user);
      return true;
    },

    async session({ session, token }) {
      session.user.email = token.email;

      console.log(`Got session for user ${token.email}`);

      return session;
    },

    async jwt({ token, trigger, session, user }) {
      if (trigger === "update") {
        console.log("Updating session", session);
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
            console.log("Could not find an email for provider");
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
          console.warn("Got an error authorizing a user during login", err);
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
        console.log("Signing up");

        const email = credentials?.email;
        const password = credentials?.password;
        if (!email) {
          console.log("Could not find an email for aurhotization");
          return null;
        }

        let user = null;
        try {
          // Look for existing user.
          user = await Practice.findByEmail(email);
          if (user) {
            console.log("Found an existing user, cannot sign up again");
            return null;
          }

          console.log("Creating Practice...");
          user = await Practice.create({
            email,
            password,
          });
          console.log("Practice was created");
        } catch (error: unknown) {
          console.log(
            "Got an error authorizing and creating a user during signup",
            error,
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
