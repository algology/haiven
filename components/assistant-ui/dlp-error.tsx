import { AlertTriangle, Shield, Key, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DLPViolation {
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
}

interface DLPErrorProps {
  violations: DLPViolation[];
  onDismiss?: () => void;
}

export function DLPError({ violations, onDismiss }: DLPErrorProps) {
  const getViolationIcon = (type: string) => {
    if (
      type.toLowerCase().includes("pii") ||
      type.toLowerCase().includes("personal")
    ) {
      return <Shield className="w-5 h-5 text-red-400" />;
    }
    if (
      type.toLowerCase().includes("secret") ||
      type.toLowerCase().includes("key")
    ) {
      return <Key className="w-5 h-5 text-yellow-400" />;
    }
    return <Eye className="w-5 h-5 text-blue-400" />;
  };

  const getViolationTitle = (type: string) => {
    if (
      type.toLowerCase().includes("pii") ||
      type.toLowerCase().includes("personal")
    ) {
      return "Personal Information Detected";
    }
    if (
      type.toLowerCase().includes("secret") ||
      type.toLowerCase().includes("key")
    ) {
      return "Sensitive Credentials Detected";
    }
    return "Sensitive Content Detected";
  };

  const getViolationDescription = (type: string) => {
    if (
      type.toLowerCase().includes("pii") ||
      type.toLowerCase().includes("personal")
    ) {
      return "Your message contains personal information like names, emails, or addresses that could be sensitive.";
    }
    if (
      type.toLowerCase().includes("secret") ||
      type.toLowerCase().includes("key")
    ) {
      return "Your message contains API keys, passwords, or other credentials that should be kept private.";
    }
    return "Your message contains content that may be sensitive or confidential.";
  };

  const getSuggestions = (type: string) => {
    if (
      type.toLowerCase().includes("pii") ||
      type.toLowerCase().includes("personal")
    ) {
      return [
        "Remove or replace names with generic terms like 'my colleague' or 'the user'",
        "Replace email addresses with examples like 'user@example.com'",
        "Use placeholders for addresses like '123 Main Street'",
        "Avoid sharing phone numbers or ID numbers",
      ];
    }
    if (
      type.toLowerCase().includes("secret") ||
      type.toLowerCase().includes("key")
    ) {
      return [
        "Remove API keys and use placeholders like 'YOUR_API_KEY'",
        "Replace passwords with 'YOUR_PASSWORD'",
        "Use example tokens like 'sk-example123...'",
        "Avoid sharing database connection strings",
      ];
    }
    return [
      "Review your message for sensitive information",
      "Use generic examples instead of real data",
      "Consider if this information needs to be shared",
    ];
  };

  // Get the primary violation for display
  const primaryViolation = violations[0];
  const violationIcon = getViolationIcon(primaryViolation.type);
  const violationTitle = getViolationTitle(primaryViolation.type);
  const violationDescription = getViolationDescription(primaryViolation.type);
  const suggestions = getSuggestions(primaryViolation.type);

  return (
    <div className="mx-auto flex w-full max-w-screen-md gap-3 mb-4">
      <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-[24px] border border-red-500/20 bg-red-500/10">
        <AlertTriangle className="w-4 h-4 text-red-400" />
      </div>

      <div className="pt-1 flex-1">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            {violationIcon}
            <h3 className="text-red-200 font-medium">{violationTitle}</h3>
          </div>

          {/* Description */}
          <p className="text-red-100/80 text-sm mb-4">{violationDescription}</p>

          {/* Suggestions */}
          <div className="mb-4">
            <h4 className="text-red-200 text-sm font-medium mb-2">
              How to fix this:
            </h4>
            <ul className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="text-red-100/70 text-sm flex items-start gap-2"
                >
                  <span className="text-red-400 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Multiple violations indicator */}
          {violations.length > 1 && (
            <div className="mb-4 p-2 bg-red-500/5 border border-red-500/10 rounded">
              <p className="text-red-100/60 text-xs">
                {violations.length} security policies were triggered by your
                message.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="outline"
                size="sm"
                className="bg-red-500/10 border-red-500/30 text-red-200 hover:bg-red-500/20 hover:border-red-500/40"
              >
                Got it
              </Button>
            )}
            <Button
              onClick={() => {
                // Focus back to the input
                const input = document.querySelector(
                  'textarea[placeholder*="Message"]'
                ) as HTMLTextAreaElement;
                if (input) {
                  input.focus();
                }
              }}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Edit message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
