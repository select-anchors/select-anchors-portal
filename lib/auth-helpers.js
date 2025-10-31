import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    throw new Error("NOT_AUTHORIZED");
  }
  return session;
}
