import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      {message === "confirmed" && (
        <p className="mt-4 rounded-xl bg-teal/10 px-4 py-3 text-sm text-navy">
          Your email is confirmed. Please log in.
        </p>
      )}
      <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-6 md:p-8">
        <LoginForm />
      </div>
      <p className="mt-5 text-center text-sm text-ink/70">
        New to Floora-X?{" "}
        <Link href="/register" className="font-semibold text-teal hover:underline">Create an account</Link>
      </p>
    </div>
  );
}