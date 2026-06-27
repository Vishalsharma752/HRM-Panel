import { NextResponse } from "next/server";
import { getAuthUser, isAuthorized } from "../../../../lib/auth";
import { getServiceClient } from "../../../../lib/supabase";

export async function DELETE(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isAuthorized(authUser, ["Founder", "Cofounder"])) {
      return NextResponse.json({ error: "Forbidden: Administrative access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    
    let id = idStr ? parseInt(idStr, 10) : null;
    if (!id) {
      try {
        const body = await req.json();
        id = body.id ? parseInt(body.id, 10) : null;
      } catch {}
    }

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Missing or invalid required parameter: id" }, { status: 400 });
    }

    const service = getServiceClient();

    // Prevent deletion of administrative/founder accounts
    const { data: targetEmp, error: checkErr } = await service
      .from("employees")
      .select("role")
      .eq("id", id)
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }

    if (!targetEmp) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    if (targetEmp.role === "Founder") {
      return NextResponse.json({ error: "Forbidden: Founder accounts cannot be deleted." }, { status: 403 });
    }

    const { error: deleteError } = await service
      .from("employees")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[Employees Delete] Database error:", deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Employee record with ID ${id} deleted successfully.` });
  } catch (error: any) {
    console.error("[Employees Delete] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) { return DELETE(req); }
