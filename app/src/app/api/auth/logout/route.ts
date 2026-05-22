import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authCookieOptions } from "@/src/lib/cookie-options";

export async function POST() {
  const cookieStore = await cookies();

  // Mantém os mesmos flags do login pro browser substituir o cookie
  cookieStore.set(AUTH_COOKIE, "", {
    ...authCookieOptions(),
    expires: new Date(0),
  });

  return NextResponse.json({ success: true });
}
