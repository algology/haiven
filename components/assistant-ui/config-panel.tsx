"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Key,
  MessageSquare,
  AlertTriangle,
  Building,
  Eye,
} from "lucide-react";

interface ValidatorConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
  description: string;
  category: "data-protection" | "content-safety" | "business-compliance";
}

const DEFAULT_VALIDATORS: ValidatorConfig[] = [
  // Data Protection
  {
    id: "pii-detection",
    name: "PII Detection",
    enabled: true,
    type: "privacy",
    description:
      "Detects personal identifiable information like names, emails, and phone numbers",
    category: "data-protection",
  },
  {
    id: "sensitive-data",
    name: "Financial & Medical Data",
    enabled: true,
    type: "privacy",
    description:
      "Identifies sensitive financial and medical information (SSN, credit cards)",
    category: "data-protection",
  },
  {
    id: "code-secrets",
    name: "API Keys & Secrets",
    enabled: true,
    type: "security",
    description:
      "Prevents exposure of API keys, passwords, and authentication tokens",
    category: "data-protection",
  },

  // Content Safety
  {
    id: "toxic-language",
    name: "Toxic Language",
    enabled: false,
    type: "content",
    description: "Filters harmful, abusive, or inappropriate language",
    category: "content-safety",
  },
  {
    id: "profanity-filter",
    name: "Profanity Filter",
    enabled: false,
    type: "content",
    description: "Blocks profane and offensive language",
    category: "content-safety",
  },

  // Business Compliance
  {
    id: "competitor-check",
    name: "Competitor Mentions",
    enabled: false,
    type: "business",
    description: "Detects mentions of competitor companies or products",
    category: "business-compliance",
  },
];

export function ConfigPanel() {
  const [validators, setValidators] =
    useState<ValidatorConfig[]>(DEFAULT_VALIDATORS);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["data-protection"])
  );

  // Save validator config to localStorage
  useEffect(() => {
    localStorage.setItem("haiven-validators", JSON.stringify(validators));

    // Dispatch custom event to notify other components
    const event = new CustomEvent("validators-changed", {
      detail: validators,
    });
    window.dispatchEvent(event);
  }, [validators]);

  // Load validator config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("haiven-validators");
    if (saved) {
      try {
        const parsedValidators = JSON.parse(saved);
        setValidators(parsedValidators);
      } catch (error) {
        console.error("Failed to parse saved validators:", error);
      }
    }
  }, []);

  const toggleValidator = (id: string) => {
    setValidators((prev) =>
      prev.map((validator) =>
        validator.id === id
          ? { ...validator, enabled: !validator.enabled }
          : validator
      )
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "data-protection":
        return <Shield className="w-4 h-4" />;
      case "content-safety":
        return <MessageSquare className="w-4 h-4" />;
      case "business-compliance":
        return <Building className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "data-protection":
        return "Data Protection";
      case "content-safety":
        return "Content Safety";
      case "business-compliance":
        return "Business Compliance";
      default:
        return "Other";
    }
  };

  const getValidatorIcon = (type: string) => {
    switch (type) {
      case "privacy":
        return <Shield className="w-4 h-4 text-blue-400" />;
      case "security":
        return <Key className="w-4 h-4 text-yellow-400" />;
      case "content":
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case "business":
        return <Building className="w-4 h-4 text-green-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (enabled: boolean, type: string) => {
    if (!enabled) return "bg-gray-500";
    switch (type) {
      case "privacy":
        return "bg-blue-500";
      case "security":
        return "bg-yellow-500";
      case "content":
        return "bg-purple-500";
      case "business":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const groupedValidators = validators.reduce((acc, validator) => {
    if (!acc[validator.category]) {
      acc[validator.category] = [];
    }
    acc[validator.category].push(validator);
    return acc;
  }, {} as Record<string, ValidatorConfig[]>);

  const enabledCount = validators.filter((v) => v.enabled).length;

  return (
    <div className="h-full bg-[#171717] rounded-lg border border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-semibold text-lg">
            Security Policies
          </h2>
        </div>
        <p className="text-gray-400 text-sm mb-3">
          Configure data loss prevention and content filtering
        </p>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-300">{enabledCount} active</span>
          </div>
          <div className="text-gray-500">•</div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span className="text-gray-400">
              {validators.length - enabledCount} disabled
            </span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedValidators).map(
          ([category, categoryValidators]) => (
            <div
              key={category}
              className="border-b border-gray-700 last:border-b-0"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getCategoryIcon(category)}
                  <span className="text-white font-medium text-sm">
                    {getCategoryTitle(category)}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    {categoryValidators.filter((v) => v.enabled).length}/
                    {categoryValidators.length}
                  </span>
                </div>
                <div
                  className={`transform transition-transform ${
                    expandedCategories.has(category) ? "rotate-90" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>

              {/* Category Validators */}
              {expandedCategories.has(category) && (
                <div className="pb-2">
                  {categoryValidators.map((validator) => (
                    <div
                      key={validator.id}
                      className="mx-4 mb-3 bg-[#1a1a1a] rounded-lg p-4 border border-gray-600/50 hover:border-gray-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          {getValidatorIcon(validator.type)}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium text-sm mb-1">
                              {validator.name}
                            </h3>
                            <p className="text-gray-400 text-xs leading-relaxed">
                              {validator.description}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleValidator(validator.id)}
                          className={`ml-3 relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                            validator.enabled ? "bg-blue-600" : "bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              validator.enabled
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Status Indicator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${getStatusColor(
                              validator.enabled,
                              validator.type
                            )} ${validator.enabled ? "animate-pulse" : ""}`}
                          />
                          <span className="text-xs text-gray-400">
                            {validator.enabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 capitalize">
                          {validator.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <AlertTriangle className="w-3 h-3" />
          <span>Policies are enforced in real-time during conversations</span>
        </div>
      </div>
    </div>
  );
}
