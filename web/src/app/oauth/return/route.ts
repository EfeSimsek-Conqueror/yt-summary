import { handleOAuthCallback } from "@/lib/auth/handle-oauth-callback";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}
