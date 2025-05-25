import { NextRequest, NextResponse } from "next/server";
import {
  pythonGuardrailsService,
  ValidatorConfig,
} from "@/lib/guardrails-python";

// Use Node.js runtime to support child_process
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    console.log("Validation API called");
    const { message, validators } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    if (!validators || !Array.isArray(validators)) {
      return NextResponse.json(
        { error: "Validators configuration is required" },
        { status: 400 }
      );
    }

    console.log("Validating message:", message);
    console.log(
      "Using validators:",
      (validators as ValidatorConfig[]).map((v) => v.name)
    );

    // Validate the message using Python Guardrails
    const result = await pythonGuardrailsService.validateText(
      message,
      validators as ValidatorConfig[]
    );

    console.log("Validation result:", result);

    return NextResponse.json({
      success: true,
      validation: result,
    });
  } catch (error) {
    console.error("Validation error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        error: "Validation failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
