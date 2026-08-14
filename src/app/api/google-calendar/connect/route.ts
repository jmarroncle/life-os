import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  await requireUser();
  return NextResponse.redirect(buildGoogleAuthUrl());
}
