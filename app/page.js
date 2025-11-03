// /app/page.js
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If not signed in, go to login
  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;

  // Role-based redirect
  if (role === "admin") {
    redirect("/dashboard");
  } else if (role === "employee") {
    redirect("/driver/my-day");
  } else if (role === "customer") {
    redirect("/wells");
  } else {
    redirect("/login");
  }

  // Fallback
  return null;
}
