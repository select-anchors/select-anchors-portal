// /lib/session.js
import { cookies } from "next/headers";

export async function getSession() {
  const c = cookies();
  const email = c.get("sa_email")?.value || null;
  const role = c.get("sa_role")?.value || "customer";
  const userId = c.get("sa_user")?.value || null;

  return {
    email,
    role,
    userId,
    isAuthenticated: !!email,
  };
}
