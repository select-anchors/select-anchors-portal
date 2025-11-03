// app/page.js
export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/nextauth-options";

export default async function Home() {
  // Be defensive: don't crash build if something throws
  const session = await getServerSession(authOptions);

  if (!session?.user?.role) {
    redirect("/login");
  }

  switch (session.user.role) {
    case "admin":
      redirect("/dashboard");
    case "employee":
      redirect("/driver/my-day");
    case "customer":
      redirect("/wells");
    default:
      redirect("/login");
  }

  // Should never hit, but keeps the function well-formed
  return null;
}
