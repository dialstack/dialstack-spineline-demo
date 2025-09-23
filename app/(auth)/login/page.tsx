import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Form from "./form";

export default async function Login() {
  const session = await getServerSession();

  if (session) {
    redirect("/home");
  }

  return (
    <>
      <div>
        <h2 className="pb-2 text-2xl font-semibold">Log in</h2>
      </div>
      <div className="flex flex-col gap-y[24x]">
        <Form />
        <div>
          New user?{" "}
          <Link href="/signup" className="font-medium">
            Create an account{" "}
          </Link>
        </div>
      </div>
    </>
  );
}
