#!/usr/bin/env node

/**
 * Production Deployment Test Script
 *
 * This script tests the production deployment of the Haiven DLP system
 * to ensure all components are working correctly.
 */

const https = require("https");

const BASE_URL = process.argv[2] || "https://haiven.vercel.app";

console.log(`🧪 Testing production deployment at: ${BASE_URL}`);
console.log("=".repeat(60));

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = res.headers["content-type"]?.includes(
            "application/json"
          )
            ? JSON.parse(data)
            : data;
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testHealthCheck() {
  console.log("1. Testing Python validation service health...");

  try {
    const response = await makeRequest(`${BASE_URL}/api/python-validate`);

    if (response.status === 200) {
      console.log("   ✅ Health check passed");
      console.log(`   📊 Status: ${JSON.stringify(response.data, null, 2)}`);
    } else if (response.status === 401 || response.status === 501) {
      console.log("   ⚠️  Deployment protection is enabled");
      console.log(
        "   🔒 This is expected for production - disable in Vercel dashboard for testing"
      );
      console.log(
        "   📋 Go to: Vercel Dashboard → Your Project → Settings → Deployment Protection"
      );
    } else {
      console.log(`   ❌ Health check failed with status: ${response.status}`);
      console.log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`   ❌ Health check error: ${error.message}`);
  }

  console.log("");
}

async function testValidation() {
  console.log("2. Testing validation with safe text...");

  const safePayload = JSON.stringify({
    text: "Hello, how are you today?",
    enabled_validators: ["PII Detection"],
  });

  try {
    const response = await makeRequest(`${BASE_URL}/api/python-validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(safePayload),
      },
      body: safePayload,
    });

    if (response.status === 200 && response.data.passed) {
      console.log("   ✅ Safe text validation passed");
    } else {
      console.log(
        `   ❌ Safe text validation failed: ${JSON.stringify(
          response.data,
          null,
          2
        )}`
      );
    }
  } catch (error) {
    console.log(`   ❌ Safe text validation error: ${error.message}`);
  }

  console.log("");
}

async function testPIIDetection() {
  console.log("3. Testing PII detection...");

  const piiPayload = JSON.stringify({
    text: "My email is john.doe@example.com and my phone is 555-123-4567",
    enabled_validators: ["PII Detection"],
  });

  try {
    const response = await makeRequest(`${BASE_URL}/api/python-validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(piiPayload),
      },
      body: piiPayload,
    });

    if (response.status === 200 && !response.data.passed) {
      console.log(
        "   ✅ PII detection working correctly (blocked sensitive data)"
      );
      console.log(`   🚫 Violations: ${response.data.violations.length}`);
    } else if (response.status === 200 && response.data.passed) {
      console.log(
        "   ⚠️  PII detection may not be working (allowed sensitive data through)"
      );
    } else {
      console.log(
        `   ❌ PII detection test failed: ${JSON.stringify(
          response.data,
          null,
          2
        )}`
      );
    }
  } catch (error) {
    console.log(`   ❌ PII detection test error: ${error.message}`);
  }

  console.log("");
}

async function testChatAPI() {
  console.log("4. Testing chat API integration...");

  const chatPayload = JSON.stringify({
    messages: [{ role: "user", content: "Hello, how can you help me today?" }],
    validators: [
      {
        id: "pii-detection",
        name: "PII Detection",
        enabled: true,
        type: "privacy",
      },
    ],
  });

  try {
    const response = await makeRequest(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(chatPayload),
      },
      body: chatPayload,
    });

    if (response.status === 200) {
      console.log("   ✅ Chat API responding correctly");
    } else {
      console.log(`   ❌ Chat API failed with status: ${response.status}`);
      console.log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`   ❌ Chat API test error: ${error.message}`);
  }

  console.log("");
}

async function runTests() {
  console.log("🚀 Starting production deployment tests...\n");

  await testHealthCheck();
  await testValidation();
  await testPIIDetection();
  await testChatAPI();

  console.log("✨ Test suite completed!");
  console.log("\n📋 Next steps:");
  console.log("   1. Check Vercel function logs if any tests failed");
  console.log("   2. Verify environment variables are set correctly");
  console.log("   3. Test the frontend at your deployed URL");
}

// Run the tests
runTests().catch(console.error);
