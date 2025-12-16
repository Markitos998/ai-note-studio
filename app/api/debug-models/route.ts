import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.FIREBASE_API_KEY_FOR_AI!;

// Debug route to list available models
// Note: This should be disabled in production or protected with authentication
export async function GET() {
  // Disable in production for security
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    if (!res.ok) {
      console.error("Failed to fetch models:", res.status);
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Error fetching models" },
      { status: 500 }
    );
  }
}

