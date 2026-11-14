import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-ink/70">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-teal hover:underline">Log in</Link>
      </p>
      <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-6 md:p-8">
        <RegisterForm />
      </div>
    </div>
  );
}