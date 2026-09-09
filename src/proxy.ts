import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) {
    return NextResponse.next();
  }

  const login = new URL("/login", req.nextUrl.origin);
  login.searchParams.set("callbackUrl", req.nextUrl.pathname);
  return NextResponse.redirect(login);
});

export const config = {
  matcher: [
    "/chat",
    "/chat/:path*",
    "/inbox",
    "/search",
    "/conversations",
    "/profile",
    "/settings",
    "/help",
    "/onboarding",
    "/onboarding/:path*",
  ],
};
