import { DialStack } from "@dialstack/sdk/server";

export const dialstack = new DialStack(process.env.DIALSTACK_SECRET_KEY, {
  apiUrl: process.env.DIALSTACK_API_URL,
});
