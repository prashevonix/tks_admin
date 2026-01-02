
import { supabase } from "../shared/supabase";

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
}

async function runTest(
  name: string,
  testFn: () => Promise<any>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await testFn();
    return {
      name,
      passed: true,
      duration: Date.now() - start,
      details: result,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testDatabaseConnection() {
  console.log("\n=== Starting Comprehensive Database Connection Tests ===\n");

  const results: TestResult[] = [];

  // Test 1: Basic Connection
  results.push(
    await runTest("Basic Database Connection", async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .limit(1);
      if (error) throw error;
      return { status: "Connected", recordExists: data && data.length > 0 };
    })
  );

  // Test 2: Users Table CRUD
  results.push(
    await runTest("Users Table - Read", async () => {
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalUsers: count };
    })
  );

  // Test 3: Alumni Table CRUD
  results.push(
    await runTest("Alumni Table - Read", async () => {
      const { count, error } = await supabase
        .from("alumni")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalAlumni: count };
    })
  );

  // Test 4: Feed Posts Table
  results.push(
    await runTest("Feed Posts Table - Read", async () => {
      const { count, error } = await supabase
        .from("feed_posts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalPosts: count };
    })
  );

  // Test 5: Jobs Table
  results.push(
    await runTest("Jobs Table - Read", async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalJobs: count };
    })
  );

  // Test 6: Events Table
  results.push(
    await runTest("Events Table - Read", async () => {
      const { count, error } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalEvents: count };
    })
  );

  // Test 7: Messages Table
  results.push(
    await runTest("Messages Table - Read", async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalMessages: count };
    })
  );

  // Test 8: Notifications Table
  results.push(
    await runTest("Notifications Table - Read", async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalNotifications: count };
    })
  );

  // Test 9: Connection Requests Table
  results.push(
    await runTest("Connection Requests Table - Read", async () => {
      const { count, error } = await supabase
        .from("connection_requests")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalConnectionRequests: count };
    })
  );

  // Test 10: Signup Requests Table
  results.push(
    await runTest("Signup Requests Table - Read", async () => {
      const { count, error } = await supabase
        .from("signup_requests")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalSignupRequests: count };
    })
  );

  // Test 11: Post Likes Table
  results.push(
    await runTest("Post Likes Table - Read", async () => {
      const { count, error } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalLikes: count };
    })
  );

  // Test 12: Post Comments Table
  results.push(
    await runTest("Post Comments Table - Read", async () => {
      const { count, error } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalComments: count };
    })
  );

  // Test 13: Complex Join Query (Users + Alumni)
  results.push(
    await runTest("Complex Join Query - Users + Alumni", async () => {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          username,
          email,
          alumni:alumni(first_name, last_name, graduation_year)
        `
        )
        .limit(5);
      if (error) throw error;
      return { recordsFetched: data?.length || 0 };
    })
  );

  // Test 14: Complex Join Query (Posts + Author + Comments)
  results.push(
    await runTest("Complex Join Query - Posts with Author and Comments", async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select(
          `
          id,
          content,
          created_at,
          author:users!author_id(username, email)
        `
        )
        .eq("is_active", true)
        .limit(5);
      if (error) throw error;
      return { recordsFetched: data?.length || 0 };
    })
  );

  // Test 15: Write Test (Create and Delete)
  results.push(
    await runTest("Write Test - Create and Delete Test Record", async () => {
      // Create a test notification
      const { data: created, error: createError } = await supabase
        .from("notifications")
        .insert({
          user_id: "00000000-0000-0000-0000-000000000000", // Test UUID
          type: "test",
          title: "Database Test",
          content: "This is a test notification",
          is_read: false,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Delete the test notification
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", created.id);

      if (deleteError) throw deleteError;

      return { created: true, deleted: true };
    })
  );

  // Test 16: Real-time Subscription Test
  results.push(
    await runTest("Real-time Subscription Setup", async () => {
      const channel = supabase
        .channel("test-channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          (payload) => {
            console.log("Real-time event received:", payload);
          }
        )
        .subscribe();

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await supabase.removeChannel(channel);

      return { subscriptionWorking: true };
    })
  );

  // Test 17: Environment Variables Check
  results.push(
    await runTest("Environment Variables Check", async () => {
      const hasUrl = !!process.env.SUPABASE_URL;
      const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!hasUrl || !hasAnonKey) {
        throw new Error("Missing required environment variables");
      }

      return {
        SUPABASE_URL: hasUrl ? "Set" : "Missing",
        SUPABASE_ANON_KEY: hasAnonKey ? "Set" : "Missing",
        SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? "Set" : "Missing",
      };
    })
  );

  // Test 18: Storage Buckets
  results.push(
    await runTest("Storage Buckets Check", async () => {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) throw error;

      const bucketNames = buckets?.map((b) => b.name) || [];
      return {
        totalBuckets: buckets?.length || 0,
        buckets: bucketNames,
      };
    })
  );

  // Test 19: LinkedIn Integration Table
  results.push(
    await runTest("LinkedIn Integration Table - Read", async () => {
      const { count, error } = await supabase
        .from("linkedin_integrations")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalIntegrations: count };
    })
  );

  // Test 20: Event RSVPs Table
  results.push(
    await runTest("Event RSVPs Table - Read", async () => {
      const { count, error } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { totalRSVPs: count };
    })
  );

  // Print Results
  console.log("\n=== Test Results Summary ===\n");

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result) => {
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    const color = result.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";

    console.log(
      `${color}${status}${reset} ${result.name} (${result.duration}ms)`
    );

    if (result.passed && result.details) {
      console.log(`     ${JSON.stringify(result.details)}`);
    }

    if (!result.passed && result.error) {
      console.log(`     Error: ${result.error}`);
    }

    if (result.passed) passedCount++;
    else failedCount++;
  });

  console.log("\n=== Overall Summary ===");
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(
    `Success Rate: ${((passedCount / results.length) * 100).toFixed(2)}%`
  );

  if (failedCount > 0) {
    console.log("\n⚠️  Some tests failed. Please review the errors above.");
    process.exit(1);
  } else {
    console.log("\n✅ All database connection tests passed!");
    process.exit(0);
  }
}

// Run tests
testDatabaseConnection().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});
