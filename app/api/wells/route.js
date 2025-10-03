import { NextResponse } from "next/server";
import { createClient } from "@vercel/edge-config";

const edgeConfig = createClient(process.env.EDGE_CONFIG);

export async function POST(req) {
  try {
    const data = await req.json();
    const wells = (await edgeConfig.get("wells")) || [];

    wells.push({
      id: Date.now().toString(),
      ...data,
    });

    await edgeConfig.set("wells", wells);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
