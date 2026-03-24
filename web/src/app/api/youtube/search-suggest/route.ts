import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies YouTube search autocomplete (browser CORS blocks direct calls).
 * Response shape from Google: ["query", ["s1","s2",...], ...]
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] as string[] });
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ suggestions: [] as string[] });
    }
    const data: unknown = await res.json();
    const raw =
      Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    const suggestions = raw
      .filter((x): x is string => typeof x === "string")
      .slice(0, 10);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] as string[] });
  }
}
