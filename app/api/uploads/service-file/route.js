// app/api/uploads/service-file/route.js
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function safeFileName(name = "file") {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const fileType = String(form.get("file_type") || "other");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, JPG, PNG, and WEBP files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be 15MB or smaller." },
        { status: 400 }
      );
    }

    const cleanName = safeFileName(file.name);
    const pathname = `service-files/${session.user.id}/${Date.now()}-${fileType}-${cleanName}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      ok: true,
      file_type: fileType,
      file_url: blob.url,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });
  } catch (err) {
    console.error("[SERVICE_FILE_UPLOAD_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
