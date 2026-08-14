"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function disconnectGoogleCalendar() {
  const user = await requireUser();
  await db
    .delete(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, user.id));
  redirect("/data-center/calendario");
}
