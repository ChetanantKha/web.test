"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginWithNickname } from "@/app/login/actions";
import ErrorAlert from "@/components/ErrorAlert";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await loginWithNickname(nickname);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Image
        src="/logo.jpg"
        alt="T-STAR Academy"
        width={112}
        height={112}
        priority
        className="rounded-2xl shadow-lg"
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">เข้าสู่ระบบ</h1>
        <p className="text-sm text-gray-500">ระบบจัดการผู้สอนกีฬา — พิมพ์ชื่อเล่นของคุณ</p>

        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="nickname">
            ชื่อเล่น
          </label>
          <input
            id="nickname"
            type="text"
            required
            autoFocus
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        {error && <ErrorAlert message={error} />}

        <button
          type="submit"
          disabled={pending}
          className="active:scale-95 transition-transform duration-100 w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
