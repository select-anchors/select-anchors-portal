// /app/driver/my-day/page.js
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function MyDay() {
  const { isAuthenticated, role } = await getSession();
  if (!isAuthenticated) redirect("/login");
  if (role !== "admin" && role !== "employee") redirect("/dashboard");

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-4">My Day</h1>
      <p className="text-gray-600">Dispatch board for employees and admins.</p>
      {/* your board UI here */}
    </div>
  );
}
