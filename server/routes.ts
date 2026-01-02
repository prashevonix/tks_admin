import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import {
  users,
  alumni,
  feedPosts,
  postLikes,
  postComments,
  signupRequests,
} from "../shared/schema";
import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import multer from "multer";
import { importExcelData } from "./import";
import { createClient } from "@supabase/supabase-js";
// Initialize Supabase client with proper credentials
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Excel import endpoint
  app.post("/api/admin/import-excel", upload.single("file"), importExcelData);

  // File upload endpoint for profile pictures
  app.post(
    "/api/upload/profile-picture",
    upload.single("file"),
    async (req, res) => {
      try {
        const userId = req.headers["user-id"] as string;

        if (!userId) {
          return res.status(401).json({ error: "No user ID provided" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;

        // File size limit: 5MB for profile pictures
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          return res.status(400).json({ error: "File size exceeds 5MB limit" });
        }

        // Only allow image files
        const fileExt = file.originalname.split(".").pop()?.toLowerCase() || "";
        if (!["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
          return res
            .status(400)
            .json({
              error: "Only image files are allowed for profile pictures",
            });
        }

        const timestamp = Date.now();
        const filePath = `${userId}/avatar_${timestamp}.${fileExt}`;

        console.log(`Uploading profile picture: ${filePath}`);

        // Upload to Supabase Storage bucket 'profile-pictures'
        const { data, error } = await supabase.storage
          .from("profile-pictures")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true, // Allow replacing existing profile pictures
          });

        if (error) {
          console.error("Profile picture upload error:", error);
          return res
            .status(500)
            .json({ error: "Failed to upload profile picture" });
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

        console.log(`Profile picture uploaded: ${publicUrl}`);

        res.json({
          url: publicUrl,
          fileName: filePath,
        });
      } catch (error) {
        console.error("Profile picture upload error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // File upload endpoint for post attachments
  app.post(
    "/api/upload/post-attachment",
    upload.single("file"),
    async (req, res) => {
      try {
        const userId = req.headers["user-id"] as string;

        if (!userId) {
          return res.status(401).json({ error: "No user ID provided" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;

        // File size limit: 10MB
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          return res
            .status(400)
            .json({ error: "File size exceeds 10MB limit" });
        }

        // Determine file type and folder
        const fileExt = file.originalname.split(".").pop()?.toLowerCase() || "";
        let fileType = "documents";

        if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileExt)) {
          fileType = "images";
        } else if (["mp4", "webm", "mov", "avi"].includes(fileExt)) {
          fileType = "videos";
        } else if (
          ["pdf", "doc", "docx", "txt", "xlsx", "xls", "ppt", "pptx"].includes(
            fileExt,
          )
        ) {
          fileType = "documents";
        }

        const timestamp = Date.now();
        const sanitizedFilename = file.originalname.replace(
          /[^a-zA-Z0-9.-]/g,
          "_",
        );
        const filePath = `${fileType}/${userId}/${timestamp}_${sanitizedFilename}`;

        console.log(`Uploading file to Supabase Storage: ${filePath}`);

        // Upload to Supabase Storage bucket 'post-attachments'
        const { data, error } = await supabase.storage
          .from("post-attachments")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          console.error("Supabase Storage upload error:", error);
          return res
            .status(500)
            .json({ error: "Failed to upload file to storage" });
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("post-attachments").getPublicUrl(filePath);

        console.log(`File uploaded successfully: ${publicUrl}`);

        res.json({
          url: publicUrl,
          fileName: filePath,
          fileType: fileType,
          size: file.size,
          mimeType: file.mimetype,
        });
      } catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // File upload endpoint for event cover images
  app.post(
    "/api/upload/event-cover",
    upload.single("file"),
    async (req, res) => {
      try {
        const userId = req.headers["user-id"] as string;
        const eventId = req.body.eventId;

        if (!userId) {
          return res.status(401).json({ error: "No user ID provided" });
        }

        if (!eventId) {
          return res.status(400).json({ error: "Event ID is required" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;

        // File size limit: 5MB for event covers
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          return res.status(400).json({ error: "File size exceeds 5MB limit" });
        }

        // Only allow image files
        const fileExt = file.originalname.split(".").pop()?.toLowerCase() || "";
        if (!["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
          return res
            .status(400)
            .json({ error: "Only image files are allowed for event covers" });
        }

        // Delete existing images in the event directory
        const { data: existingFiles } = await supabase.storage
          .from("event_covers")
          .list(eventId);

        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map(
            (file) => `${eventId}/${file.name}`,
          );
          await supabase.storage.from("event_covers").remove(filesToDelete);
        }

        // Upload new image
        const filePath = `${eventId}/cover.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("event_covers")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (error) {
          console.error("Event cover upload error:", error);
          return res
            .status(500)
            .json({ error: "Failed to upload event cover" });
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("event_covers").getPublicUrl(filePath);

        console.log(`Event cover uploaded: ${publicUrl}`);

        res.json({
          url: publicUrl,
          fileName: filePath,
        });
      } catch (error) {
        console.error("Event cover upload error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Note: File serving is now handled directly by Supabase Storage public URLs
  // No need for a custom route as Supabase provides CDN-backed public URLs

  // Admin login route
  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("Admin login attempt for:", email);

      // Query Supabase for admin user
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !user) {
        console.log("Admin user not found:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if user is admin
      if (user.is_admin !== true && user.user_role !== "administrator") {
        console.log("Non-admin attempted admin login:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if account is blocked
      if (user.account_blocked === true) {
        console.log("Blocked admin account:", email);
        return res
          .status(403)
          .json({ error: "Your account has been blocked." });
      }

      console.log("Admin user found, comparing password...");
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("Admin password valid:", isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify user is actually an admin
      if (!user.is_admin && user.user_role !== "administrator") {
        return res.status(403).json({
          error:
            "Access denied. This portal is for administrators only. Please use the regular login page.",
          isNotAdmin: true,
        });
      }

      // Fetch alumni profile from Supabase (if exists)
      const { data: alumniProfile } = await supabase
        .from("alumni")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin,
          user_role: user.user_role || "administrator",
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        alumni: alumniProfile || null,
        message: "Admin login successful",
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("Login attempt for:", email);

      // Query Supabase instead of local database
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !user) {
        console.log("User not found:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if user is admin - admins cannot login through regular login
      if (user.is_admin === true || user.user_role === "administrator") {
        console.log("Admin login attempt blocked on regular login:", email);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if account is blocked
      if (user.account_blocked === true) {
        console.log("Account blocked:", email);
        return res
          .status(403)
          .json({
            error:
              "Your account has been blocked by the administrator. Please contact the authority for account activation.",
          });
      }

      console.log("User found, comparing password...");
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("Password valid:", isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Fetch alumni profile from Supabase
      const { data: alumniProfile } = await supabase
        .from("alumni")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin,
          user_role: user.user_role || "alumni",
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        alumni: alumniProfile || null,
        message: "Login successful",
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Signup request route (for admin approval)
  app.post("/api/auth/signup-request", async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        graduationYear,
        batch,
        course,
        branch,
        rollNumber,
        cgpa,
        currentCity,
        currentCompany,
        currentRole,
        linkedinUrl,
        reasonForJoining,
      } = req.body;

      if (!firstName || !lastName || !email || !graduationYear) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

      // Check if email already exists in pending/approved signup requests
      const { data: existingRequest } = await supabase
        .from("signup_requests")
        .select("id, status")
        .eq("email", email)
        .in("status", ["pending", "approved"])
        .single();

      if (existingRequest) {
        return res
          .status(409)
          .json({ error: "A signup request with this email already exists" });
      }

      // Check if email already exists in active users only
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, account_blocked")
        .eq("email", email)
        .single();

      if (existingUser && !existingUser.account_blocked) {
        return res
          .status(409)
          .json({ error: "This email is already registered" });
      }

      const { data: signupRequest, error } = await supabase
        .from("signup_requests")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          graduation_year: parseInt(graduationYear),
          batch,
          course,
          branch,
          roll_number: rollNumber,
          cgpa,
          current_city: currentCity,
          current_company: currentCompany,
          current_role: currentRole,
          linkedin_url: linkedinUrl,
          reason_for_joining: reasonForJoining,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Signup request error:", error);
        return res
          .status(500)
          .json({ error: "Failed to submit signup request" });
      }

      res.status(201).json({
        message: "Signup request submitted successfully",
        request: signupRequest,
      });
    } catch (error) {
      console.error("Signup request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register route
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, role = "student" } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ error: "Username, email and password are required" });
      }

      // Check if user already exists and is active
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, account_blocked")
        .eq("email", email)
        .single();

      if (existingUser && existingUser.account_blocked !== true) {
        return res
          .status(409)
          .json({ error: "A user with this email already exists" });
      }

      // If user exists but is blocked/deleted, clean up the old record
      if (existingUser && existingUser.account_blocked === true) {
        console.log(
          `Cleaning up blocked user account: ${existingUser.id} for email: ${email}`,
        );

        // Delete associated alumni record first (foreign key constraint)
        await supabase.from("alumni").delete().eq("user_id", existingUser.id);

        // Delete the old blocked user to allow email reuse
        await supabase.from("users").delete().eq("id", existingUser.id);

        console.log(`Successfully cleaned up old account for email: ${email}`);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          username,
          email,
          password: hashedPassword,
          is_admin: false,
          user_role: role,
        })
        .select(
          "id, username, email, is_admin, user_role, created_at, updated_at",
        )
        .single();

      if (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Failed to create user" });
      }

      res.status(201).json({
        user: newUser,
        message: "Registration successful",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user route
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: user, error } = await supabase
        .from("users")
        .select(
          "id, username, email, is_admin, user_role, created_at, updated_at",
        )
        .eq("id", userId)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { data: alumni } = await supabase
        .from("alumni")
        .select("*")
        .eq("user_id", user.id)
        .single();

      res.json({
        user,
        alumni: alumni || null,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Alumni profile routes
  app.post("/api/alumni/profile", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: alumni, error } = await supabase
        .from("alumni")
        .insert({
          user_id: userId,
          ...req.body,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Create alumni profile error:", error);
        return res
          .status(500)
          .json({ error: "Failed to create alumni profile" });
      }

      res.status(201).json({ alumni });
    } catch (error) {
      console.error("Create alumni profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/alumni/profile", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: alumni, error } = await supabase
        .from("alumni")
        .update({
          ...req.body,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        console.error("Update alumni profile error:", error);
        return res
          .status(500)
          .json({ error: "Failed to update alumni profile" });
      }

      res.json({ alumni });
    } catch (error) {
      console.error("Update alumni profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== ADMIN POST APPROVAL ROUTES ====================

  // Get all pending posts (unapproved)
  app.get("/api/admin/posts/pending", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!user || !user.is_admin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { data: posts, error } = await supabase
        .from("feed_posts")
        .select(
          `
          *,
          author:users!author_id(id, username, email)
        `,
        )
        .or("post_approved.is.null,post_approved.eq.false")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get pending posts error:", error);
        return res.status(500).json({ error: "Failed to fetch pending posts" });
      }

      // Fetch alumni data for authors
      if (posts && posts.length > 0) {
        const authorIds = posts.map((p) => p.author_id);
        const { data: alumniData } = await supabase
          .from("alumni")
          .select(
            "user_id, profile_picture, first_name, last_name, gender, email, phone, batch, current_company, current_role",
          )
          .in("user_id", authorIds);

        if (alumniData) {
          const alumniMap = new Map(alumniData.map((a) => [a.user_id, a]));
          posts.forEach((post) => {
            const alumniInfo = alumniMap.get(post.author_id);
            if (alumniInfo) {
              (post as any).author_alumni = alumniInfo;
            }
          });
        }
      }

      res.json({ posts: posts || [] });
    } catch (error) {
      console.error("Get pending posts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve a post
  app.post("/api/admin/posts/:id/approve", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const postId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!user || !user.is_admin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { data: post, error } = await supabase
        .from("feed_posts")
        .update({
          post_approved: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select("*")
        .single();

      if (error) {
        console.error("Approve post error:", error);
        return res.status(500).json({ error: "Failed to approve post" });
      }

      res.json({ message: "Post approved successfully", post });
    } catch (error) {
      console.error("Approve post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reject a post
  app.post("/api/admin/posts/:id/reject", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const postId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!user || !user.is_admin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Mark as inactive instead of deleting
      const { data: post, error } = await supabase
        .from("feed_posts")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select("*")
        .single();

      if (error) {
        console.error("Reject post error:", error);
        return res.status(500).json({ error: "Failed to reject post" });
      }

      res.json({ message: "Post rejected successfully", post });
    } catch (error) {
      console.error("Reject post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Send credentials email via Zoho ZeptoMail
  app.post("/api/admin/send-credentials-email", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!user || !user.is_admin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { recipientEmail, recipientName, emailContent, credentials } =
        req.body;

      if (!recipientEmail || !emailContent) {
        return res
          .status(400)
          .json({ error: "Recipient email and content are required" });
      }

      // Check if Zoho credentials are configured
      const zeptoMailToken = process.env.ZEPTOMAIL_TOKEN;
      const zeptoMailFromEmail =
        process.env.ZEPTOMAIL_FROM_EMAIL || "noreply@evonix.co";
      const zeptoMailFromName =
        process.env.ZEPTOMAIL_FROM_NAME || "TKS Alumni Portal";

      // Validate credentials
      if (
        !zeptoMailToken ||
        zeptoMailToken.trim() === "" ||
        zeptoMailToken === "your-zeptomail-token-here"
      ) {
        console.error("ZeptoMail credentials not configured properly");
        return res.status(500).json({
          error: "Email service not configured. Please contact administrator.",
        });
      }

      console.log("Sending email to:", recipientEmail);

      // Send email via Zoho ZeptoMail
      try {
        const zeptoMailResponse = await fetch(
          "https://api.zeptomail.in/v1.1/email",
          {
            method: "POST",
            headers: {
              Authorization: zeptoMailToken,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              from: {
                address: zeptoMailFromEmail,
                name: zeptoMailFromName,
              },
              to: [
                {
                  email_address: {
                    address: recipientEmail,
                    name: recipientName || recipientEmail,
                  },
                },
              ],
              subject: "Your Alumni Portal Credentials",
              textbody: emailContent,
            }),
          },
        );

        let zeptoMailData;
        try {
          zeptoMailData = await zeptoMailResponse.json();
        } catch (parseError) {
          console.error("Failed to parse ZeptoMail response:", parseError);
          zeptoMailData = { error: "Invalid response from email service" };
        }

        if (!zeptoMailResponse.ok) {
          console.error("ZeptoMail API error:", {
            status: zeptoMailResponse.status,
            statusText: zeptoMailResponse.statusText,
            data: zeptoMailData,
          });
          throw new Error(
            zeptoMailData.message ||
              zeptoMailData.error ||
              "Failed to send email via ZeptoMail",
          );
        }

        console.log(
          "Email sent successfully via Zoho ZeptoMail to:",
          recipientEmail,
        );

        return res.json({
          success: true,
          message: "Credentials email sent successfully",
        });
      } catch (emailError: any) {
        console.error("ZeptoMail error:", emailError);
        return res.status(500).json({
          error: "Failed to send email",
          details: emailError.message || "Unknown email service error",
        });
      }
    } catch (error) {
      console.error("Send credentials email error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== ADMIN SIGNUP REQUESTSROUTES ====================

  // Get all signup requests
  app.get("/api/admin/signup-requests", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!user || !user.is_admin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { status = "pending" } = req.query;

      const { data: requests, error } = await supabase
        .from("signup_requests")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get signup requests error:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch signup requests" });
      }

      res.json({ requests: requests || [] });
    } catch (error) {
      console.error("Get signup requests error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve signup request
  app.post("/api/admin/signup-requests/:id/approve", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const requestId = req.params.id;

      console.log("=== Signup Request Approval Started ===");
      console.log("Request ID:", requestId);
      console.log("Admin User ID:", userId);

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: adminUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!adminUser || !adminUser.is_admin) {
        console.log("Authorization failed: User is not admin");
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get signup request
      const { data: request, error: requestError } = await supabase
        .from("signup_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (requestError || !request) {
        console.log("Signup request not found:", requestError);
        return res.status(404).json({ error: "Signup request not found" });
      }

      console.log("Current request status:", request.status);

      if (request.status !== "pending") {
        console.log("Request already processed with status:", request.status);
        return res.status(400).json({ error: "Request already processed" });
      }

      // Generate random password
      const tempPassword = "TKS" + Math.random().toString(36).slice(-8) + "!";
      let hashedPassword: string;

      try {
        hashedPassword = await bcrypt.hash(tempPassword, 10);
      } catch (hashError) {
        console.error("Password hashing error:", hashError);
        return res
          .status(500)
          .json({ error: "Failed to generate secure password" });
      }

      console.log("Creating user account for:", request.email);

      // Generate unique username with timestamp
      const timestamp = Date.now().toString(36); // Convert timestamp to base36 for shorter string
      const baseUsername = request.email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const uniqueUsername = `${baseUsername}_${timestamp}`;

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          username: uniqueUsername,
          email: request.email,
          password: hashedPassword,
          is_admin: false,
          user_role: "alumni",
          account_approved: true,
        })
        .select()
        .single();

      if (userError || !newUser) {
        console.error("Create user error:", userError);
        return res.status(500).json({ error: "Failed to create user" });
      }

      console.log("User created successfully:", newUser.id);
      console.log("Creating alumni profile...");

      // Create alumni profile
      const { error: alumniError } = await supabase.from("alumni").insert({
        user_id: newUser.id,
        first_name: request.first_name,
        last_name: request.last_name,
        email: request.email,
        phone: request.phone,
        graduation_year: request.graduation_year,
        batch: request.batch,
        course: request.course,
        branch: request.branch,
        roll_number: request.roll_number,
        cgpa: request.cgpa,
        current_city: request.current_city,
        current_company: request.current_company,
        current_role: request.current_role,
        linkedin_url: request.linkedin_url,
        is_profile_public: true,
        is_verified: true,
        is_active: true,
      });

      if (alumniError) {
        console.error("Create alumni error:", alumniError);
        // Rollback user creation
        await supabase.from("users").delete().eq("id", newUser.id);
        return res
          .status(500)
          .json({ error: "Failed to create alumni profile" });
      }

      console.log("Alumni profile created successfully");
      console.log("Updating signup request status to approved...");

      // Update signup request status
      const { data: updatedRequest, error: updateError } = await supabase
        .from("signup_requests")
        .update({
          status: "approved",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update signup request status:", updateError);
      } else {
        console.log("Signup request status updated:", updatedRequest.status);
      }

      // Create notification for the new user
      await supabase.from("notifications").insert({
        user_id: newUser.id,
        type: "signup_approved",
        title: "Account Approved",
        content:
          "Your signup request has been approved. Welcome to the alumni portal!",
        related_id: requestId,
        is_read: false,
      });

      console.log("=== Signup Request Approval Completed ===");

      res.json({
        message: "Signup request approved",
        credentials: {
          email: request.email,
          temporaryPassword: tempPassword,
        },
      });
    } catch (error) {
      console.error("Approve signup request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reject signup request
  app.post("/api/admin/signup-requests/:id/reject", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const requestId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: adminUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!adminUser || !adminUser.is_admin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { error } = await supabase
        .from("signup_requests")
        .update({
          status: "rejected",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) {
        console.error("Reject signup request error:", error);
        return res
          .status(500)
          .json({ error: "Failed to reject signup request" });
      }

      res.json({ message: "Signup request rejected" });
    } catch (error) {
      console.error("Reject signup request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add admin users endpoint
  // Get all users (admin only)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if the requesting user is an admin
      const { data: requestingUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!requestingUser || !requestingUser.is_admin) {
        return res
          .status(403)
          .json({ error: "Access denied. Admin privileges required." });
      }

      // Fetch all users (excluding password field for security)
      const { data: allUsers, error } = await supabase
        .from("users")
        .select(
          "id, username, email, is_admin, user_role, account_approved, account_blocked, created_at, updated_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: "Failed to fetch users" });
      }

      // Fetch graduation_year from alumni table for each user
      if (allUsers && allUsers.length > 0) {
        const userIds = allUsers.map((u) => u.id);
        
        // Only query if we have user IDs
        if (userIds.length > 0) {
          // Batch queries to avoid headers overflow error (max 100 IDs per batch)
          const BATCH_SIZE = 100;
          const graduationYearMap = new Map<string, number | null>();
          const batches = [];
          
          // Split user IDs into batches
          for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            batches.push(userIds.slice(i, i + BATCH_SIZE));
          }

          // Query each batch
          for (const batch of batches) {
            const { data: alumniData, error: alumniError } = await supabase
              .from("alumni")
              .select("user_id, graduation_year")
              .in("user_id", batch);

            if (alumniError) {
              console.error("Error fetching alumni data for batch:", alumniError);
              continue; // Skip this batch and continue with others
            }

            if (alumniData && alumniData.length > 0) {
              alumniData.forEach((alumni) => {
                if (alumni.user_id && alumni.graduation_year !== null && alumni.graduation_year !== undefined) {
                  graduationYearMap.set(alumni.user_id, alumni.graduation_year);
                }
              });
            }
          }

          console.log(`Found ${graduationYearMap.size} alumni records with graduation_year out of ${userIds.length} users`);

          // Add graduation_year to each user object
          const usersWithGraduationYear = allUsers.map((user) => {
            const gradYear = graduationYearMap.get(user.id);
            return {
              ...user,
              graduation_year: gradYear !== undefined ? gradYear : null,
            };
          });

          return res.json(usersWithGraduationYear);
        }
      }

      res.json(allUsers || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin create new alumni account
  app.post("/api/admin/users/create", async (req, res) => {
    try {
      const adminId = req.headers["user-id"] as string;

      if (!adminId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if the requesting user is an admin
      const { data: requestingUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", adminId)
        .single();

      if (!requestingUser || !requestingUser.is_admin) {
        return res
          .status(403)
          .json({ error: "Access denied. Admin privileges required." });
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        batch,
        graduationYear,
        course,
        branch,
        rollNumber,
        cgpa,
        currentCity,
        currentCompany,
        currentRole,
        linkedinUrl,
        gender,
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !graduationYear) {
        return res
          .status(400)
          .json({
            error:
              "First name, last name, email, and graduation year are required",
          });
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, account_blocked")
        .eq("email", email)
        .single();

      if (existingUser) {
        if (!existingUser.account_blocked) {
          return res
            .status(409)
            .json({
              error: "A user with this email already exists and is active",
            });
        }

        // User exists but is blocked/deleted - clean up completely
        console.log(
          `Cleaning up blocked user account: ${existingUser.id} for email: ${email}`,
        );

        // Delete associated alumni record first (foreign key constraint)
        const { error: deleteAlumniError } = await supabase
          .from("alumni")
          .delete()
          .eq("user_id", existingUser.id);

        if (deleteAlumniError) {
          console.error("Error deleting alumni record:", deleteAlumniError);
        }

        // Delete the old blocked user to allow email reuse
        const { error: deleteUserError } = await supabase
          .from("users")
          .delete()
          .eq("id", existingUser.id);

        if (deleteUserError) {
          console.error("Error deleting user record:", deleteUserError);
          return res.status(500).json({
            error:
              "Failed to clean up previous account. Please try again or contact support.",
          });
        }

        console.log(`Successfully cleaned up old account for email: ${email}`);
      }

      // Generate temporary password
      const tempPassword = "TKS" + Math.random().toString(36).slice(-8) + "!";
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Generate unique username with timestamp
      const timestamp = Date.now().toString(36); // Convert timestamp to base36 for shorter string
      const baseUsername = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const uniqueUsername = `${baseUsername}_${timestamp}`;

      // Create user account
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          username: uniqueUsername,
          email: email,
          password: hashedPassword,
          is_admin: false,
          user_role: "alumni",
          account_approved: true,
        })
        .select(
          "id, username, email, is_admin, user_role, account_approved, created_at, updated_at",
        )
        .single();

      if (userError || !newUser) {
        console.error("Create user error:", userError);
        return res.status(500).json({ error: "Failed to create user account" });
      }

      // Create alumni profile
      const { error: alumniError } = await supabase.from("alumni").insert({
        user_id: newUser.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        graduation_year: parseInt(graduationYear),
        batch: batch || null,
        course: course || null,
        branch: branch || null,
        roll_number: rollNumber || null,
        cgpa: cgpa || null,
        current_city: currentCity || null,
        current_company: currentCompany || null,
        current_role: currentRole || null,
        linkedin_url: linkedinUrl || null,
        gender: gender || null,
        is_profile_public: true,
        is_verified: true,
        is_active: true,
      });

      if (alumniError) {
        console.error("Create alumni error:", alumniError);
        // Rollback user creation
        await supabase.from("users").delete().eq("id", newUser.id);
        return res
          .status(500)
          .json({ error: "Failed to create alumni profile" });
      }

      // Get the login URL from environment variable or construct it
      const baseUrl =
        process.env.TKS_URL || "https://tks-new-production.up.railway.app";
      const loginUrl = `${baseUrl}/login`;

      res.status(201).json({
        message: "Alumni account created successfully",
        user: newUser,
        credentials: {
          email: email,
          temporaryPassword: tempPassword,
        },
        loginUrl: loginUrl,
      });
    } catch (error) {
      console.error("Create alumni account error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update individual user field (admin only)
  app.put("/api/admin/users/:userId/update", async (req, res) => {
    try {
      const adminId = req.headers["user-id"] as string;
      const targetUserId = req.params.userId;
      const { field, value } = req.body;

      if (!adminId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if the requesting user is an admin
      const { data: requestingUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", adminId)
        .single();

      if (!requestingUser || !requestingUser.is_admin) {
        return res
          .status(403)
          .json({ error: "Access denied. Admin privileges required." });
      }

      // Validate field is allowed to be updated
      const allowedFields = ["username", "email", "user_role", "is_admin"];
      if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: "Invalid field for update" });
      }

      // Update the specific field
      const { data: updatedUser, error } = await supabase
        .from("users")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId)
        .select(
          "id, username, email, is_admin, user_role, account_approved, created_at, updated_at",
        )
        .single();

      if (error) {
        console.error("Error updating user field:", error);
        return res.status(500).json({ error: "Failed to update user field" });
      }

      // If email was updated, also update it in the alumni table
      if (field === "email") {
        const { error: alumniUpdateError } = await supabase
          .from("alumni")
          .update({
            email: value,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", targetUserId);

        if (alumniUpdateError) {
          console.error("Error updating alumni email:", alumniUpdateError);
          // Don't fail the request, but log the error
        }
      }

      res.json({
        message: "Field updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user field:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update individual alumni field (admin only)
  app.put("/api/admin/alumni/:userId/field-update", async (req, res) => {
    try {
      const adminId = req.headers["user-id"] as string;
      const targetUserId = req.params.userId;
      const { field, value } = req.body;

      if (!adminId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if the requesting user is an admin
      const { data: requestingUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", adminId)
        .single();

      if (!requestingUser || !requestingUser.is_admin) {
        return res
          .status(403)
          .json({ error: "Access denied. Admin privileges required." });
      }

      // Update only the specific field in alumni table
      const { data: updatedAlumni, error } = await supabase
        .from("alumni")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId)
        .select()
        .single();

      if (error) {
        console.error("Error updating alumni field:", error);
        return res.status(500).json({ error: "Failed to update alumni field" });
      }

      // If email was updated, also update it in the users table
      if (field === "email") {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            email: value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetUserId);

        if (userUpdateError) {
          console.error("Error updating user email:", userUpdateError);
          // Don't fail the request, but log the error
        }
      }

      res.json({
        message: "Field updated successfully",
        alumni: updatedAlumni,
      });
    } catch (error) {
      console.error("Error updating alumni field:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Toggle user account approval status (admin only)
  app.put("/api/admin/users/:userId/approval", async (req, res) => {
    try {
      const adminId = req.headers["user-id"] as string;
      const targetUserId = req.params.userId;
      const { accountApproved } = req.body;

      if (!adminId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if the requesting user is an admin
      const { data: requestingUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", adminId)
        .single();

      if (!requestingUser || !requestingUser.is_admin) {
        return res
          .status(403)
          .json({ error: "Access denied. Admin privileges required." });
      }

      // Update the account_approved status
      const { data: updatedUser, error } = await supabase
        .from("users")
        .update({
          account_approved: accountApproved,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId)
        .select(
          "id, username, email, is_admin, user_role, account_approved, account_blocked, created_at, updated_at",
        )
        .single();

      if (error) {
        console.error("Error updating user approval status:", error);
        return res
          .status(500)
          .json({ error: "Failed to update approval status" });
      }

      res.json({
        message: "Approval status updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user approval status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Toggle user account blocked status (admin only)
  app.put("/api/admin/users/:userId/block", async (req, res) => {
    try {
      const adminId = req.headers["user-id"] as string;
      const targetUserId = req.params.userId;
      const { accountBlocked } = req.body;

      if (!adminId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if the requesting user is an admin
      const { data: requestingUser } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", adminId)
        .single();

      if (!requestingUser || !requestingUser.is_admin) {
        return res
          .status(403)
          .json({ error: "Access denied. Admin privileges required." });
      }

      // Prevent admin from blocking themselves
      if (adminId === targetUserId) {
        return res
          .status(400)
          .json({ error: "You cannot block your own account" });
      }

      // Update the account_blocked status
      const { data: updatedUser, error } = await supabase
        .from("users")
        .update({
          account_blocked: accountBlocked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId)
        .select(
          "id, username, email, is_admin, user_role, account_approved, account_blocked, created_at, updated_at",
        )
        .single();

      if (error) {
        console.error("Error updating user block status:", error);
        return res.status(500).json({ error: "Failed to update block status" });
      }

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found after update" });
      }

      res.json({
        message: accountBlocked
          ? "Account blocked successfully"
          : "Account unblocked successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user block status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== FEED POSTSROUTES ====================

  // Get single post by ID (for sharing)
  app.get("/api/posts/:postId/single", async (req, res) => {
    try {
      let { postId } = req.params;
      const userId = req.headers["user-id"] as string;

      // Clean the postId - extract only UUID pattern (8-4-4-4-12 format)
      const uuidPattern =
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const match = postId.match(uuidPattern);

      if (!match) {
        console.log("Invalid post ID format:", postId);
        return res.status(400).json({ error: "Invalid post ID format" });
      }

      postId = match[0]; // Use the extracted UUID
      console.log("Fetching post with ID:", postId);

      // First check if post exists at all
      const { data: post, error } = await supabase
        .from("feed_posts")
        .select(
          `
          *,
          author:users!author_id(id, username, email)
        `,
        )
        .eq("id", postId)
        .single();

      if (error || !post) {
        console.log("Post not found:", postId, error);
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if post is active and approved
      if (!post.is_active) {
        console.log("Post is not active:", postId);
        return res.status(404).json({ error: "Post not found" });
      }

      if (!post.post_approved) {
        console.log("Post is not approved yet:", postId);
        return res.status(404).json({ error: "Post not found" });
      }

      // Fetch alumni data for author
      const { data: alumniData } = await supabase
        .from("alumni")
        .select("user_id, profile_picture, first_name, last_name, gender")
        .eq("user_id", post.author_id)
        .single();

      if (alumniData) {
        (post as any).author_profile_picture =
          alumniData.profile_picture || null;
        (post as any).author_first_name = alumniData.first_name || null;
        (post as any).author_last_name = alumniData.last_name || null;
        (post as any).author_gender = alumniData.gender || null;
      }

      // Check if user liked this post
      let isLikedByUser = false;
      if (userId) {
        const { data: like } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .single();

        isLikedByUser = !!like;
      }

      res.json({
        post: {
          ...post,
          isLikedByUser,
        },
      });
    } catch (error) {
      console.error("Get single post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get posts with pagination and user's like status
  app.get("/api/posts", async (req, res) => {
    try {
      const { limit = 10, offset = 0 } = req.query;
      const userId = req.headers["user-id"] as string;
      const search = req.query.search as string;

      let query = supabase
        .from("feed_posts")
        .select(
          `
          *,
          author:users!author_id(id, username, email)
        `,
        )
        .eq("is_active", true)
        .eq("post_approved", true);

      if (search) {
        query = query.or(`content.ilike.*${search}*`);
      }

      const { data: posts, error } = await query
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      // Fetch alumni profile data for all authors (profile picture, first name, last name, gender)
      if (posts && posts.length > 0) {
        const authorIds = posts.map((p) => p.author_id);
        const { data: alumniData } = await supabase
          .from("alumni")
          .select("user_id, profile_picture, first_name, last_name, gender")
          .in("user_id", authorIds);

        if (alumniData) {
          const alumniMap = new Map(
            alumniData.map((a) => [
              a.user_id,
              {
                profile_picture: a.profile_picture,
                first_name: a.first_name,
                last_name: a.last_name,
                gender: a.gender,
              },
            ]),
          );

          posts.forEach((post) => {
            const alumniInfo = alumniMap.get(post.author_id);
            if (alumniInfo) {
              (post as any).author_profile_picture =
                alumniInfo.profile_picture || null;
              (post as any).author_first_name = alumniInfo.first_name || null;
              (post as any).author_last_name = alumniInfo.last_name || null;
              (post as any).author_gender = alumniInfo.gender || null;
            } else {
              (post as any).author_profile_picture = null;
              (post as any).author_first_name = null;
              (post as any).author_last_name = null;
              (post as any).author_gender = null;
            }
          });
        }
      }

      if (error) {
        console.error("Get posts error:", error);
        return res.status(500).json({ error: "Failed to fetch posts" });
      }

      // Get user's likes for these posts
      let userLikes: Set<string> = new Set();
      if (userId && posts) {
        const postIds = posts.map((p) => p.id);
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds);

        if (likes) {
          userLikes = new Set(likes.map((l) => l.post_id));
        }
      }

      // Add isLikedByUser flag to each post
      const postsWithLikeStatus = posts?.map((post) => ({
        ...post,
        isLikedByUser: userLikes.has(post.id),
      }));

      res.json({ posts: postsWithLikeStatus || [] });
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new post
  app.post("/api/posts", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user exists
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, username, email")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return res.status(401).json({ error: "Invalid user" });
      }

      const { content, imageUrl, postType } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      const { data: post, error } = await supabase
        .from("feed_posts")
        .insert({
          author_id: userId,
          content: content.trim(),
          image_url: imageUrl,
          post_type: postType || "general",
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          is_active: true,
          post_approved: true, // Auto-approve posts for better UX
        })
        .select("*")
        .single();

      if (error) {
        console.error("Create post error:", error);
        return res
          .status(500)
          .json({ error: "Failed to create post", details: error.message });
      }

      // Fetch alumni profile data for the author
      const { data: alumniData } = await supabase
        .from("alumni")
        .select("profile_picture, first_name, last_name, gender")
        .eq("user_id", userId)
        .single();

      // Return post with author information
      res.status(201).json({
        post: {
          ...post,
          author: user,
          author_profile_picture: alumniData?.profile_picture || null,
          author_first_name: alumniData?.first_name || null,
          author_last_name: alumniData?.last_name || null,
          author_gender: alumniData?.gender || null,
          isLikedByUser: false,
        },
      });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update a post
  app.put("/api/posts/:id", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const postId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { content, imageUrl } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      // Verify ownership
      const { data: existingPost } = await supabase
        .from("feed_posts")
        .select("author_id")
        .eq("id", postId)
        .single();

      if (!existingPost || existingPost.author_id !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this post" });
      }

      const { data: post, error } = await supabase
        .from("feed_posts")
        .update({
          content: content.trim(),
          image_url: imageUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select("*")
        .single();

      if (error) {
        console.error("Update post error:", error);
        return res.status(500).json({ error: "Failed to update post" });
      }

      // Fetch user and alumni data separately
      const { data: user } = await supabase
        .from("users")
        .select("id, username, email")
        .eq("id", post.author_id)
        .single();

      const { data: alumniData } = await supabase
        .from("alumni")
        .select("profile_picture, first_name, last_name, gender")
        .eq("user_id", post.author_id)
        .single();

      res.json({
        post: {
          ...post,
          author: user,
          author_profile_picture: alumniData?.profile_picture || null,
          author_first_name: alumniData?.first_name || null,
          author_last_name: alumniData?.last_name || null,
          author_gender: alumniData?.gender || null,
        },
      });
    } catch (error) {
      console.error("Update post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete a post
  app.delete("/api/posts/:id", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const postId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify ownership
      const { data: existingPost } = await supabase
        .from("feed_posts")
        .select("author_id")
        .eq("id", postId)
        .single();

      if (!existingPost || existingPost.author_id !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this post" });
      }

      const { error } = await supabase
        .from("feed_posts")
        .delete()
        .eq("id", postId);

      if (error) {
        console.error("Delete post error:", error);
        return res.status(500).json({ error: "Failed to delete post" });
      }

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== LIKE ROUTES ====================

  // Toggle like on a post
  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const postId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if already liked
      const { data: existingLike } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      if (existingLike) {
        // Unlike: remove like and decrement count
        const { error: deleteLikeError } = await supabase
          .from("post_likes")
          .delete()
          .eq("id", existingLike.id);

        if (deleteLikeError) {
          console.error("Delete like error:", deleteLikeError);
          return res.status(500).json({ error: "Failed to unlike post" });
        }

        // Decrement likes count
        const { data: post } = await supabase
          .from("feed_posts")
          .select("likes_count")
          .eq("id", postId)
          .single();

        if (post) {
          await supabase
            .from("feed_posts")
            .update({ likes_count: Math.max(0, post.likes_count - 1) })
            .eq("id", postId);
        }

        return res.json({ message: "Post unliked", isLiked: false });
      } else {
        // Like: add like and increment count
        const { error: insertLikeError } = await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: userId,
          });

        if (insertLikeError) {
          console.error("Insert like error:", insertLikeError);
          return res.status(500).json({ error: "Failed to like post" });
        }

        // Increment likes count and get post author
        const { data: post } = await supabase
          .from("feed_posts")
          .select("likes_count, author_id")
          .eq("id", postId)
          .single();

        if (post) {
          await supabase
            .from("feed_posts")
            .update({ likes_count: post.likes_count + 1 })
            .eq("id", postId);

          // Only notify if the liker is not the author
          if (post.author_id !== userId) {
            // Get liker details
            const { data: likerAlumni } = await supabase
              .from("alumni")
              .select("first_name, last_name")
              .eq("user_id", userId)
              .single();

            const likerName = likerAlumni
              ? `${likerAlumni.first_name} ${likerAlumni.last_name}`
              : "Someone";

            // Create notification for post author
            await supabase.from("notifications").insert({
              user_id: post.author_id,
              type: "post_like",
              title: "Post Liked",
              content: `${likerName} liked your post`,
              related_id: postId,
              is_read: false,
            });

            // Send real-time notification
            const io = (global as any).io;
            const connectedUsers = (global as any).connectedUsers;
            if (io && connectedUsers) {
              const authorSocketId = connectedUsers.get(post.author_id);
              if (authorSocketId) {
                io.to(authorSocketId).emit("notification", {
                  type: "post_like",
                  title: "Post Liked",
                  content: `${likerName} liked your post`,
                  related_id: postId,
                  redirect_url: "/feed",
                });
              }
            }
          }
        }

        return res.json({ message: "Post liked", isLiked: true });
      }
    } catch (error) {
      console.error("Like post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== COMMENT ROUTES ====================

  // Get comments for a post
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const { postId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const { data: comments, error } = await supabase
        .from("post_comments")
        .select(
          `
          id,
          content,
          created_at,
          user:users!user_id(id, username, email)
        `,
        )
        .eq("post_id", postId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) throw error;

      // Enrich comments with alumni profile data
      const enrichedComments = await Promise.all(
        (comments || []).map(async (comment: any) => {
          const { data: alumni } = await supabase
            .from("alumni")
            .select("first_name, last_name, profile_picture, gender")
            .eq("user_id", comment.user.id)
            .single();

          return {
            ...comment,
            user_first_name: alumni?.first_name,
            user_last_name: alumni?.last_name,
            user_profile_picture: alumni?.profile_picture,
            user_gender: alumni?.gender,
          };
        }),
      );

      res.json({ comments: enrichedComments });
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create a comment
  app.post("/api/posts/:id/comments", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const postId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      // Insert comment
      const { data: comment, error: commentError } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: userId,
          content: content.trim(),
          is_active: true,
        })
        .select(
          `
          *,
          user:users!user_id(id, username, email)
        `,
        )
        .single();

      if (commentError) {
        console.error("Create comment error:", commentError);
        return res.status(500).json({ error: "Failed to create comment" });
      }

      // Increment comments count and get post author
      const { data: post } = await supabase
        .from("feed_posts")
        .select("comments_count, author_id")
        .eq("id", postId)
        .single();

      if (post) {
        await supabase
          .from("feed_posts")
          .update({ comments_count: post.comments_count + 1 })
          .eq("id", postId);

        // Only notify if the commenter is not the author
        if (post.author_id !== userId) {
          // Get commenter details
          const { data: commenterAlumni } = await supabase
            .from("alumni")
            .select("first_name, last_name")
            .eq("user_id", userId)
            .single();

          const commenterName = commenterAlumni
            ? `${commenterAlumni.first_name} ${commenterAlumni.last_name}`
            : "Someone";

          // Create notification for post author
          await supabase.from("notifications").insert({
            user_id: post.author_id,
            type: "post_comment",
            title: "New Comment",
            content: `${commenterName} commented on your post`,
            related_id: postId,
            is_read: false,
          });

          // Send real-time notification
          const io = (global as any).io;
          const connectedUsers = (global as any).connectedUsers;
          if (io && connectedUsers) {
            const authorSocketId = connectedUsers.get(post.author_id);
            if (authorSocketId) {
              io.to(authorSocketId).emit("notification", {
                type: "post_comment",
                title: "New Comment",
                content: `${commenterName} commented on your post`,
                related_id: postId,
                redirect_url: "/feed",
              });
            }
          }
        }
      }

      res.status(201).json({ comment });
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete a comment
  app.delete("/api/posts/:postId/comments/:commentId", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { postId, commentId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify ownership
      const { data: existingComment } = await supabase
        .from("post_comments")
        .select("user_id")
        .eq("id", commentId)
        .single();

      if (!existingComment || existingComment.user_id !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this comment" });
      }

      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        console.error("Delete comment error:", error);
        return res.status(500).json({ error: "Failed to delete comment" });
      }

      // Decrement comments count
      const { data: post } = await supabase
        .from("feed_posts")
        .select("comments_count")
        .eq("id", postId)
        .single();

      if (post) {
        await supabase
          .from("feed_posts")
          .update({ comments_count: Math.max(0, post.comments_count - 1) })
          .eq("id", postId);
      }

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== COMMENT REPLY ROUTES ====================

  // Get replies for a comment
  app.get("/api/comments/:commentId/replies", async (req, res) => {
    try {
      const { commentId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const { data: replies, error } = await supabase
        .from("post_comment_replies")
        .select(
          `
          id,
          content,
          created_at,
          user:users!user_id(id, username, email)
        `,
        )
        .eq("comment_id", commentId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) throw error;

      // Enrich replies with alumni profile data
      const enrichedReplies = await Promise.all(
        (replies || []).map(async (reply: any) => {
          const { data: alumni } = await supabase
            .from("alumni")
            .select("first_name, last_name, profile_picture, gender")
            .eq("user_id", reply.user.id)
            .single();

          return {
            ...reply,
            user_first_name: alumni?.first_name,
            user_last_name: alumni?.last_name,
            user_profile_picture: alumni?.profile_picture,
            user_gender: alumni?.gender,
          };
        }),
      );

      res.json({ replies: enrichedReplies });
    } catch (error) {
      console.error("Get comment replies error:", error);
      res.status(500).json({ error: "Failed to fetch replies" });
    }
  });

  // Create a reply to a comment
  app.post("/api/comments/:commentId/replies", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { commentId } = req.params;

      console.log("Reply request received:", { userId, commentId });

      if (!userId) {
        console.error("No user ID provided");
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        console.error("Reply content is empty");
        return res.status(400).json({ error: "Reply content is required" });
      }

      console.log("Creating reply with content:", content.trim());

      // Insert reply
      const { data: reply, error: replyError } = await supabase
        .from("post_comment_replies")
        .insert({
          comment_id: commentId,
          user_id: userId,
          content: content.trim(),
          is_active: true,
        })
        .select(
          `
          *,
          user:users!user_id(id, username, email)
        `,
        )
        .single();

      if (replyError) {
        console.error("Create reply error:", replyError);
        return res
          .status(500)
          .json({
            error: "Failed to create reply",
            details: replyError.message,
          });
      }

      console.log("Reply created successfully:", reply.id);

      // Increment replies count on comment
      const { data: comment } = await supabase
        .from("post_comments")
        .select("replies_count, user_id, post_id")
        .eq("id", commentId)
        .single();

      if (comment) {
        await supabase
          .from("post_comments")
          .update({ replies_count: (comment.replies_count || 0) + 1 })
          .eq("id", commentId);

        // Notify comment author if different from reply author
        if (comment.user_id !== userId) {
          const { data: replierAlumni } = await supabase
            .from("alumni")
            .select("first_name, last_name")
            .eq("user_id", userId)
            .single();

          const replierName = replierAlumni
            ? `${replierAlumni.first_name} ${replierAlumni.last_name}`
            : "Someone";

          await supabase.from("notifications").insert({
            user_id: comment.user_id,
            type: "comment_reply",
            title: "New Reply",
            content: `${replierName} replied to your comment`,
            related_id: comment.post_id,
            is_read: false,
          });

          // Send real-time notification
          const io = (global as any).io;
          const connectedUsers = (global as any).connectedUsers;
          if (io && connectedUsers) {
            const commentAuthorSocketId = connectedUsers.get(comment.user_id);
            if (commentAuthorSocketId) {
              io.to(commentAuthorSocketId).emit("notification", {
                type: "comment_reply",
                title: "New Reply",
                content: `${replierName} replied to your comment`,
                related_id: comment.post_id,
                redirect_url: "/feed",
              });
            }
          }
        }
      }

      res.status(201).json({ reply });
    } catch (error) {
      console.error("Create reply error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete a comment reply
  app.delete("/api/comments/:commentId/replies/:replyId", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { commentId, replyId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify ownership
      const { data: existingReply } = await supabase
        .from("post_comment_replies")
        .select("user_id")
        .eq("id", replyId)
        .single();

      if (!existingReply || existingReply.user_id !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this reply" });
      }

      const { error } = await supabase
        .from("post_comment_replies")
        .delete()
        .eq("id", replyId);

      if (error) {
        console.error("Delete reply error:", error);
        return res.status(500).json({ error: "Failed to delete reply" });
      }

      // Decrement replies count
      const { data: comment } = await supabase
        .from("post_comments")
        .select("replies_count")
        .eq("id", commentId)
        .single();

      if (comment) {
        await supabase
          .from("post_comments")
          .update({
            replies_count: Math.max(0, (comment.replies_count || 1) - 1),
          })
          .eq("id", commentId);
      }

      res.json({ message: "Reply deleted successfully" });
    } catch (error) {
      console.error("Delete reply error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Track profile views for analytics
  app.post("/api/profile/view/:profileId", async (req, res) => {
    try {
      const viewerId = req.headers["user-id"] as string;
      const { profileId } = req.params;

      if (!viewerId || viewerId === profileId) {
        return res.json({ success: false });
      }

      // Record the view (you can create a profile_views table)
      const { error } = await supabase.from("profile_views").insert({
        profile_user_id: profileId,
        viewer_user_id: viewerId,
        viewed_at: new Date().toISOString(),
      });

      res.json({ success: !error });
    } catch (error) {
      console.error("Profile view tracking error:", error);
      res.json({ success: false });
    }
  });

  // Get profile view statistics
  app.get("/api/profile/analytics/:userId", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { userId: profileUserId } = req.params;

      if (userId !== profileUserId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { data: views, error } = await supabase
        .from("profile_views")
        .select("*")
        .eq("profile_user_id", profileUserId)
        .order("viewed_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Calculate statistics
      const totalViews = views?.length || 0;
      const uniqueViewers = new Set(views?.map((v) => v.viewer_user_id)).size;
      const last7Days =
        views?.filter(
          (v) =>
            new Date(v.viewed_at) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        ).length || 0;

      res.json({
        totalViews,
        uniqueViewers,
        last7Days,
        recentViews: views?.slice(0, 10),
      });
    } catch (error) {
      console.error("Profile analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ==================== JOBSROUTES ====================

  // Get intelligent connection suggestions based on multiple factors
  app.get("/api/connections/suggestions", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { limit = 5 } = req.query;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current user's profile
      const { data: currentAlumni } = await supabase
        .from("alumni")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!currentAlumni) {
        return res.json({ suggestions: [] });
      }

      // Get all existing connections (accepted, pending sent, pending received)
      const { data: existingConnections } = await supabase
        .from("connection_requests")
        .select("requester_id, recipient_id")
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

      const connectedUserIds = new Set<string>();
      existingConnections?.forEach((conn) => {
        if (conn.requester_id === userId) {
          connectedUserIds.add(conn.recipient_id);
        } else {
          connectedUserIds.add(conn.requester_id);
        }
      });

      // Get all alumni excluding current user and existing connections
      const { data: allAlumni, error } = await supabase
        .from("alumni")
        .select("*")
        .neq("user_id", userId)
        .eq("is_active", true)
        .eq("is_profile_public", true);

      if (error) throw error;

      // Filter out already connected users
      const availableAlumni = allAlumni?.filter(
        (alumni) => !connectedUserIds.has(alumni.user_id)
      ) || [];

      // Calculate connection probability score for each user
      const scoredSuggestions = availableAlumni.map((alumni) => {
        let score = 0;
        let reasons: string[] = [];

        // Same batch - highest weight (40 points)
        if (alumni.batch && alumni.batch === currentAlumni.batch) {
          score += 40;
          reasons.push("Same batch");
        }

        // Same location/city - high weight (25 points)
        if (alumni.current_city && alumni.current_city === currentAlumni.current_city) {
          score += 25;
          reasons.push("Same location");
        }

        // Same company - high weight (25 points)
        if (alumni.current_company && alumni.current_company === currentAlumni.current_company) {
          score += 25;
          reasons.push("Works at same company");
        }

        // Same industry - medium weight (15 points)
        if (alumni.industry && alumni.industry === currentAlumni.industry) {
          score += 15;
          reasons.push("Same industry");
        }

        // Same course/branch - medium weight (15 points)
        if (alumni.course && alumni.course === currentAlumni.course) {
          score += 15;
          reasons.push("Same course");
        }

        // Similar graduation year (within 2 years) - medium weight (10 points)
        if (alumni.graduation_year && currentAlumni.graduation_year) {
          const yearDiff = Math.abs(alumni.graduation_year - currentAlumni.graduation_year);
          if (yearDiff <= 2) {
            score += Math.max(0, 10 - yearDiff * 3);
            if (yearDiff === 0) {
              reasons.push("Same graduation year");
            } else {
              reasons.push(`Graduated ${yearDiff} year${yearDiff > 1 ? 's' : ''} apart`);
            }
          }
        }

        // Profile completeness bonus (well-maintained profiles) - low weight (5 points)
        if (alumni.profile_picture && alumni.bio && alumni.linkedin_url) {
          score += 5;
        }

        return {
          ...alumni,
          connection_score: score,
          connection_reasons: reasons,
        };
      });

      // Sort by score and return top suggestions
      const topSuggestions = scoredSuggestions
        .filter((s) => s.connection_score > 0) // Only show users with at least some connection
        .sort((a, b) => b.connection_score - a.connection_score)
        .slice(0, Number(limit));

      res.json({ suggestions: topSuggestions });
    } catch (error) {
      console.error("Connection suggestions error:", error);
      res.status(500).json({ error: "Failed to fetch connection suggestions" });
    }
  });

  // Get alumni recommendations based on profile similarity (legacy endpoint)
  app.get("/api/alumni/recommendations", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current user's profile
      const { data: currentAlumni } = await supabase
        .from("alumni")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!currentAlumni) {
        return res.json({ recommendations: [] });
      }

      // Find similar alumni based on:
      // 1. Same batch (high weight)
      // 2. Same location (medium weight)
      // 3. Same industry/company (medium weight)
      let query = supabase
        .from("alumni")
        .select("*")
        .neq("user_id", userId)
        .eq("is_active", true)
        .eq("is_profile_public", true);

      // Prioritize same batch
      if (currentAlumni.batch) {
        query = query.or(`batch.eq.${currentAlumni.batch}`);
      }

      const { data: recommendations, error } = await query.limit(10);

      if (error) throw error;

      // Calculate similarity score
      const scoredRecommendations =
        recommendations
          ?.map((alumni) => {
            let score = 0;
            if (alumni.batch === currentAlumni.batch) score += 50;
            if (alumni.current_city === currentAlumni.current_city) score += 30;
            if (alumni.industry === currentAlumni.industry) score += 20;

            return { ...alumni, similarity_score: score };
          })
          .sort((a, b) => b.similarity_score - a.similarity_score) || [];

      res.json({ recommendations: scoredRecommendations.slice(0, 5) });
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Get all jobs with pagination and filters
  app.get("/api/jobs", async (req, res) => {
    try {
      const {
        limit = 20,
        offset = 0,
        location,
        jobType,
        industry,
        search,
      } = req.query;

      let query = supabase
        .from("jobs")
        .select(
          `
          *,
          posted_by_user:users!posted_by(id, username, email)
        `,
        )
        .eq("is_active", true);

      // Apply location filter - case insensitive partial match
      if (location && String(location).trim()) {
        query = query.ilike("location", `%${String(location).trim()}%`);
      }

      // Apply job type filter - exact match, case sensitive
      if (jobType && String(jobType).trim()) {
        query = query.eq("job_type", String(jobType).trim());
      }

      // Apply industry filter - case insensitive partial match
      if (industry && String(industry).trim()) {
        query = query.ilike("industry", `%${String(industry).trim()}%`);
      }

      // Apply search filter - searches in title, company, and description
      if (search && String(search).trim()) {
        const searchTerm = String(search).trim();
        query = query.or(
          `title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
        );
      }

      const { data: jobs, error } = await query
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        console.error("Get jobs error:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch jobs", details: error.message });
      }

      res.json({ jobs: jobs || [] });
    } catch (error) {
      console.error("Get jobs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new job posting
  app.post("/api/jobs", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const {
        title,
        company,
        location,
        jobType,
        workMode,
        description,
        requirements,
        experienceLevel,
        salaryMin,
        salaryMax,
        applicationUrl,
        contactEmail,
        industry,
        skills,
      } = req.body;

      if (!title || !company) {
        return res
          .status(400)
          .json({ error: "Title and company are required" });
      }

      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          title,
          company,
          location: location || null,
          job_type: jobType || null,
          work_mode: workMode || null,
          description: description || null,
          requirements: requirements || null,
          experience_level: experienceLevel || null,
          salary_min: salaryMin || null,
          salary_max: salaryMax || null,
          application_url: applicationUrl || null,
          contact_email: contactEmail || null,
          industry: industry || null,
          skills: skills || null,
          posted_by: userId,
          is_active: true,
        })
        .select(
          `
          *,
          posted_by_user:users!posted_by(id, username, email)
        `,
        )
        .single();

      if (error) {
        console.error("Create job error:", error);
        return res.status(500).json({ error: "Failed to create job posting" });
      }

      res.status(201).json({ job });
    } catch (error) {
      console.error("Create job error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update a job posting
  app.put("/api/jobs/:id", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const jobId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify ownership
      const { data: existingJob } = await supabase
        .from("jobs")
        .select("posted_by")
        .eq("id", jobId)
        .single();

      if (!existingJob || existingJob.posted_by !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this job" });
      }

      const {
        title,
        company,
        location,
        jobType,
        workMode,
        description,
        requirements,
        experienceLevel,
        applicationUrl,
        contactEmail,
        industry,
        skills,
        isActive,
      } = req.body;

      const { data: job, error } = await supabase
        .from("jobs")
        .update({
          title,
          company,
          location: location || null,
          job_type: jobType || null,
          work_mode: workMode || null,
          description: description || null,
          requirements: requirements || null,
          experience_level: experienceLevel || null,
          application_url: applicationUrl || null,
          contact_email: contactEmail || null,
          industry: industry || null,
          skills: skills || null,
          is_active: isActive !== undefined ? isActive : true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .select(
          `
          *,
          posted_by_user:users!posted_by(id, username, email)
        `,
        )
        .single();

      if (error) {
        console.error("Update job error:", error);
        return res.status(500).json({ error: "Failed to update job" });
      }

      res.json({ job });
    } catch (error) {
      console.error("Update job error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete a job posting
  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const jobId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify ownership
      const { data: existingJob } = await supabase
        .from("jobs")
        .select("posted_by")
        .eq("id", jobId)
        .single();

      if (!existingJob || existingJob.posted_by !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this job" });
      }

      const { error } = await supabase.from("jobs").delete().eq("id", jobId);

      if (error) {
        console.error("Delete job error:", error);
        return res.status(500).json({ error: "Failed to delete job" });
      }

      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Delete job error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Apply to job
  app.post("/api/jobs/:id/apply", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const jobId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from("job_applications")
        .select("id")
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .single();

      if (existing) {
        return res.status(409).json({ error: "Already applied to this job" });
      }

      const { error } = await supabase.from("job_applications").insert({
        user_id: userId,
        job_id: jobId,
        status: "applied",
      });

      if (error) {
        console.error("Apply to job error:", error);
        return res.status(500).json({ error: "Failed to apply" });
      }

      res.json({ message: "Application submitted" });
    } catch (error) {
      console.error("Apply to job error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== EVENTSROUTES ====================

  // Get all events with pagination and filters
  app.get("/api/events", async (req, res) => {
    try {
      const {
        limit = 20,
        offset = 0,
        location,
        search,
        tag,
        includeInactive = "false",
      } = req.query;

      let query = supabase.from("events").select("*");

      // Only filter by is_active if includeInactive is not true
      if (includeInactive !== "true") {
        query = query.eq("is_active", true);
      }

      if (location && String(location).trim()) {
        query = query.ilike("location", `%${location}%`);
      }
      if (search && String(search).trim()) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`,
        );
      }
      if (tag && String(tag).trim()) {
        query = query.contains("tags", [tag]);
      }

      const { data: events, error } = await query
        .order("event_date", { ascending: true })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        console.error("Get events error:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch events", details: error.message });
      }

      // Fetch user data separately if events exist
      if (events && events.length > 0) {
        const organizerIds = [
          ...new Set(events.map((e) => e.organized_by).filter(Boolean)),
        ];

        if (organizerIds.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("id, username, email")
            .in("id", organizerIds);

          if (users) {
            const userMap = new Map(users.map((u) => [u.id, u]));
            events.forEach((event) => {
              if (event.organized_by) {
                (event as any).organized_by_user =
                  userMap.get(event.organized_by) || null;
              }
            });
          }
        }
      }

      res.json({ events: events || [] });
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new event
  app.post("/api/events", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!user || !user.is_admin) {
        return res.status(403).json({ error: "Only admins can create events" });
      }

      const {
        title,
        description,
        eventDate,
        eventTime,
        location,
        imageUrl,
        tags,
        maxParticipants,
        isVirtual,
        virtualLink,
        maxAttendees,
        registrationDeadline,
        isActive,
      } = req.body;

      if (!title || !eventDate) {
        return res
          .status(400)
          .json({ error: "Title and event date are required" });
      }

      // Validate virtual event requirements
      if (isVirtual === true && (!virtualLink || virtualLink.trim() === "")) {
        return res
          .status(400)
          .json({ error: "Virtual Link is required for virtual events" });
      }

      // Parse the date properly
      let parsedDate;
      try {
        parsedDate = new Date(eventDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid event date format" });
      }

      const { data: event, error } = await supabase
        .from("events")
        .insert({
          title,
          description,
          event_date: parsedDate.toISOString(),
          location: location || "TBD",
          is_virtual: isVirtual === true,
          virtual_link: isVirtual === true ? virtualLink : null,
          max_attendees: maxAttendees || null,
          registration_deadline: registrationDeadline || null,
          cover_image: imageUrl || null,
          organized_by: userId,
          is_active: isActive !== false,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Create event error:", error);
        return res
          .status(500)
          .json({ error: "Failed to create event", details: error.message });
      }

      // Fetch user separately
      if (event) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, username, email")
          .eq("id", userId)
          .single();

        if (userData) {
          (event as any).organized_by_user = userData;
        }
      }

      res.status(201).json({ event });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update an event
  app.put("/api/events/:id", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const eventId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin or event organizer
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      const { data: existingEvent } = await supabase
        .from("events")
        .select("organized_by")
        .eq("id", eventId)
        .single();

      if (
        !existingEvent ||
        (!user?.is_admin && existingEvent.organized_by !== userId)
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this event" });
      }

      const {
        title,
        description,
        eventDate,
        eventTime,
        location,
        venue,
        imageUrl,
        tags,
        isActive,
        isVirtual,
        virtualLink,
        maxAttendees,
        registrationDeadline,
        coverImage,
      } = req.body;

      const { data: event, error } = await supabase
        .from("events")
        .update({
          title,
          description,
          event_date: eventDate,
          location,
          is_virtual: isVirtual === true,
          virtual_link: isVirtual === true ? virtualLink : null,
          max_attendees: maxAttendees || null,
          registration_deadline: registrationDeadline || null,
          cover_image: coverImage || null,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .select("*")
        .single();

      if (error) {
        console.error("Update event error:", error);
        return res.status(500).json({ error: "Failed to update event" });
      }

      // Fetch user separately
      if (event) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, username, email")
          .eq("id", event.organized_by)
          .single();

        if (userData) {
          (event as any).organized_by_user = userData;
        }
      }

      res.json({ event });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete an event
  app.delete("/api/events/:id", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const eventId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin or event organizer
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      const { data: existingEvent } = await supabase
        .from("events")
        .select("organized_by")
        .eq("id", eventId)
        .single();

      if (
        !existingEvent ||
        (!user?.is_admin && existingEvent.organized_by !== userId)
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this event" });
      }

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) {
        console.error("Delete event error:", error);
        return res.status(500).json({ error: "Failed to delete event" });
      }

      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== MESSAGING ROUTES ====================

  // Get all messages (admin only)
  app.get("/api/admin/messages/all", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Verify user is admin
      const { data: user } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single();

      if (!user || !user.is_admin) {
        return res
          .status(403)
          .json({ error: "Unauthorized. Admin access required." });
      }

      // Fetch all messages with sender and receiver information
      const { data: messages, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users!messages_sender_id_fkey (
            id,
            username,
            email
          ),
          receiver:users!messages_receiver_id_fkey (
            id,
            username,
            email
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get all messages error:", error);
        if (error.code === "PGRST204" || error.message.includes("table")) {
          return res.json({
            messages: [],
            warning: "Messages table not initialized",
          });
        }
        return res.status(500).json({ error: "Failed to fetch messages" });
      }

      res.json({ messages: messages || [] });
    } catch (error) {
      console.error("Get all messages error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's inbox messages
  app.get("/api/messages/inbox", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // First check if messages table exists
      const { data: messages, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users!messages_sender_id_fkey (
            id,
            username,
            email
          )
        `,
        )
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get inbox error:", error);
        // Return empty array if table doesn't exist instead of error
        if (error.code === "PGRST204" || error.message.includes("table")) {
          return res.json({
            messages: [],
            warning: "Messages table not initialized",
          });
        }
        return res.status(500).json({ error: "Failed to fetch messages" });
      }

      res.json({ messages: messages || [] });
    } catch (error) {
      console.error("Get inbox error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get user's sent messages
  app.get("/api/messages/sent", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: messages, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users!messages_sender_id_fkey (id, username, email),
          receiver:users!messages_receiver_id_fkey (id, username, email)
        `,
        )
        .eq("sender_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get sent messages error:", error);
        return res.status(500).json({ error: "Failed to fetch sent messages" });
      }

      res.json({ messages: messages || [] });
    } catch (error) {
      console.error("Get sent messages error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Send a message
  app.post("/api/messages", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { receiverId, subject, content, senderName } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Validate receiver exists
      const { data: receiver, error: receiverError } = await supabase
        .from("users")
        .select("id")
        .eq("id", receiverId)
        .single();

      if (receiverError || !receiver) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: receiverId,
          subject: subject || "No subject",
          content,
        })
        .select()
        .single();

      if (error) {
        console.error("Send message error:", error);
        return res.status(500).json({ error: "Failed to send message" });
      }

      // Create notification for receiver
      const { data: senderData } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

      await supabase.from("notifications").insert({
        user_id: receiverId,
        type: "message",
        title: "New Message",
        content: `You have a new message from ${senderData?.username || senderName || "an alumni"}`,
        related_id: data.id,
        is_read: false,
      });

      // Send real-time notification via Socket.IO
      const io = (global as any).io;
      const connectedUsers = (global as any).connectedUsers;
      if (io && connectedUsers) {
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("notification", {
            type: "message",
            title: "New Message",
            content: `You have a new message from ${senderData?.username || senderName || "an alumni"}`,
            related_id: data.id,
            redirect_url: "/inbox",
          });
        }
      }

      res.status(201).json({ message: data });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark message as read
  app.put("/api/messages/:messageId/read", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { messageId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await supabase
        .from("messages")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("receiver_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Mark as read error:", error);
        return res.status(500).json({ error: "Failed to mark as read" });
      }

      res.json({ message: data });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Delete message (only sender can delete)
  app.delete("/api/messages/:messageId", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const { messageId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify the user is the sender of this message
      const { data: message, error: fetchError } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("id", messageId)
        .single();

      if (fetchError || !message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.sender_id !== userId) {
        return res
          .status(403)
          .json({ error: "You can only delete messages you sent" });
      }

      // Delete the message
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (deleteError) {
        console.error("Delete message error:", deleteError);
        return res.status(500).json({ error: "Failed to delete message" });
      }

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== NOTIFICATIONS ROUTES ====================

  // Get user notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { limit = 20, unreadOnly = false } = req.query;

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId);

      if (unreadOnly === "true") {
        query = query.eq("is_read", false);
      }

      const { data: notifications, error } = await query
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({ error: "Failed to fetch notifications" });
      }

      res.json({ notifications: notifications || [] });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const notificationId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Mark notification read error:", error);
        return res
          .status(500)
          .json({ error: "Failed to mark notification as read" });
      }

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark all notifications as read
  app.put("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Mark all read error:", error);
        return res
          .status(500)
          .json({ error: "Failed to mark all notifications as read" });
      }

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== EVENT RSVP ROUTES ====================

  // RSVP to an event
  app.post("/api/events/:id/rsvp", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const eventId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { status = "attending", guestsCount = 0, notes } = req.body;

      if (!["attending", "maybe", "not_attending"].includes(status)) {
        return res.status(400).json({ error: "Invalid RSVP status" });
      }

      // Check event capacity
      const { data: event } = await supabase
        .from("events")
        .select("max_attendees, registration_deadline")
        .eq("id", eventId)
        .single();

      if (event) {
        // Check registration deadline
        if (
          event.registration_deadline &&
          new Date(event.registration_deadline) < new Date()
        ) {
          return res
            .status(400)
            .json({ error: "Registration deadline has passed" });
        }

        // Check capacity
        if (event.max_attendees) {
          const { data: rsvps } = await supabase
            .from("event_rsvps")
            .select("guests_count")
            .eq("event_id", eventId)
            .eq("status", "attending");

          const currentCount =
            rsvps?.reduce((sum, r) => sum + (r.guests_count || 1), 0) || 0;

          if (currentCount + (guestsCount || 1) > event.max_attendees) {
            return res.status(400).json({ error: "Event is at full capacity" });
          }
        }
      }

      // Check if RSVP already exists
      const { data: existingRsvp } = await supabase
        .from("event_rsvps")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .single();

      if (existingRsvp) {
        // Update existing RSVP
        const { error } = await supabase
          .from("event_rsvps")
          .update({
            status,
            guests_count: guestsCount || 1,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRsvp.id);

        if (error) {
          console.error("Update RSVP error:", error);
          return res.status(500).json({ error: "Failed to update RSVP" });
        }

        res.json({
          message: "RSVP updated successfully",
          status,
        });
      } else {
        // Create new RSVP
        const { data: rsvp, error } = await supabase
          .from("event_rsvps")
          .insert({
            event_id: eventId,
            user_id: userId,
            status,
            guests_count: guestsCount || 1,
            notes: notes || null,
          })
          .select()
          .single();

        if (error) {
          console.error("Create RSVP error:", error);
          return res.status(500).json({ error: "Failed to create RSVP" });
        }

        // Get event details for notification
        const { data: eventData } = await supabase
          .from("events")
          .select("title, organized_by")
          .eq("id", eventId)
          .single();

        // Get user details
        const { data: userAlumni } = await supabase
          .from("alumni")
          .select("first_name, last_name")
          .eq("user_id", userId)
          .single();

        const userName = userAlumni
          ? `${userAlumni.first_name} ${userAlumni.last_name}`
          : "Someone";

        // Notify event organizer if different from user
        if (
          eventData &&
          eventData.organized_by &&
          eventData.organized_by !== userId
        ) {
          await supabase.from("notifications").insert({
            user_id: eventData.organized_by,
            type: "event_rsvp",
            title: "New Event RSVP",
            content: `${userName} ${status === "attending" ? "is attending" : status === "maybe" ? "might attend" : "declined"} ${eventData.title}`,
            related_id: eventId,
            is_read: false,
          });

          // Send real-time notification
          const io = (global as any).io;
          const connectedUsers = (global as any).connectedUsers;
          if (io && connectedUsers) {
            const organizerSocketId = connectedUsers.get(
              eventData.organized_by,
            );
            if (organizerSocketId) {
              io.to(organizerSocketId).emit("notification", {
                type: "event_rsvp",
                title: "New Event RSVP",
                content: `${userName} ${status === "attending" ? "is attending" : status === "maybe" ? "might attend" : "declined"} ${eventData.title}`,
                related_id: eventId,
                redirect_url: "/events",
              });
            }
          }
        }

        res.status(201).json({
          message: "RSVP created successfully",
          rsvp,
        });
      }
    } catch (error) {
      console.error("RSVP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get event RSVPs (admin/organizer only)
  app.get("/api/events/:id/rsvps", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const eventId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: rsvps, error } = await supabase
        .from("event_rsvps")
        .select(
          `
          *,
          user:users!user_id(id, username, email)
        `,
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get RSVPs error:", error);
        return res.status(500).json({ error: "Failed to fetch RSVPs" });
      }

      res.json({ rsvps: rsvps || [] });
    } catch (error) {
      console.error("Get RSVPs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's RSVPs
  app.get("/api/my-rsvps", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: rsvps, error } = await supabase
        .from("event_rsvps")
        .select(
          `
          *,
          event:events(*)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get user RSVPs error:", error);
        return res.status(500).json({ error: "Failed to fetch RSVPs" });
      }

      res.json({ rsvps: rsvps || [] });
    } catch (error) {
      console.error("Get user RSVPs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== ADVANCED SEARCHROUTES ====================

  // Advanced alumni search
  app.get("/api/alumni/search", async (req, res) => {
    try {
      const {
        search,
        batch,
        location,
        industry,
        company,
        skills,
        graduationYear,
        limit = 20,
        offset = 0,
      } = req.query;

      let query = supabase
        .from("alumni")
        .select(
          `
          *,
          user:users!user_id(id, username, email)
        `,
        )
        .eq("is_active", true)
        .eq("is_profile_public", true);

      if (search && String(search).trim()) {
        const searchTerm = String(search).trim();
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
        );
      }
      if (batch && String(batch).trim()) {
        query = query.eq("batch", String(batch).trim());
      }
      if (location && String(location).trim()) {
        query = query.ilike("location", `%${String(location).trim()}%`);
      }
      if (industry && String(industry).trim()) {
        query = query.ilike("industry", `%${String(industry).trim()}%`);
      }
      if (company && String(company).trim()) {
        query = query.ilike("current_company", `%${String(company).trim()}%`);
      }
      if (graduationYear) {
        query = query.eq("graduation_year", Number(graduationYear));
      }

      const { data: alumni, error } = await query
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        console.error("Search alumni error:", error);
        return res.status(500).json({ error: "Failed to search alumni" });
      }

      // Ensure each alumni record has user_id properly mapped
      const processedAlumni = alumni?.map((alum) => ({
        ...alum,
        user_id: alum.user_id || alum.id,
      }));

      res.json({ alumni: processedAlumni || [] });
    } catch (error) {
      console.error("Search alumni error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Advanced profile update endpoint
  app.post("/api/profile/advanced-update", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const {
        employmentStatus,
        yearsOfExperience,
        employmentHistory,
        previousCompanies,
        certifications,
        languagesKnown,
        expertiseAreas,
        keywords,
        timezone,
        achievements,
        awards,
        isStartupFounder,
        startupName,
        startupRole,
        fundingStage,
        foundingYear,
        volunteerInterests,
        profileCompletionScore,
        completedSections,
      } = req.body;

      // Update alumni record with advanced fields
      const { error } = await supabase
        .from("alumni")
        .update({
          employment_status: employmentStatus,
          years_of_experience: yearsOfExperience,
          employment_history: employmentHistory,
          previous_companies: previousCompanies,
          certifications: certifications,
          languages_known: languagesKnown,
          expertise_areas: expertiseAreas,
          keywords: keywords,
          timezone: timezone,
          achievements: achievements,
          awards: awards,
          is_startup_founder: isStartupFounder,
          startup_name: startupName,
          startup_role: startupRole,
          funding_stage: fundingStage,
          founding_year: foundingYear,
          volunteer_interests: volunteerInterests,
          profile_completion_score: profileCompletionScore,
          completed_sections: completedSections,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Advanced profile update error:", error);
        return res.status(500).json({ error: "Failed to update profile" });
      }

      res.json({ message: "Advanced profile updated successfully" });
    } catch (error) {
      console.error("Advanced profile update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update complete profile
  app.post("/api/profile/update", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        console.error("Profile update: No user ID provided");
        return res.status(401).json({ error: "No user ID provided" });
      }

      console.log("Profile update request for user:", userId);
      console.log("Update data:", req.body);

      const {
        firstName,
        lastName,
        email,
        phone,
        batch,
        currentCompany,
        currentPosition,
        location,
        linkedinUrl,
        bio,
        gender,
        profilePicture,
      } = req.body;

      // Validate required fields
      const requiredFields = {
        firstName,
        lastName,
        email,
        phone,
        batch,
        gender,
      };
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value || value.trim() === "")
        .map(([key]) => key);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: "Missing required fields",
          missingFields,
        });
      }

      const {
        employmentStatus,
        yearsOfExperience,
        previousCompanies,
        employmentHistory,
        certifications,
        languagesKnown,
        expertiseAreas,
        keywords,
        timezone,
        achievements,
        awards,
        volunteerInterests,
        isStartupFounder,
        startupName,
        startupRole,
        fundingStage,
        foundingYear,
      } = req.body;

      // Derive graduation_year from batch if batch is provided
      let graduationYear = null;
      if (batch) {
        const parsedYear = parseInt(batch);
        if (!isNaN(parsedYear)) {
          graduationYear = parsedYear;
        }
      }

      // Check if alumni profile exists
      const { data: existingAlumni, error: checkError } = await supabase
        .from("alumni")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking alumni profile:", checkError);
        return res.status(500).json({ error: "Failed to check profile" });
      }

      let result;
      if (existingAlumni) {
        // Update existing profile
        console.log("Updating existing alumni profile");
        console.log(
          "Profile picture:",
          profilePicture ? `Yes (${profilePicture.length} chars)` : "No",
        );
        const updateData: any = {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          batch: batch,
          current_company: currentCompany,
          current_position: currentPosition,
          location: location,
          linkedin_url: linkedinUrl,
          bio: bio,
          gender: gender,
          profile_picture: profilePicture || null,
          // Advanced fields
          employment_status: employmentStatus || null,
          years_of_experience: yearsOfExperience || 0,
          previous_companies: previousCompanies || "[]",
          employment_history: employmentHistory || "[]",
          certifications: certifications || "[]",
          languages_known: languagesKnown || "[]",
          expertise_areas: expertiseAreas || "[]",
          keywords: keywords || "[]",
          timezone: timezone || "Asia/Kolkata",
          achievements: achievements || "[]",
          awards: awards || "[]",
          volunteer_interests: volunteerInterests || "[]",
          is_startup_founder: isStartupFounder || false,
          startup_name: startupName || null,
          startup_role: startupRole || null,
          funding_stage: fundingStage || null,
          founding_year: foundingYear || null,
          updated_at: new Date().toISOString(),
        };

        // Only include graduation_year if we have a valid value
        if (graduationYear !== null) {
          updateData.graduation_year = graduationYear;
        }

        const { data, error } = await supabase
          .from("alumni")
          .update(updateData)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) {
          console.error("Update alumni error:", error);
          return res
            .status(500)
            .json({
              error: "Failed to update profile",
              details: error.message,
            });
        }
        result = data;
      } else {
        // Create new profile
        console.log("Creating new alumni profile");

        if (graduationYear === null) {
          return res.status(400).json({
            error: "Batch/Graduation year is required to create a profile",
          });
        }

        const { data, error } = await supabase
          .from("alumni")
          .insert({
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            batch: batch,
            graduation_year: graduationYear,
            current_company: currentCompany,
            current_position: currentPosition,
            location: location,
            linkedin_url: linkedinUrl,
            bio: bio,
            gender: gender,
            profile_picture: profilePicture || null,
            // Advanced fields
            employment_status: employmentStatus || null,
            years_of_experience: yearsOfExperience || 0,
            previous_companies: previousCompanies || "[]",
            employment_history: employmentHistory || "[]",
            certifications: certifications || "[]",
            languages_known: languagesKnown || "[]",
            expertise_areas: expertiseAreas || "[]",
            keywords: keywords || "[]",
            timezone: timezone || "Asia/Kolkata",
            achievements: achievements || "[]",
            awards: awards || "[]",
            volunteer_interests: volunteerInterests || "[]",
            is_startup_founder: isStartupFounder || false,
            startup_name: startupName || null,
            startup_role: startupRole || null,
            funding_stage: fundingStage || null,
            founding_year: foundingYear || null,
            is_profile_public: true,
            is_verified: false,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error("Create alumni error:", error);
          return res
            .status(500)
            .json({
              error: "Failed to create profile",
              details: error.message,
            });
        }
        result = data;
      }

      // Update user email if changed
      if (email) {
        await supabase.from("users").update({ email: email }).eq("id", userId);
      }

      console.log("Profile updated successfully:", result);
      res.json({
        message: "Profile updated successfully",
        alumni: result,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get public alumni profile
  app.get("/api/alumni/public/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const { data: alumni, error } = await supabase
        .from("alumni")
        .select("*")
        .eq("user_id", userId)
        .eq("is_profile_public", true)
        .eq("is_active", true)
        .single();

      if (error || !alumni) {
        return res
          .status(404)
          .json({ error: "Profile not found or not public" });
      }

      // Return profile respecting privacy settings
      const publicProfile = {
        user_id: alumni.user_id,
        first_name: alumni.first_name,
        last_name: alumni.last_name,
        email: alumni.show_email ? alumni.email : null,
        phone: alumni.show_phone ? alumni.phone : null,
        profile_picture: alumni.profile_picture,
        bio: alumni.bio,
        current_company: alumni.show_company ? alumni.current_company : null,
        current_position: alumni.show_company ? alumni.current_position : null,
        location: alumni.show_location ? alumni.location : null,
        linkedin_url: alumni.linkedin_url,
        batch: alumni.show_education ? alumni.batch : null,
        graduation_year: alumni.show_education ? alumni.graduation_year : null,
        course: alumni.show_education ? alumni.course : null,
        branch: alumni.show_education ? alumni.branch : null,
        gender: alumni.gender,
        show_email: alumni.show_email,
        show_phone: alumni.show_phone,
        show_location: alumni.show_location,
        show_company: alumni.show_company,
        show_education: alumni.show_education,
      };

      res.json({ profile: publicProfile });
    } catch (error) {
      console.error("Get public profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Check connection status with another user
  app.get("/api/connections/status/:userId", async (req, res) => {
    try {
      const currentUserId = req.headers["user-id"] as string;
      const { userId } = req.params;

      if (!currentUserId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      if (currentUserId === userId) {
        return res.json({ status: "self" });
      }

      const { data: connection } = await supabase
        .from("connection_requests")
        .select("status")
        .or(
          `and(requester_id.eq.${currentUserId},recipient_id.eq.${userId}),and(requester_id.eq.${userId},recipient_id.eq.${currentUserId})`,
        )
        .single();

      if (!connection) {
        return res.json({ status: "none" });
      }

      if (connection.status === "accepted") {
        return res.json({ status: "connected" });
      } else if (connection.status === "pending") {
        return res.json({ status: "pending" });
      } else {
        return res.json({ status: "none" });
      }
    } catch (error) {
      console.error("Check connection status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update privacy settings
  app.put("/api/profile/privacy", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      console.log("Privacy update request for user:", userId);
      console.log("Privacy settings:", req.body);

      const {
        isProfilePublic,
        showEmail,
        showPhone,
        showLocation,
        showCompany,
        showEducation,
      } = req.body;

      const { error } = await supabase
        .from("alumni")
        .update({
          is_profile_public: isProfilePublic,
          show_email: showEmail,
          show_phone: showPhone,
          show_location: showLocation,
          show_company: showCompany,
          show_education: showEducation,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Update privacy error:", error);
        return res
          .status(500)
          .json({ error: "Failed to update privacy settings" });
      }

      console.log("Privacy settings updated successfully");
      res.json({ message: "Privacy settings updated successfully" });
    } catch (error) {
      console.error("Update privacy error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get LinkedIn integration status
  app.get("/api/profile/linkedin/status", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: integration, error } = await supabase
        .from("linkedin_integrations")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Get LinkedIn status error:", error);
        return res.status(500).json({ error: "Failed to get LinkedIn status" });
      }

      res.json({
        connected: !!integration,
        integration: integration || null,
      });
    } catch (error) {
      console.error("Get LinkedIn status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== LINKEDIN INTEGRATION ROUTES ====================

  // LinkedIn OAuth - Start
  app.get("/api/auth/linkedin", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        console.error("[LinkedIn] No user ID provided");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      let baseUrl =
        process.env.BASE_URL ||
        "https://2ebf047f-fb97-4874-9a6f-5f02efc4607f-00-3o979n32zxnfp.spock.replit.dev";

      // Remove trailing slash if present
      baseUrl = baseUrl.replace(/\/$/, "");

      console.log("[LinkedIn] Environment check:", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        baseUrl,
        clientIdPreview: clientId
          ? `${clientId.substring(0, 5)}...`
          : "MISSING",
      });

      if (!clientId || clientId === "undefined") {
        console.error("[LinkedIn] CLIENT_ID is missing or undefined");
        return res.status(500).json({
          error: "LinkedIn integration not configured",
          details: "LINKEDIN_CLIENT_ID environment variable is not set",
        });
      }

      if (!clientSecret || clientSecret === "undefined") {
        console.error("[LinkedIn] CLIENT_SECRET is missing or undefined");
        return res.status(500).json({
          error: "LinkedIn integration not configured",
          details: "LINKEDIN_CLIENT_SECRET environment variable is not set",
        });
      }

      const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;
      const state = Buffer.from(JSON.stringify({ userId })).toString("base64");

      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20email%20openid`;

      console.log("[LinkedIn] Generated auth URL:", {
        redirectUri,
        stateLength: state.length,
        urlLength: authUrl.length,
      });

      res.json({ authUrl });
    } catch (error) {
      console.error("[LinkedIn] OAuth start error:", error);
      res.status(500).json({
        error: "Failed to initialize LinkedIn OAuth",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // LinkedIn OAuth - Callback with comprehensive data extraction
  app.get("/api/auth/linkedin/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const { userId } = JSON.parse(
        Buffer.from(state as string, "base64").toString(),
      );

      console.log("[LinkedIn] Starting OAuth callback for user:", userId);

      // Exchange code for access token
      let baseUrl = process.env.BASE_URL || "http://localhost:5000";
      baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash

      const tokenResponse = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code as string,
            client_id: process.env.LINKEDIN_CLIENT_ID || "",
            client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
            redirect_uri: `${baseUrl}/api/auth/linkedin/callback`,
          }),
        },
      );

      const tokenData = await tokenResponse.json();
      console.log(
        "[LinkedIn] Token obtained, expires in:",
        tokenData.expires_in,
      );

      if (!tokenData.access_token) {
        throw new Error("Failed to obtain access token from LinkedIn");
      }

      // Comprehensive data extraction
      const linkedinData = await extractLinkedInData(tokenData.access_token);
      console.log("[LinkedIn] Data extracted successfully");

      // Save integration record
      const { error: integrationError } = await supabase
        .from("linkedin_integrations")
        .upsert({
          user_id: userId,
          linkedin_id: linkedinData.profile.sub,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expiry: new Date(
            Date.now() + tokenData.expires_in * 1000,
          ).toISOString(),
          sync_enabled: true,
          sync_fields: [
            "profile_photo",
            "work_experience",
            "education",
            "skills",
          ],
          profile_data: JSON.stringify(linkedinData),
          last_sync_at: new Date().toISOString(),
        });

      if (integrationError) {
        console.error("[LinkedIn] Integration save error:", integrationError);
        throw integrationError;
      }

      // Process and save extracted data to alumni profile
      await processLinkedInDataToAlumni(userId, linkedinData);
      console.log("[LinkedIn] Alumni profile updated successfully");

      res.redirect("/profile?linkedin=connected");
    } catch (error) {
      console.error("[LinkedIn] Callback error:", error);
      res.redirect("/profile?linkedin=error");
    }
  });

  // Helper function to extract comprehensive LinkedIn data
  async function extractLinkedInData(accessToken: string) {
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      // Basic profile information
      const profileResponse = await fetch(
        "https://api.linkedin.com/v2/userinfo",
        { headers },
      );
      const profile = await profileResponse.json();

      // Email address (if not in userinfo)
      const emailResponse = await fetch(
        "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
        { headers },
      );
      const emailData = await emailResponse.json();
      const email =
        emailData?.elements?.[0]?.["handle~"]?.emailAddress || profile.email;

      // Profile details (summary, headline, location)
      const detailsResponse = await fetch("https://api.linkedin.com/v2/me", {
        headers,
      });
      const details = await detailsResponse.json();

      // Work experience/positions
      let positions = [];
      try {
        const positionsResponse = await fetch(
          "https://api.linkedin.com/v2/positions?q=members&projection=(elements*(company,title,timePeriod))",
          { headers },
        );
        const positionsData = await positionsResponse.json();
        positions = positionsData?.elements || [];
      } catch (err) {
        console.log("[LinkedIn] Positions not available or limited scope");
      }

      // Education
      let educations = [];
      try {
        const educationsResponse = await fetch(
          "https://api.linkedin.com/v2/educations?q=members&projection=(elements*(schoolName,degreeName,fieldOfStudy,timePeriod))",
          { headers },
        );
        const educationsData = await educationsResponse.json();
        educations = educationsData?.elements || [];
      } catch (err) {
        console.log("[LinkedIn] Educations not available or limited scope");
      }

      // Skills
      let skills = [];
      try {
        const skillsResponse = await fetch(
          "https://api.linkedin.com/v2/skills?q=members&projection=(elements*(name))",
          { headers },
        );
        const skillsData = await skillsResponse.json();
        skills = skillsData?.elements || [];
      } catch (err) {
        console.log("[LinkedIn] Skills not available or limited scope");
      }

      return {
        profile,
        email,
        details,
        positions,
        educations,
        skills,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[LinkedIn] Data extraction error:", error);
      throw error;
    }
  }

  // Helper function to process LinkedIn data and update alumni profile
  async function processLinkedInDataToAlumni(
    userId: string,
    linkedinData: any,
  ) {
    const { profile, email, positions, educations, skills } = linkedinData;

    // Get current alumni record to check what exists
    const { data: currentAlumni } = await supabase
      .from("alumni")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Prepare update object with intelligent merging
    const updateData: any = {
      linkedin_synced: true,
      linkedin_profile_url: profile.profile || "",
      linkedin_photo_url: profile.picture || "",
      updated_at: new Date().toISOString(),
    };

    // Only update if field is empty or user hasn't customized it
    if (!currentAlumni?.first_name && profile.given_name) {
      updateData.first_name = profile.given_name;
    }
    if (!currentAlumni?.last_name && profile.family_name) {
      updateData.last_name = profile.family_name;
    }
    if (!currentAlumni?.email && email) {
      updateData.email = email;
    }
    if (!currentAlumni?.profile_picture && profile.picture) {
      updateData.profile_picture = profile.picture;
    }

    // Extract current position (most recent)
    if (positions && positions.length > 0) {
      const currentPosition = positions[0];
      if (!currentAlumni?.current_company && currentPosition.company?.name) {
        updateData.current_company = currentPosition.company.name;
      }
      if (!currentAlumni?.current_role && currentPosition.title) {
        updateData.current_role = currentPosition.title;
      }

      // Calculate total experience
      const totalMonths = positions.reduce((sum: number, pos: any) => {
        if (pos.timePeriod?.startDate && pos.timePeriod?.endDate) {
          const start = new Date(
            pos.timePeriod.startDate.year,
            pos.timePeriod.startDate.month || 0,
          );
          const end = new Date(
            pos.timePeriod.endDate.year,
            pos.timePeriod.endDate.month || 0,
          );
          return (
            sum +
            Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30),
            )
          );
        }
        return sum;
      }, 0);

      if (totalMonths > 0) {
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        updateData.experience = `${years} years${months > 0 ? ` ${months} months` : ""}`;
      }
    }

    // Extract education data
    if (educations && educations.length > 0) {
      const latestEducation = educations[0];
      if (!currentAlumni?.university && latestEducation.schoolName) {
        updateData.university = latestEducation.schoolName;
      }
      if (!currentAlumni?.course && latestEducation.fieldOfStudy) {
        updateData.course = latestEducation.fieldOfStudy;
      }
      if (!currentAlumni?.higher_education && latestEducation.degreeName) {
        updateData.higher_education = latestEducation.degreeName;
      }

      // Try to extract graduation year
      if (
        !currentAlumni?.graduation_year &&
        latestEducation.timePeriod?.endDate?.year
      ) {
        updateData.graduation_year = latestEducation.timePeriod.endDate.year;
        updateData.batch = latestEducation.timePeriod.endDate.year.toString();
      }
    }

    // Extract skills
    if (skills && skills.length > 0 && !currentAlumni?.skills) {
      const skillNames = skills
        .map((s: any) => s.name?.localized?.en_US || s.name)
        .filter(Boolean);
      if (skillNames.length > 0) {
        updateData.skills = JSON.stringify(skillNames);
      }
    }

    // Bio/Summary
    if (!currentAlumni?.bio && profile.summary) {
      updateData.bio = profile.summary.substring(0, 500); // Limit length
    }

    // Location extraction
    if (!currentAlumni?.current_city && profile.location) {
      const locationParts = profile.location
        .split(",")
        .map((s: string) => s.trim());
      if (locationParts.length > 0) {
        updateData.current_city = locationParts[0];
      }
      if (locationParts.length > 1) {
        updateData.current_country = locationParts[locationParts.length - 1];
      }
    }

    // Industry
    if (!currentAlumni?.industry && profile.industry) {
      updateData.industry = profile.industry;
    }

    console.log(
      "[LinkedIn] Updating alumni profile with fields:",
      Object.keys(updateData),
    );

    // Update alumni record
    const { error: updateError } = await supabase
      .from("alumni")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[LinkedIn] Alumni update error:", updateError);
      throw updateError;
    }

    // Create notification for user
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "linkedin_sync",
      title: "LinkedIn Connected",
      content:
        "Your LinkedIn profile has been successfully connected and synced!",
      is_read: false,
    });
  }

  // Sync LinkedIn Data with comprehensive extraction
  app.post("/api/profile/linkedin/sync", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { syncFields, forceOverwrite = false } = req.body;

      console.log("[LinkedIn] Manual sync requested by user:", userId);
      console.log("[LinkedIn] Sync fields:", syncFields);
      console.log("[LinkedIn] Force overwrite:", forceOverwrite);

      // Get LinkedIn integration
      const { data: integration } = await supabase
        .from("linkedin_integrations")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!integration) {
        return res.status(404).json({ error: "LinkedIn not connected" });
      }

      // Check token expiry
      const tokenExpiry = new Date(integration.token_expiry);
      if (tokenExpiry < new Date()) {
        return res.status(401).json({
          error: "LinkedIn token expired",
          message: "Please reconnect your LinkedIn account",
        });
      }

      // Extract fresh data from LinkedIn
      const linkedinData = await extractLinkedInData(integration.access_token);
      console.log("[LinkedIn] Fresh data extracted");

      // Get current alumni data
      const { data: currentAlumni } = await supabase
        .from("alumni")
        .select("*")
        .eq("user_id", userId)
        .single();

      const updateData: any = {
        linkedin_synced: true,
        updated_at: new Date().toISOString(),
      };

      // Profile photo sync
      if (
        syncFields.includes("profile_photo") &&
        linkedinData.profile.picture
      ) {
        if (forceOverwrite || !currentAlumni?.profile_picture) {
          updateData.profile_picture = linkedinData.profile.picture;
        }
      }

      // Work experience sync
      if (
        syncFields.includes("work_experience") &&
        linkedinData.positions?.length > 0
      ) {
        const currentPosition = linkedinData.positions[0];

        if (forceOverwrite || !currentAlumni?.current_company) {
          updateData.current_company = currentPosition.company?.name || null;
        }
        if (forceOverwrite || !currentAlumni?.current_role) {
          updateData.current_role = currentPosition.title || null;
        }

        // Calculate experience
        const totalMonths = linkedinData.positions.reduce(
          (sum: number, pos: any) => {
            if (pos.timePeriod?.startDate) {
              const start = new Date(
                pos.timePeriod.startDate.year,
                pos.timePeriod.startDate.month || 0,
              );
              const end = pos.timePeriod.endDate
                ? new Date(
                    pos.timePeriod.endDate.year,
                    pos.timePeriod.endDate.month || 0,
                  )
                : new Date();
              return (
                sum +
                Math.round(
                  (end.getTime() - start.getTime()) /
                    (1000 * 60 * 60 * 24 * 30),
                )
              );
            }
            return sum;
          },
          0,
        );

        if (totalMonths > 0 && (forceOverwrite || !currentAlumni?.experience)) {
          const years = Math.floor(totalMonths / 12);
          const months = totalMonths % 12;
          updateData.experience = `${years} years${months > 0 ? ` ${months} months` : ""}`;
        }
      }

      // Education sync
      if (
        syncFields.includes("education") &&
        linkedinData.educations?.length > 0
      ) {
        const latestEducation = linkedinData.educations[0];

        if (forceOverwrite || !currentAlumni?.university) {
          updateData.university = latestEducation.schoolName || null;
        }
        if (forceOverwrite || !currentAlumni?.course) {
          updateData.course = latestEducation.fieldOfStudy || null;
        }
        if (forceOverwrite || !currentAlumni?.higher_education) {
          updateData.higher_education = latestEducation.degreeName || null;
        }
        if (
          latestEducation.timePeriod?.endDate?.year &&
          (forceOverwrite || !currentAlumni?.graduation_year)
        ) {
          updateData.graduation_year = latestEducation.timePeriod.endDate.year;
          updateData.batch = latestEducation.timePeriod.endDate.year.toString();
        }
      }

      // Skills sync
      if (syncFields.includes("skills") && linkedinData.skills?.length > 0) {
        if (forceOverwrite || !currentAlumni?.skills) {
          const skillNames = linkedinData.skills
            .map((s: any) => s.name?.localized?.en_US || s.name)
            .filter(Boolean);
          updateData.skills = JSON.stringify(skillNames);
        }
      }

      // Basic info sync
      if (syncFields.includes("basic_info")) {
        if (forceOverwrite || !currentAlumni?.first_name) {
          updateData.first_name = linkedinData.profile.given_name || null;
        }
        if (forceOverwrite || !currentAlumni?.last_name) {
          updateData.last_name = linkedinData.profile.family_name || null;
        }
        if (forceOverwrite || !currentAlumni?.email) {
          updateData.email = linkedinData.email || null;
        }
        if (forceOverwrite || !currentAlumni?.bio) {
          updateData.bio =
            linkedinData.profile.summary?.substring(0, 500) || null;
        }
      }

      // Location sync
      if (syncFields.includes("location") && linkedinData.profile.location) {
        if (forceOverwrite || !currentAlumni?.current_city) {
          const locationParts = linkedinData.profile.location
            .split(",")
            .map((s: string) => s.trim());
          updateData.current_city = locationParts[0] || null;
          if (locationParts.length > 1) {
            updateData.current_country =
              locationParts[locationParts.length - 1] || null;
          }
        }
      }

      // Industry
      if (syncFields.includes("industry") && linkedinData.profile.industry) {
        if (forceOverwrite || !currentAlumni?.industry) {
          updateData.industry = linkedinData.profile.industry || null;
        }
      }

      console.log(
        "[LinkedIn] Prepared update with fields:",
        Object.keys(updateData),
      );

      // Update alumni profile
      if (Object.keys(updateData).length > 1) {
        // More than just updated_at
        const { error: updateError } = await supabase
          .from("alumni")
          .update(updateData)
          .eq("user_id", userId);

        if (updateError) {
          console.error("[LinkedIn] Alumni update error:", updateError);
          throw updateError;
        }
      }

      // Update integration record
      await supabase
        .from("linkedin_integrations")
        .update({
          sync_fields: syncFields,
          profile_data: JSON.stringify(linkedinData),
          last_sync_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      // Create notification
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "linkedin_sync",
        title: "LinkedIn Synced",
        content: `Successfully synced ${syncFields.length} data categories from LinkedIn`,
        is_read: false,
      });

      res.json({
        message: "LinkedIn data synced successfully",
        updatedFields: Object.keys(updateData).filter(
          (k) => k !== "updated_at",
        ),
      });
    } catch (error) {
      console.error("[LinkedIn] Sync error:", error);
      res.status(500).json({ error: "Failed to sync LinkedIn data" });
    }
  });

  // Disconnect LinkedIn
  app.delete("/api/profile/linkedin", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await supabase
        .from("linkedin_integrations")
        .delete()
        .eq("user_id", userId);

      await supabase
        .from("alumni")
        .update({
          linkedin_synced: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      res.json({ message: "LinkedIn disconnected successfully" });
    } catch (error) {
      console.error("LinkedIn disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect LinkedIn" });
    }
  });

  // LinkedIn Integration Testing Endpoint
  app.get("/api/test/linkedin", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      console.log("=== LinkedIn Integration Test Started ===");
      console.log("User ID:", userId);

      const results = {
        timestamp: new Date().toISOString(),
        environment: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        tables: {} as Record<string, any>,
        errors: [] as string[],
        summary: {
          totalTables: 0,
          workingTables: 0,
          failedTables: 0,
        },
      };

      // Test 1: Environment Variables
      console.log("[Test 1] Checking environment variables...");
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      const baseUrl = process.env.BASE_URL;

      results.tests.environmentVariables.details = {
        LINKEDIN_CLIENT_ID: clientId
          ? `SET (${clientId.substring(0, 5)}...)`
          : "MISSING",
        LINKEDIN_CLIENT_SECRET: clientSecret
          ? `SET (${clientSecret.substring(0, 10)}...)`
          : "MISSING",
        BASE_URL: baseUrl || "MISSING (will use default)",
      };

      if (
        clientId &&
        clientId !== "undefined" &&
        clientSecret &&
        clientSecret !== "undefined"
      ) {
        results.tests.environmentVariables.passed = true;
        console.log("[Test 1] ✓ Environment variables are set");
      } else {
        results.errors.push(
          "Environment variables LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET are missing",
        );
        console.log("[Test 1] ✗ Environment variables missing");
      }

      // Test 2: Database Connection
      console.log("[Test 2] Testing database connection...");
      try {
        const { data: testQuery, error: dbError } = await supabase
          .from("users")
          .select("id")
          .limit(1);

        if (!dbError) {
          results.tests.databaseConnection.passed = true;
          results.tests.databaseConnection.details = {
            status: "Connected",
            rowsFetched: testQuery?.length || 0,
          };
          console.log("[Test 2] ✓ Database connection successful");
        } else {
          results.errors.push(`Database connection failed: ${dbError.message}`);
          results.tests.databaseConnection.details = { error: dbError.message };
          console.log(
            "[Test 2] ✗ Database connection failed:",
            dbError.message,
          );
        }
      } catch (err) {
        results.errors.push(
          `Database connection error: ${err instanceof Error ? err.message : "Unknown"}`,
        );
        console.log("[Test 2] ✗ Database connection error:", err);
      }

      // Test 3: LinkedIn Integrations Table
      console.log("[Test 3] Checking linkedin_integrations table...");
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from("linkedin_integrations")
          .select("id")
          .limit(1);

        if (!tableError || tableError.code === "PGRST116") {
          results.tests.tableExists.passed = true;
          results.tests.tableExists.details = {
            exists: true,
            recordCount: tableCheck?.length || 0,
            message: "Table is accessible",
          };
          console.log("[Test 3] ✓ Table exists and is accessible");
        } else {
          results.errors.push(`Table check failed: ${tableError.message}`);
          results.tests.tableExists.details = { error: tableError.message };
          console.log("[Test 3] ✗ Table check failed:", tableError.message);
        }
      } catch (err) {
        results.errors.push(
          `Table check error: ${err instanceof Error ? err.message : "Unknown"}`,
        );
        console.log("[Test 3] ✗ Table check error:", err);
      }

      // Test 4: OAuth URL Generation
      console.log("[Test 4] Testing OAuth URL generation...");
      if (clientId && clientId !== "undefined") {
        try {
          const redirectUri = `${baseUrl || "https://2ebf047f-fb97-4874-9a6f-5f02efc4607f-00-3o979n32zxnfp.spock.replit.dev"}/api/auth/linkedin/callback`;
          const testState = Buffer.from(
            JSON.stringify({ userId: "test-user" }),
          ).toString("base64");
          const testAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${testState}&scope=profile%20email%20openid`;

          results.tests.oauthUrlGeneration.passed = true;
          results.tests.oauthUrlGeneration.details = {
            redirectUri,
            urlGenerated: true,
            urlLength: testAuthUrl.length,
            scope: "profile email openid",
          };
          console.log("[Test 4] ✓ OAuth URL generated successfully");
        } catch (err) {
          results.errors.push(
            `OAuth URL generation failed: ${err instanceof Error ? err.message : "Unknown"}`,
          );
          console.log("[Test 4] ✗ OAuth URL generation failed:", err);
        }
      } else {
        results.errors.push(
          "Cannot test OAuth URL generation without CLIENT_ID",
        );
        console.log("[Test 4] ✗ Skipped - CLIENT_ID missing");
      }

      // Test 5: Integration CRUD Operations
      console.log("[Test 5] Testing integration CRUD operations...");
      if (userId && results.tests.tableExists.passed) {
        try {
          // Check if integration exists
          const { data: existingIntegration } = await supabase
            .from("linkedin_integrations")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (existingIntegration) {
            results.tests.integrationCRUD.passed = true;
            results.tests.integrationCRUD.details = {
              operation: "READ",
              status: "Existing integration found",
              integrationId: existingIntegration.id,
              linkedinId: existingIntegration.linkedin_id || "Not set",
              syncEnabled: existingIntegration.sync_enabled,
              lastSync: existingIntegration.last_sync_at || "Never",
            };
            console.log("[Test 5] ✓ Existing integration found");
          } else {
            // Try creating a test integration
            const { data: testIntegration, error: createError } = await supabase
              .from("linkedin_integrations")
              .insert({
                user_id: userId,
                linkedin_id: "test-linkedin-id",
                sync_enabled: false,
                profile_data: JSON.stringify({ test: true }),
              })
              .select()
              .single();

            if (!createError && testIntegration) {
              results.tests.integrationCRUD.passed = true;
              results.tests.integrationCRUD.details = {
                operation: "CREATE",
                status: "Test integration created successfully",
                integrationId: testIntegration.id,
              };

              // Clean up test integration
              await supabase
                .from("linkedin_integrations")
                .delete()
                .eq("id", testIntegration.id);

              console.log("[Test 5] ✓ CRUD operations successful");
            } else {
              results.errors.push(
                `CRUD test failed: ${createError?.message || "Unknown error"}`,
              );
              results.tests.integrationCRUD.details = {
                error: createError?.message,
              };
              console.log("[Test 5] ✗ CRUD test failed:", createError);
            }
          }
        } catch (err) {
          results.errors.push(
            `CRUD operations error: ${err instanceof Error ? err.message : "Unknown"}`,
          );
          console.log("[Test 5] ✗ CRUD operations error:", err);
        }
      } else {
        results.errors.push(
          "Cannot test CRUD operations without userId or table access",
        );
        console.log("[Test 5] ✗ Skipped - Prerequisites not met");
      }

      // Generate Summary
      const passedTests = Object.values(results.tests).filter(
        (t) => t.passed,
      ).length;
      const totalTests = Object.keys(results.tests).length;
      results.summary = `${passedTests}/${totalTests} tests passed`;

      console.log("=== LinkedIn Integration Test Completed ===");
      console.log("Summary:", results.summary);
      console.log("Errors:", results.errors.length);

      res.json({
        success: passedTests === totalTests,
        results,
      });
    } catch (error) {
      console.error("[LinkedIn Test] Fatal error:", error);
      res.status(500).json({
        success: false,
        error: "Test suite failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ==================== CONNECTION REQUESTSROUTES ====================

  // Send connection request
  app.post("/api/connections/request", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { recipientId, message } = req.body;

      if (!recipientId) {
        return res.status(400).json({ error: "Recipient ID is required" });
      }

      if (recipientId === userId) {
        return res
          .status(400)
          .json({ error: "Cannot send connection request to yourself" });
      }

      // Check if connection already exists
      const { data: existing } = await supabase
        .from("connection_requests")
        .select("id, status")
        .or(
          `and(requester_id.eq.${userId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${userId})`,
        )
        .single();

      if (existing) {
        return res.status(409).json({
          error: "Connection request already exists",
          status: existing.status,
        });
      }

      const { data: request, error } = await supabase
        .from("connection_requests")
        .insert({
          requester_id: userId,
          recipient_id: recipientId,
          message: message || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Create connection request error:", error);
        return res
          .status(500)
          .json({ error: "Failed to send connection request" });
      }

      // Get requester details for notification
      const { data: requesterData } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

      const { data: requesterAlumni } = await supabase
        .from("alumni")
        .select("first_name, last_name")
        .eq("user_id", userId)
        .single();

      const requesterName = requesterAlumni
        ? `${requesterAlumni.first_name} ${requesterAlumni.last_name}`
        : requesterData?.username || "Someone";

      // Create notification for recipient
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "connection_request",
        title: "New Connection Request",
        content: `${requesterName} wants to connect with you`,
        related_id: request.id,
        is_read: false,
      });

      // Send real-time notification
      const io = (global as any).io;
      const connectedUsers = (global as any).connectedUsers;
      if (io && connectedUsers) {
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("notification", {
            type: "connection_request",
            title: "New Connection Request",
            content: `${requesterName} wants to connect with you`,
            related_id: request.id,
            redirect_url: "/connections",
          });
        }
      }

      res.status(201).json({
        message: "Connection request sent",
        request,
      });
    } catch (error) {
      console.error("Connection request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's connection requests
  app.get("/api/connections/requests", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { type = "received" } = req.query;

      let query = supabase.from("connection_requests").select(`
          *,
          requester:users!requester_id(id, username, email),
          recipient:users!recipient_id(id, username, email)
        `);

      if (type === "received") {
        query = query.eq("recipient_id", userId);
      } else if (type === "sent") {
        query = query.eq("requester_id", userId);
      } else {
        query = query.or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
      }

      const { data: requests, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        console.error("Get connection requests error:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch connection requests" });
      }

      res.json({ requests: requests || [] });
    } catch (error) {
      console.error("Get connection requests error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get connection statistics
  app.get("/api/connections/stats", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      // Get total accepted connections (where user is either requester or recipient)
      const { data: acceptedConnections, error: acceptedError } = await supabase
        .from("connection_requests")
        .select("id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

      if (acceptedError) {
        console.error("Get accepted connections error:", acceptedError);
        return res
          .status(500)
          .json({ error: "Failed to fetch connection stats" });
      }

      // Get pending requests sent by user
      const { data: sentPending, error: sentError } = await supabase
        .from("connection_requests")
        .select("id")
        .eq("status", "pending")
        .eq("requester_id", userId);

      if (sentError) {
        console.error("Get sent pending requests error:", sentError);
        return res
          .status(500)
          .json({ error: "Failed to fetch connection stats" });
      }

      // Get pending requests received by user
      const { data: receivedPending, error: receivedError } = await supabase
        .from("connection_requests")
        .select("id")
        .eq("status", "pending")
        .eq("recipient_id", userId);

      if (receivedError) {
        console.error("Get received pending requests error:", receivedError);
        return res
          .status(500)
          .json({ error: "Failed to fetch connection stats" });
      }

      res.json({
        totalConnections: acceptedConnections?.length || 0,
        pendingSent: sentPending?.length || 0,
        pendingReceived: receivedPending?.length || 0,
        totalPending:
          (sentPending?.length || 0) + (receivedPending?.length || 0),
      });
    } catch (error) {
      console.error("Get connection stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept/reject connection request
  app.put("/api/connections/request/:id", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const requestId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { status } = req.body;

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Verify user is the recipient
      const { data: request } = await supabase
        .from("connection_requests")
        .select("recipient_id")
        .eq("id", requestId)
        .single();

      if (!request || request.recipient_id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get full request details
      const { data: fullRequest } = await supabase
        .from("connection_requests")
        .select("requester_id, recipient_id")
        .eq("id", requestId)
        .single();

      const { error } = await supabase
        .from("connection_requests")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) {
        console.error("Update connection request error:", error);
        return res
          .status(500)
          .json({ error: "Failed to update connection request" });
      }

      // Get recipient details for notification
      const { data: recipientAlumni } = await supabase
        .from("alumni")
        .select("first_name, last_name")
        .eq("user_id", userId)
        .single();

      const recipientName = recipientAlumni
        ? `${recipientAlumni.first_name} ${recipientAlumni.last_name}`
        : "Someone";

      // Notify the requester about the decision
      if (fullRequest) {
        await supabase.from("notifications").insert({
          user_id: fullRequest.requester_id,
          type: "connection_response",
          title:
            status === "accepted"
              ? "Connection Accepted"
              : "Connection Declined",
          content:
            status === "accepted"
              ? `${recipientName} accepted your connection request`
              : `${recipientName} declined your connection request`,
          related_id: requestId,
          is_read: false,
        });

        // Send real-time notification
        const io = (global as any).io;
        const connectedUsers = (global as any).connectedUsers;
        if (io && connectedUsers) {
          const requesterSocketId = connectedUsers.get(
            fullRequest.requester_id,
          );
          if (requesterSocketId) {
            io.to(requesterSocketId).emit("notification", {
              type: "connection_response",
              title:
                status === "accepted"
                  ? "Connection Accepted"
                  : "Connection Declined",
              content:
                status === "accepted"
                  ? `${recipientName} accepted your connection request`
                  : `${recipientName} declined your connection request`,
              related_id: requestId,
              redirect_url: "/connections",
            });
          }
        }
      }

      res.json({ message: `Connection request ${status}` });
    } catch (error) {
      console.error("Update connection request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== JOB INTERESTSROUTES ====================

  // Toggle job interest
  app.post("/api/jobs/:id/interest", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const jobId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: existing } = await supabase
        .from("job_interests")
        .select("id, status")
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .single();

      if (existing) {
        // Remove interest
        const { error } = await supabase
          .from("job_interests")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("Remove job interest error:", error);
          return res.status(500).json({ error: "Failed to remove interest" });
        }

        return res.json({
          message: "Interest removed",
          interested: false,
        });
      } else {
        // Add interest
        const { error } = await supabase.from("job_interests").insert({
          user_id: userId,
          job_id: jobId,
          status: "interested",
        });

        if (error) {
          console.error("Add job interest error:", error);
          return res.status(500).json({ error: "Failed to add interest" });
        }

        return res.json({
          message: "Interest added",
          interested: true,
        });
      }
    } catch (error) {
      console.error("Toggle job interest error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's job interests
  app.get("/api/jobs/interests", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: interests, error } = await supabase
        .from("job_interests")
        .select(
          `
          *,
          job:jobs(*)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get job interests error:", error);
        return res.status(500).json({ error: "Failed to fetch interests" });
      }

      res.json({ interests: interests || [] });
    } catch (error) {
      console.error("Get job interests error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save/unsave job
  app.post("/api/jobs/:id/save", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      const jobId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: existing } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .single();

      if (existing) {
        // Unsave
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("Unsave job error:", error);
          return res.status(500).json({ error: "Failed to unsave job" });
        }

        return res.json({
          message: "Job unsaved",
          saved: false,
        });
      } else {
        // Save
        const { error } = await supabase.from("saved_jobs").insert({
          user_id: userId,
          job_id: jobId,
        });

        if (error) {
          console.error("Save job error:", error);
          return res.status(500).json({ error: "Failed to save job" });
        }

        return res.json({
          message: "Job saved",
          saved: true,
        });
      }
    } catch (error) {
      console.error("Toggle save job error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's saved jobs
  app.get("/api/jobs/saved", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: savedJobs, error } = await supabase
        .from("saved_jobs")
        .select(
          `
          *,
          job:jobs(*)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get saved jobs error:", error);
        return res.status(500).json({ error: "Failed to fetch saved jobs" });
      }

      res.json({ savedJobs: savedJobs || [] });
    } catch (error) {
      console.error("Get saved jobs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's job applications
  app.get("/api/jobs/my-applications", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { data: applications, error } = await supabase
        .from("job_applications")
        .select(
          `
          *,
          job:jobs(*)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get applications error:", error);
        return res.status(500).json({ error: "Failed to fetch applications" });
      }

      res.json({ applications: applications || [] });
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== MENTORSHIPROUTES ====================

  // Get available mentors
  app.get("/api/mentorship/mentors", async (req, res) => {
    try {
      const { expertise } = req.query;

      let query = supabase
        .from("alumni")
        .select("*")
        .eq("is_mentor", true)
        .eq("is_active", true);

      if (expertise) {
        query = query.contains("expertise", [expertise]);
      }

      const { data: mentors, error } = await query.limit(20);

      if (error) {
        console.error("Get mentors error:", error);
        return res.status(500).json({ error: "Failed to fetch mentors" });
      }

      res.json({ mentors: mentors || [] });
    } catch (error) {
      console.error("Get mentors error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Toggle mentor status
  app.post("/api/mentorship/toggle", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { isMentor } = req.body;

      const { error } = await supabase
        .from("alumni")
        .update({
          is_mentor: isMentor,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Toggle mentor error:", error);
        return res
          .status(500)
          .json({ error: "Failed to update mentor status" });
      }

      res.json({ message: "Mentor status updated" });
    } catch (error) {
      console.error("Toggle mentor error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Request mentorship
  app.post("/api/mentorship/request", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "No user ID provided" });
      }

      const { mentorId } = req.body;

      const { error } = await supabase.from("mentorship_requests").insert({
        mentee_id: userId,
        mentor_id: mentorId,
        status: "pending",
      });

      if (error) {
        console.error("Request mentorship error:", error);
        return res.status(500).json({ error: "Failed to send request" });
      }

      // Send real-time notification
      const { io, connectedUsers } = require("./index");
      const mentorSocketId = connectedUsers.get(mentorId);
      if (mentorSocketId) {
        io.to(mentorSocketId).emit("notification", {
          type: "mentorship_request",
          title: "New Mentorship Request",
          content: "Someone wants you as their mentor!",
        });
      }

      res.json({ message: "Request sent" });
    } catch (error) {
      console.error("Request mentorship error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== SHAREROUTES ====================

  // ==================== LANDING PAGE SECTIONS ROUTES ====================

  // Get hero section
  app.get("/api/landing/hero", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("hero_section")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Get hero section error:", error);
        return res.status(500).json({ error: "Failed to fetch hero section" });
      }

      res.json({ hero: data || null });
    } catch (error) {
      console.error("Get hero section error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get alumni benefits
  app.get("/api/landing/benefits", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("alumni_benefits")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Get benefits error:", error);
        return res.status(500).json({ error: "Failed to fetch benefits" });
      }

      res.json({ benefits: data || [] });
    } catch (error) {
      console.error("Get benefits error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get why join reasons
  app.get("/api/landing/why-join", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("why_join_reasons")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Get why join error:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch why join reasons" });
      }

      res.json({ reasons: data || [] });
    } catch (error) {
      console.error("Get why join error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get testimonials
  app.get("/api/landing/testimonials", async (req, res) => {
    try {
      const { featured = false } = req.query;

      let query = supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true);

      if (featured === "true") {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        console.error("Get testimonials error:", error);
        return res.status(500).json({ error: "Failed to fetch testimonials" });
      }

      res.json({ testimonials: data || [] });
    } catch (error) {
      console.error("Get testimonials error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get landing events
  app.get("/api/landing/events", async (req, res) => {
    try {
      const { featured = false, limit = 10 } = req.query;

      let query = supabase
        .from("landing_events")
        .select("*")
        .eq("is_active", true)
        .gte("event_date", new Date().toISOString());

      if (featured === "true") {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query
        .order("event_date", { ascending: true })
        .limit(Number(limit));

      if (error) {
        console.error("Get landing events error:", error);
        return res.status(500).json({ error: "Failed to fetch events" });
      }

      res.json({ events: data || [] });
    } catch (error) {
      console.error("Get landing events error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get portal features
  app.get("/api/landing/features", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("portal_features")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Get features error:", error);
        return res.status(500).json({ error: "Failed to fetch features" });
      }

      res.json({ features: data || [] });
    } catch (error) {
      console.error("Get features error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get alumni statistics
  app.get("/api/landing/statistics", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("alumni_statistics")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Get statistics error:", error);
        return res.status(500).json({ error: "Failed to fetch statistics" });
      }

      res.json({ statistics: data || [] });
    } catch (error) {
      console.error("Get statistics error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get community highlights
  app.get("/api/landing/community", async (req, res) => {
    try {
      const { category, limit = 10 } = req.query;

      let query = supabase
        .from("community_highlights")
        .select("*")
        .eq("is_active", true);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (error) {
        console.error("Get community highlights error:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch community highlights" });
      }

      res.json({ highlights: data || [] });
    } catch (error) {
      console.error("Get community highlights error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Comprehensive Database Test Endpoint
  app.get("/api/test/database", async (req, res) => {
    try {
      const results = {
        timestamp: new Date().toISOString(),
        environment: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        tables: {} as Record<string, any>,
        errors: [] as string[],
        summary: {
          totalTables: 0,
          workingTables: 0,
          failedTables: 0,
        },
      };

      const tablesToTest = [
        "users",
        "alumni",
        "feed_posts",
        "post_likes",
        "post_comments",
        "jobs",
        "events",
        "messages",
        "notifications",
        "connection_requests",
        "signup_requests",
        "event_rsvps",
        "linkedin_integrations",
      ];

      for (const table of tablesToTest) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });

          results.tables[table] = {
            status: error ? "error" : "ok",
            count: error ? null : count,
            error: error ? error.message : null,
          };

          if (error) {
            results.errors.push(`${table}: ${error.message}`);
            results.summary.failedTables++;
          } else {
            results.summary.workingTables++;
          }
          results.summary.totalTables++;
        } catch (err) {
          results.tables[table] = {
            status: "error",
            count: null,
            error: err instanceof Error ? err.message : "Unknown error",
          };
          results.errors.push(
            `${table}: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
          results.summary.failedTables++;
          results.summary.totalTables++;
        }
      }

      // Test storage buckets
      try {
        const { data: buckets, error: bucketsError } =
          await supabase.storage.listBuckets();
        results.tables["storage_buckets"] = {
          status: bucketsError ? "error" : "ok",
          buckets: bucketsError ? null : buckets?.map((b) => b.name),
          error: bucketsError ? bucketsError.message : null,
        };
      } catch (err) {
        results.tables["storage_buckets"] = {
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }

      const allPassed = results.summary.failedTables === 0;
      res.status(allPassed ? 200 : 500).json({
        success: allPassed,
        ...results,
      });
    } catch (error) {
      console.error("Database test error:", error);
      res.status(500).json({
        success: false,
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Test endpoint to verify messages functionality
  app.post("/api/messages/test", async (req, res) => {
    try {
      const userId = req.headers["user-id"] as string;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const results = {
        tableExists: false,
        canSendMessage: false,
        canReceiveMessage: false,
        canMarkAsRead: false,
        errors: [] as string[],
      };

      // Test 1: Check if table exists
      const { error: tableError } = await supabase
        .from("messages")
        .select("id")
        .limit(1);

      if (!tableError) {
        results.tableExists = true;
      } else {
        results.errors.push(`Table check failed: ${tableError.message}`);
      }

      // Test 2: Try to send a test message to self
      if (results.tableExists) {
        const { data: testMessage, error: sendError } = await supabase
          .from("messages")
          .insert({
            sender_id: userId,
            receiver_id: userId,
            subject: "Test Message",
            content:
              "This is a test message created at " + new Date().toISOString(),
          })
          .select()
          .single();

        if (!sendError && testMessage) {
          results.canSendMessage = true;

          // Test 3: Try to receive the message
          const { data: receivedMessages, error: receiveError } = await supabase
            .from("messages")
            .select("*")
            .eq("id", testMessage.id)
            .eq("receiver_id", userId);

          if (
            !receiveError &&
            receivedMessages &&
            receivedMessages.length > 0
          ) {
            results.canReceiveMessage = true;

            // Test 4: Try to mark as read
            const { error: readError } = await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", testMessage.id)
              .eq("receiver_id", userId);

            if (!readError) {
              results.canMarkAsRead = true;
            } else {
              results.errors.push(`Mark as read failed: ${readError.message}`);
            }

            // Clean up test message
            await supabase.from("messages").delete().eq("id", testMessage.id);
          } else {
            results.errors.push(
              `Receive message failed: ${receiveError?.message || "Unknown error"}`,
            );
          }
        } else {
          results.errors.push(
            `Send message failed: ${sendError?.message || "Unknown error"}`,
          );
        }
      }

      const allTestsPassed =
        results.tableExists &&
        results.canSendMessage &&
        results.canReceiveMessage &&
        results.canMarkAsRead;

      res.json({
        success: allTestsPassed,
        results,
        message: allTestsPassed
          ? "All messaging tests passed!"
          : "Some tests failed",
      });
    } catch (error) {
      console.error("Test messages error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test messages",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
