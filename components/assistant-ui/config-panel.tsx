"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Settings, Shield, Plus, X } from "lucide-react";

export const ConfigPanel = () => {
  const [validators, setValidators] = useState([
    { id: 1, name: "PII Detection", enabled: true, type: "guardrails" },
    { id: 2, name: "Sensitive Data", enabled: true, type: "guardrails" },
    { id: 3, name: "Code Secrets", enabled: false, type: "guardrails" },
  ]);

  const toggleValidator = (id: number) => {
    setValidators((prev) =>
      prev.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v))
    );
  };

  const removeValidator = (id: number) => {
    setValidators((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="flex flex-col gap-1.5 bg-[#171717] p-3 rounded-lg border border-white/10 h-full">
      {/* Header */}
      <div className="flex items-center justify-center mb-2 px-1">
        <Settings className="h-6 w-6 text-white" />
      </div>

      {/* Title */}
      <div className="mb-3">
        <h3 className="text-white font-semibold text-sm text-center">
          DLP Validators
        </h3>
        <p className="text-white/60 text-xs text-center mt-1">
          Guardrails AI Protection
        </p>
      </div>

      {/* Validators List */}
      <div className="space-y-2">
        {validators.map((validator) => (
          <div
            key={validator.id}
            className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/5"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-white text-sm font-medium">
                  {validator.name}
                </p>
                <p className="text-white/60 text-xs">{validator.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleValidator(validator.id)}
                className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                  validator.enabled ? "bg-blue-500" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                    validator.enabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <button
                onClick={() => removeValidator(validator.id)}
                className="text-white/60 hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Validator */}
      <Button
        className="data-[active]:bg-white/15 hover:bg-white/10 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-white border border-white/20 hover:border-white/30 transition-all duration-200 hover:text-white mt-3"
        variant="ghost"
        style={{ backgroundColor: "transparent" }}
      >
        <Plus className="w-4 h-4" />
        Add Validator
      </Button>

      {/* Status */}
      <div className="mt-4 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-green-400 text-xs font-medium">
            Protection Active
          </p>
        </div>
        <p className="text-green-400/80 text-xs mt-1">
          {validators.filter((v) => v.enabled).length} validators enabled
        </p>
      </div>
    </div>
  );
};
