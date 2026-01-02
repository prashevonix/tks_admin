import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false),
  userRole: text("user_role").default("alumni"), // 'alumni', 'student', 'faculty', 'administrator'
  accountApproved: boolean("account_approved").default(true),
  accountBlocked: boolean("account_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alumni = pgTable("alumni", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),

  // Personal Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"), // 'male', 'female', 'other', 'prefer_not_to_say'
  profilePicture: text("profile_picture"),
  bio: text("bio"),

  // Academic Information
  graduationYear: integer("graduation_year").notNull(),
  batch: text("batch").notNull(),
  course: text("course"),
  branch: text("branch"),
  rollNumber: text("roll_number"),
  cgpa: text("cgpa"),

  // Location Information
  currentCity: text("current_city"),
  currentState: text("current_state"),
  currentCountry: text("current_country"),
  permanentAddress: text("permanent_address"),

  // Professional Information
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  industry: text("industry"),
  experience: text("experience"),
  skills: text("skills"), // JSON string of skills array

  // Advanced Professional Fields
  employmentStatus: text("employment_status"), // employed, self-employed, entrepreneur, student, looking
  employmentHistory: text("employment_history"), // JSON array of work history
  previousCompanies: text("previous_companies"), // JSON array
  yearsOfExperience: integer("years_of_experience"),

  // Skills & Expertise
  expertiseAreas: text("expertise_areas"), // JSON array
  certifications: text("certifications"), // JSON array of {name, issuer, date, url}
  languagesKnown: text("languages_known"), // JSON array of {language, proficiency}

  // Achievements & Recognition
  achievements: text("achievements"), // JSON array of {title, description, date, category}
  awards: text("awards"), // JSON array

  // Additional Info
  keywords: text("keywords"), // JSON array for search/tags
  timezone: text("timezone"),
  volunteerInterests: text("volunteer_interests"), // JSON array

  // Startup/Entrepreneurship
  isStartupFounder: boolean("is_startup_founder").default(false),
  startupName: text("startup_name"),
  startupRole: text("startup_role"),
  fundingStage: text("funding_stage"), // bootstrapped, seed, series-a, etc.
  foundingYear: integer("founding_year"),

  // Profile Completion
  profileCompletionScore: integer("profile_completion_score").default(0),
  completedSections: text("completed_sections").default('[]'), // JSON array of completed section IDs

  // Higher Education
  higherEducation: text("higher_education"),
  university: text("university"),
  higherEducationCountry: text("higher_education_country"),

  // Social Links
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  twitterUrl: text("twitter_url"),
  personalWebsite: text("personal_website"),

  // Privacy Settings
  isProfilePublic: boolean("is_profile_public").default(true),
  showEmail: boolean("show_email").default(false),
  showPhone: boolean("show_phone").default(false),
  showLocation: boolean("show_location").default(true),
  showCompany: boolean("show_company").default(true),
  showEducation: boolean("show_education").default(true),

  // LinkedIn Integration
  linkedinSynced: boolean("linkedin_synced").default(false),
  linkedinProfileUrl: text("linkedin_profile_url"),
  linkedinPhotoUrl: text("linkedin_photo_url"),

  // Status
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  eventTime: text("event_time"),
  location: text("location"),
  venue: text("venue"),
  isVirtual: boolean("is_virtual").default(false),
  virtualLink: text("virtual_link"),
  maxAttendees: integer("max_attendees"),
  registrationDeadline: timestamp("registration_deadline"),
  coverImage: text("cover_image"),
  tags: text("tags").array(),
  organizedBy: varchar("organized_by").references(() => users.id),
  postedBy: varchar("posted_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text("status").notNull().default("attending"), // attending, maybe, not_attending
  guestsCount: integer("guests_count").default(1),
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  attendanceMarked: boolean("attendance_marked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(), // event, job, message, connection, post
  title: text("title").notNull(),
  content: text("content").notNull(),
  relatedId: text("related_id"), // ID of related entity
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const linkedinIntegrations = pgTable("linkedin_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  linkedinId: text("linkedin_id").unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  syncEnabled: boolean("sync_enabled").default(false),
  syncFields: text("sync_fields").array().default(sql`'{}'::text[]`), // fields user wants to sync
  lastSyncAt: timestamp("last_sync_at"),
  profileData: text("profile_data"), // JSON string of comprehensive LinkedIn data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  jobType: text("job_type"), // full-time, part-time, contract, internship
  workMode: text("work_mode"), // remote, onsite, hybrid
  description: text("description"),
  requirements: text("requirements"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  experienceLevel: text("experience_level"),
  applicationDeadline: timestamp("application_deadline"),
  applicationUrl: text("application_url"),
  contactEmail: text("contact_email"),
  postedBy: varchar("posted_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobApplications = pgTable("job_applications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobId: text("job_id").references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  status: text("status").notNull().default("applied"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const savedJobs = pgTable("saved_jobs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobId: text("job_id").references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedPosts = pgTable("feed_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  postType: text("post_type").default("general"), // general, achievement, job_update, etc.
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Added for post interactions
export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => feedPosts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => feedPosts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New table for comment replies
export const postCommentReplies = pgTable("post_comment_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").references(() => postComments.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const signupRequests = pgTable("signup_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  graduationYear: integer("graduation_year").notNull(),
  batch: text("batch").notNull(),
  course: text("course"),
  branch: text("branch"),
  rollNumber: text("roll_number"),
  cgpa: text("cgpa"),
  currentCity: text("current_city"),
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  linkedinUrl: text("linkedin_url"),
  reasonForJoining: text("reason_for_joining"),
  status: text("status").default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertAlumniSchema = createInsertSchema(alumni).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({
  id: true,
  createdAt: true,
});

export const insertFeedPostSchema = createInsertSchema(feedPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likesCount: true,
  commentsCount: true,
});

// Schema for inserting likes and comments
export const insertPostLikeSchema = createInsertSchema(postLikes).omit({
  id: true,
  createdAt: true,
});

export const insertPostCommentSchema = createInsertSchema(postComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  repliesCount: true, // Added for comment replies count
});

export const insertPostCommentReplySchema = createInsertSchema(postCommentReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSignupRequestSchema = createInsertSchema(signupRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: true,
  reviewedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAlumni = z.infer<typeof insertAlumniSchema>;
export type Alumni = typeof alumni.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertFeedPost = z.infer<typeof insertFeedPostSchema>;
export type FeedPost = typeof feedPosts.$inferSelect;

// Types for likes and comments
export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostLike = z.infer<typeof insertPostLikeSchema>;
export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;

// Types for comment replies
export type PostCommentReply = typeof postCommentReplies.$inferSelect;
export type InsertPostCommentReply = z.infer<typeof insertPostCommentReplySchema>;

// Types for signup requests
export type SignupRequest = typeof signupRequests.$inferSelect;
export type InsertSignupRequest = z.infer<typeof insertSignupRequestSchema>;

// Event RSVP schemas
export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// LinkedIn Integration schemas
export const insertLinkedinIntegrationSchema = createInsertSchema(linkedinIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LinkedinIntegration = typeof linkedinIntegrations.$inferSelect;
export type InsertLinkedinIntegration = z.infer<typeof insertLinkedinIntegrationSchema>;