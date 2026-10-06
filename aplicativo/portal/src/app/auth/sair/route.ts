import { NextResponse } from "next/server";

import { urlDoSite } from "@/servicos/config/env";
import { clienteSupabase } from "@/servicos/supabase/servidor";

export async function POST() {
  const supabase = await clienteSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${urlDoSite()}/login`, { status: 303 });
}
