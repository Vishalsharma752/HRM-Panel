import { NextResponse } from "next/server";
import { getAuthUser, isAuthorized } from "../../../../lib/auth";
import { getServiceClient } from "../../../../lib/supabase";

export async function PUT(req: Request) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isAuthorized(authUser, ["Founder", "Cofounder"])) {
      return NextResponse.json({ error: "Forbidden: Administrative access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 });
    }

    const service = getServiceClient();

    // Map incoming properties to database schema format
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.full_name = updates.name.trim();
    if (updates.email !== undefined) dbUpdates.official_email = updates.email.trim();
    if (updates.phone !== undefined) dbUpdates.mobile = updates.phone.trim();
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.designation !== undefined) dbUpdates.designation = updates.designation;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.joinDate !== undefined) dbUpdates.doj = updates.joinDate;
    if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.manager !== undefined) dbUpdates.manager = updates.manager;
    if (updates.salary !== undefined) dbUpdates.salary = updates.salary;
    if (updates.password !== undefined) dbUpdates.password = updates.password;

    const { data: updatedEmp, error: updateError } = await service
      .from("employees")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[Employees Update] Database error:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, employee: updatedEmp });
  } catch (error: any) {
    console.error("[Employees Update] Server Exception:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export async function POST(req: Request) { return PUT(req); } // support POST fallback for standard HTML form actions
