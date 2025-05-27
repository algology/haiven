"use client";

import { useState, useEffect } from "react";

interface ValidatorConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
}

const DEFAULT_VALIDATORS: ValidatorConfig[] = [
  {
    id: "pii-detection",
    name: "PII Detection",
    enabled: true,
    type: "privacy",
  },
  {
    id: "sensitive-data",
    name: "Sensitive Data",
    enabled: true,
    type: "privacy",
  },
  {
    id: "code-secrets",
    name: "Code Secrets",
    enabled: false,
    type: "security",
  },
];

export function ConfigPanel() {
  const [validators, setValidators] =
    useState<ValidatorConfig[]>(DEFAULT_VALIDATORS);

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

  const getStatusColor = (enabled: boolean, type: string) => {
    if (!enabled) return "bg-gray-500";
    return type === "privacy" ? "bg-red-500" : "bg-yellow-500";
  };

  const getTypeIcon = (type: string) => {
    return type === "privacy" ? "🔒" : "🔑";
  };

  return (
    <div className="h-full bg-[#171717] rounded-lg border border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-white font-semibold text-lg">DLP Policies</h2>
        <p className="text-gray-400 text-sm mt-1">
          Configure data loss prevention policies
        </p>
      </div>

      {/* Validators List */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {validators.map((validator) => (
          <div
            key={validator.id}
            className="bg-[#212121] rounded-lg p-4 border border-gray-600"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getTypeIcon(validator.type)}</span>
                <div>
                  <h3 className="text-white font-medium">{validator.name}</h3>
                  <p className="text-gray-400 text-xs capitalize">
                    {validator.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleValidator(validator.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  validator.enabled ? "bg-blue-600" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    validator.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${getStatusColor(
                  validator.enabled,
                  validator.type
                )} ${validator.enabled ? "animate-pulse" : ""}`}
              />
              <span className="text-xs text-gray-400">
                {validator.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs text-center">
          Policies are enforced automatically during chat
        </p>
      </div>
    </div>
  );
}
