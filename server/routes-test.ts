
import type { Express } from "express";

interface APITestResult {
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  duration: number;
  error?: string;
}

export async function testAPIEndpoints(baseUrl: string = "http://localhost:5000"): Promise<void> {
  console.log("\n=== Starting API Endpoints Testing ===\n");
  console.log(`Base URL: ${baseUrl}\n`);

  const results: APITestResult[] = [];

  async function testEndpoint(
    method: string,
    endpoint: string,
    expectedStatus: number = 200,
    headers: Record<string, string> = {},
    body?: any
  ): Promise<APITestResult> {
    const start = Date.now();
    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (body && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${baseUrl}${endpoint}`, options);
      const duration = Date.now() - start;

      return {
        endpoint,
        method,
        status: response.status,
        passed: response.status === expectedStatus,
        duration,
      };
    } catch (error) {
      return {
        endpoint,
        method,
        status: 0,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Test public endpoints
  results.push(await testEndpoint("GET", "/api/landing/hero"));
  results.push(await testEndpoint("GET", "/api/landing/benefits"));
  results.push(await testEndpoint("GET", "/api/landing/why-join"));
  results.push(await testEndpoint("GET", "/api/landing/testimonials"));
  results.push(await testEndpoint("GET", "/api/landing/events"));
  results.push(await testEndpoint("GET", "/api/landing/features"));
  results.push(await testEndpoint("GET", "/api/landing/statistics"));
  results.push(await testEndpoint("GET", "/api/landing/community"));

  // Test authentication endpoints (should return 401 without credentials)
  results.push(await testEndpoint("GET", "/api/auth/me", 401));
  results.push(await testEndpoint("GET", "/api/posts", 200));
  results.push(await testEndpoint("GET", "/api/jobs", 200));
  results.push(await testEndpoint("GET", "/api/events", 200));

  // Test database test endpoint
  results.push(await testEndpoint("GET", "/api/test/database"));

  // Print results
  console.log("\n=== API Test Results ===\n");

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result) => {
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    const color = result.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";

    console.log(
      `${color}${status}${reset} ${result.method} ${result.endpoint} - Status: ${result.status} (${result.duration}ms)`
    );

    if (!result.passed && result.error) {
      console.log(`     Error: ${result.error}`);
    }

    if (result.passed) passedCount++;
    else failedCount++;
  });

  console.log("\n=== API Test Summary ===");
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(
    `Success Rate: ${((passedCount / results.length) * 100).toFixed(2)}%`
  );

  if (failedCount > 0) {
    console.log("\n⚠️  Some API tests failed.");
  } else {
    console.log("\n✅ All API endpoint tests passed!");
  }
}

// Auto-run if executed directly
if (require.main === module) {
  testAPIEndpoints().catch(console.error);
}
