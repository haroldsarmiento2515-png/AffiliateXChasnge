import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import * as geoip from "geoip-lite";
import {
  users,
  creatorProfiles,
  companyProfiles,
  offers,
  offerVideos,
  applications,
  conversations,
  messages,
  reviews,
  favorites,
  analytics,
  clickEvents,
  paymentSettings,
  payments,
  type User,
  type UpsertUser,
  type InsertUser,
  type CreatorProfile,
  type InsertCreatorProfile,
  type CompanyProfile,
  type InsertCompanyProfile,
  type Offer,
  type InsertOffer,
  type OfferVideo,
  type InsertOfferVideo,
  type Application,
  type InsertApplication,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Favorite,
  type InsertFavorite,
  type ClickEvent,
  type InsertClickEvent,
  type PaymentSetting,
  type InsertPaymentSetting,
  type Payment,
  type InsertPayment,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Creator Profiles
  getCreatorProfile(userId: string): Promise<CreatorProfile | undefined>;
  createCreatorProfile(profile: InsertCreatorProfile): Promise<CreatorProfile>;
  updateCreatorProfile(userId: string, updates: Partial<InsertCreatorProfile>): Promise<CreatorProfile | undefined>;

  // Company Profiles
  getCompanyProfile(userId: string): Promise<CompanyProfile | undefined>;
  getCompanyProfileById(id: string): Promise<CompanyProfile | undefined>;
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  updateCompanyProfile(userId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile | undefined>;
  getPendingCompanies(): Promise<CompanyProfile[]>;
  approveCompany(companyId: string): Promise<CompanyProfile | undefined>;
  rejectCompany(companyId: string, reason: string): Promise<CompanyProfile | undefined>;

  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOffers(filters?: any): Promise<Offer[]>;
  getOffersByCompany(companyId: string): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(id: string): Promise<void>;
  getPendingOffers(): Promise<Offer[]>;
  approveOffer(offerId: string): Promise<Offer | undefined>;

  // Offer Videos
  getOfferVideos(offerId: string): Promise<OfferVideo[]>;
  createOfferVideo(video: InsertOfferVideo): Promise<OfferVideo>;
  deleteOfferVideo(id: string): Promise<void>;

  // Applications
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationByTrackingCode(trackingCode: string): Promise<Application | undefined>;
  getApplicationsByCreator(creatorId: string): Promise<Application[]>;
  getApplicationsByOffer(offerId: string): Promise<Application[]>;
  getAllPendingApplications(): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined>;
  approveApplication(id: string, trackingLink: string, trackingCode: string): Promise<Application | undefined>;
  completeApplication(id: string): Promise<Application | undefined>;
  getApplicationsByCompany(companyId: string): Promise<any[]>;

  // Messages & Conversations
  getConversation(id: string): Promise<any>;
  getConversationsByUser(userId: string): Promise<any[]>;
  createConversation(data: any): Promise<any>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;

  // Reviews
  getReviewsByCompany(companyId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, updates: Partial<InsertReview>): Promise<Review | undefined>;

  // Favorites
  getFavoritesByCreator(creatorId: string): Promise<Favorite[]>;
  isFavorite(creatorId: string, offerId: string): Promise<boolean>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  deleteFavorite(creatorId: string, offerId: string): Promise<void>;

  // Analytics
  getAnalyticsByCreator(creatorId: string): Promise<any>;
  getAnalyticsTimeSeriesByCreator(creatorId: string, dateRange: string): Promise<any[]>;
  getAnalyticsByApplication(applicationId: string): Promise<any[]>;
  logTrackingClick(applicationId: string, clickData: { ip: string; userAgent: string; referer: string; timestamp: Date }): Promise<void>;

  // Payment Settings
  getPaymentSettings(userId: string): Promise<PaymentSetting[]>;
  createPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting>;
  deletePaymentSetting(id: string): Promise<void>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByCreator(creatorId: string): Promise<Payment[]>;
  getPaymentsByCompany(companyId: string): Promise<Payment[]>;
  getAllPayments(): Promise<any[]>;
  updatePaymentStatus(id: string, status: string, updates?: Partial<InsertPayment>): Promise<Payment | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Creator Profiles
  async getCreatorProfile(userId: string): Promise<CreatorProfile | undefined> {
    const result = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId)).limit(1);
    return result[0];
  }

  async createCreatorProfile(profile: InsertCreatorProfile): Promise<CreatorProfile> {
    const result = await db.insert(creatorProfiles).values(profile).returning();
    return result[0];
  }

  async updateCreatorProfile(userId: string, updates: Partial<InsertCreatorProfile>): Promise<CreatorProfile | undefined> {
    const result = await db
      .update(creatorProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(creatorProfiles.userId, userId))
      .returning();
    return result[0];
  }

  // Company Profiles
  async getCompanyProfile(userId: string): Promise<CompanyProfile | undefined> {
    const result = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId)).limit(1);
    return result[0];
  }

  async getCompanyProfileById(id: string): Promise<CompanyProfile | undefined> {
    const result = await db.select().from(companyProfiles).where(eq(companyProfiles.id, id)).limit(1);
    return result[0];
  }

  async createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile> {
    const result = await db.insert(companyProfiles).values(profile).returning();
    return result[0];
  }

  async updateCompanyProfile(userId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile | undefined> {
    const result = await db
      .update(companyProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyProfiles.userId, userId))
      .returning();
    return result[0];
  }

  async getPendingCompanies(): Promise<CompanyProfile[]> {
    return await db.select().from(companyProfiles).where(eq(companyProfiles.status, 'pending')).orderBy(desc(companyProfiles.createdAt));
  }

  async approveCompany(companyId: string): Promise<CompanyProfile | undefined> {
    const result = await db
      .update(companyProfiles)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(companyProfiles.id, companyId))
      .returning();
    return result[0];
  }

  async rejectCompany(companyId: string, reason: string): Promise<CompanyProfile | undefined> {
    const result = await db
      .update(companyProfiles)
      .set({ status: 'rejected', rejectionReason: reason, updatedAt: new Date() })
      .where(eq(companyProfiles.id, companyId))
      .returning();
    return result[0];
  }

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    return result[0];
  }

  async getOffers(filters?: any): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.status, 'approved')).orderBy(desc(offers.createdAt)).limit(100);
  }

  async getOffersByCompany(companyId: string): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.companyId, companyId)).orderBy(desc(offers.createdAt));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const result = await db.insert(offers).values(offer).returning();
    return result[0];
  }

  async updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer | undefined> {
    const result = await db
      .update(offers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return result[0];
  }

  async deleteOffer(id: string): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  async getPendingOffers(): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.status, 'pending_review')).orderBy(desc(offers.createdAt));
  }

  async approveOffer(offerId: string): Promise<Offer | undefined> {
    const result = await db
      .update(offers)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(offers.id, offerId))
      .returning();
    return result[0];
  }

  // Offer Videos
  async getOfferVideos(offerId: string): Promise<OfferVideo[]> {
    return await db.select().from(offerVideos).where(eq(offerVideos.offerId, offerId)).orderBy(offerVideos.orderIndex);
  }

  async createOfferVideo(video: InsertOfferVideo): Promise<OfferVideo> {
    const result = await db.insert(offerVideos).values(video).returning();
    return result[0];
  }

  async deleteOfferVideo(id: string): Promise<void> {
    await db.delete(offerVideos).where(eq(offerVideos.id, id));
  }

  // Applications
  async getApplication(id: string): Promise<Application | undefined> {
    const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    return result[0];
  }

  async getApplicationByTrackingCode(trackingCode: string): Promise<Application | undefined> {
    const result = await db.select().from(applications).where(eq(applications.trackingCode, trackingCode)).limit(1);
    return result[0];
  }

  async getApplicationsByCreator(creatorId: string): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.creatorId, creatorId)).orderBy(desc(applications.createdAt));
  }

  async getApplicationsByOffer(offerId: string): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.offerId, offerId)).orderBy(desc(applications.createdAt));
  }

  async getAllPendingApplications(): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.status, 'pending')).orderBy(applications.autoApprovalScheduledAt);
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const autoApprovalTime = new Date();
    autoApprovalTime.setMinutes(autoApprovalTime.getMinutes() + 7); // Auto-approve after 7 minutes

    const result = await db.insert(applications).values({
      ...application,
      autoApprovalScheduledAt: autoApprovalTime,
    }).returning();
    return result[0];
  }

  async updateApplication(id: string, updates: Partial<InsertApplication>): Promise<Application | undefined> {
    const result = await db
      .update(applications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return result[0];
  }

  async approveApplication(id: string, trackingLink: string, trackingCode: string): Promise<Application | undefined> {
    const result = await db
      .update(applications)
      .set({
        status: 'approved',
        trackingLink,
        trackingCode,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();
    return result[0];
  }

  async completeApplication(id: string): Promise<Application | undefined> {
    const result = await db
      .update(applications)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();
    return result[0];
  }

  async getApplicationsByCompany(companyId: string): Promise<any[]> {
    const result = await db
      .select({
        id: applications.id,
        offerId: applications.offerId,
        offerTitle: offers.title,
        creatorId: applications.creatorId,
        creatorName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        creatorEmail: users.email,
        message: applications.message,
        status: applications.status,
        trackingLink: applications.trackingLink,
        trackingCode: applications.trackingCode,
        approvedAt: applications.approvedAt,
        completedAt: applications.completedAt,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .innerJoin(offers, eq(applications.offerId, offers.id))
      .innerJoin(users, eq(applications.creatorId, users.id))
      .where(eq(offers.companyId, companyId))
      .orderBy(desc(applications.createdAt));
    
    return result;
  }

  // Messages & Conversations
  async getConversation(id: string): Promise<any> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationsByUser(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.creatorId, userId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async createConversation(data: any): Promise<any> {
    const result = await db.insert(conversations).values(data).returning();
    return result[0];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    
    // Update conversation's last message timestamp
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return result[0];
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false)
        )
      );
  }

  // Reviews
  async getReviewsByCompany(companyId: string): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.companyId, companyId)).orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  async updateReview(id: string, updates: Partial<InsertReview>): Promise<Review | undefined> {
    const result = await db
      .update(reviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return result[0];
  }

  // Favorites
  async getFavoritesByCreator(creatorId: string): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.creatorId, creatorId)).orderBy(desc(favorites.createdAt));
  }

  async isFavorite(creatorId: string, offerId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.creatorId, creatorId), eq(favorites.offerId, offerId)))
      .limit(1);
    return result.length > 0;
  }

  async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const result = await db.insert(favorites).values(favorite).returning();
    return result[0];
  }

  async deleteFavorite(creatorId: string, offerId: string): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.creatorId, creatorId), eq(favorites.offerId, offerId)));
  }

  // Analytics
  async getAnalyticsByCreator(creatorId: string): Promise<any> {
    const result = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(${analytics.earnings}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`,
        uniqueClicks: sql<number>`COALESCE(SUM(${analytics.uniqueClicks}), 0)`,
        conversions: sql<number>`COALESCE(SUM(${analytics.conversions}), 0)`,
      })
      .from(analytics)
      .where(eq(analytics.creatorId, creatorId));
    
    return result[0];
  }

  async getAnalyticsTimeSeriesByCreator(creatorId: string, dateRange: string): Promise<any[]> {
    // Calculate date filter based on range
    let whereClause: any = eq(analytics.creatorId, creatorId);

    if (dateRange !== 'all') {
      let daysBack = 30;
      if (dateRange === '7d') daysBack = 7;
      else if (dateRange === '30d') daysBack = 30;
      else if (dateRange === '90d') daysBack = 90;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      whereClause = and(
        eq(analytics.creatorId, creatorId),
        sql`${analytics.date} >= ${startDate}`
      );
    }

    const result = await db
      .select({
        date: sql<string>`TO_CHAR(${analytics.date}, 'Mon DD')`,
        clicks: sql<number>`COALESCE(SUM(${analytics.clicks}), 0)`,
      })
      .from(analytics)
      .where(whereClause)
      .groupBy(analytics.date)
      .orderBy(analytics.date);

    return result;
  }

  async getAnalyticsByApplication(applicationId: string): Promise<any[]> {
    return await db.select().from(analytics).where(eq(analytics.applicationId, applicationId)).orderBy(desc(analytics.date));
  }

  async logTrackingClick(applicationId: string, clickData: { ip: string; userAgent: string; referer: string; timestamp: Date }): Promise<void> {
    // Get application to find offerId and creatorId
    const application = await this.getApplication(applicationId);
    if (!application) {
      console.error('[Tracking] Application not found:', applicationId);
      return;
    }

    // Parse user agent for device type and browser (basic detection)
    const deviceType = clickData.userAgent.toLowerCase().includes('mobile') ? 'mobile' : 
                       clickData.userAgent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop';
    const browser = clickData.userAgent.includes('Chrome') ? 'Chrome' :
                    clickData.userAgent.includes('Firefox') ? 'Firefox' :
                    clickData.userAgent.includes('Safari') ? 'Safari' : 'Other';

    // Geo-IP lookup
    const geo = geoip.lookup(clickData.ip);
    const country = geo?.country || 'Unknown';
    const city = geo?.city || 'Unknown';

    // Store individual click event with full metadata
    await db.insert(clickEvents).values({
      applicationId,
      offerId: application.offerId,
      creatorId: application.creatorId,
      ipAddress: clickData.ip,
      userAgent: clickData.userAgent,
      referer: clickData.referer,
      country,
      city,
      deviceType,
      browser,
      clickedAt: clickData.timestamp,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count unique IPs for today
    const uniqueIpsToday = await db
      .selectDistinct({ ipAddress: clickEvents.ipAddress })
      .from(clickEvents)
      .where(and(
        eq(clickEvents.applicationId, applicationId),
        sql`${clickEvents.clickedAt}::date = ${today}::date`
      ));

    // Check if analytics record exists for today
    const existing = await db
      .select()
      .from(analytics)
      .where(and(
        eq(analytics.applicationId, applicationId),
        eq(analytics.date, today)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record - increment clicks and update unique count
      await db
        .update(analytics)
        .set({
          clicks: sql`${analytics.clicks} + 1`,
          uniqueClicks: uniqueIpsToday.length,
          updatedAt: new Date(),
        })
        .where(eq(analytics.id, existing[0].id));
    } else {
      // Create new record
      await db.insert(analytics).values({
        applicationId,
        offerId: application.offerId,
        creatorId: application.creatorId,
        clicks: 1,
        uniqueClicks: uniqueIpsToday.length,
        conversions: 0,
        earnings: '0',
        earningsPaid: '0',
        date: today,
      });
    }

    console.log(`[Tracking] Logged click for application ${applicationId} from ${city}, ${country} - IP: ${clickData.ip} (${deviceType}, ${browser})`);
  }

  // Payment Settings
  async getPaymentSettings(userId: string): Promise<PaymentSetting[]> {
    return await db.select().from(paymentSettings).where(eq(paymentSettings.userId, userId)).orderBy(desc(paymentSettings.createdAt));
  }

  async createPaymentSetting(setting: InsertPaymentSetting): Promise<PaymentSetting> {
    const result = await db.insert(paymentSettings).values(setting).returning();
    return result[0];
  }

  async deletePaymentSetting(id: string): Promise<void> {
    await db.delete(paymentSettings).where(eq(paymentSettings.id, id));
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async getPaymentsByCreator(creatorId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.creatorId, creatorId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByCompany(companyId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.companyId, companyId))
      .orderBy(desc(payments.createdAt));
  }

  async getAllPayments(): Promise<any[]> {
    const result = await db
      .select({
        id: payments.id,
        applicationId: payments.applicationId,
        creatorId: payments.creatorId,
        creatorName: sql<string>`COALESCE(creator.first_name || ' ' || creator.last_name, creator.email)`,
        creatorEmail: sql<string>`creator.email`,
        companyId: payments.companyId,
        companyName: sql<string>`company.legal_name`,
        offerId: payments.offerId,
        offerTitle: sql<string>`offers.title`,
        grossAmount: payments.grossAmount,
        platformFeeAmount: payments.platformFeeAmount,
        stripeFeeAmount: payments.stripeFeeAmount,
        netAmount: payments.netAmount,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        description: payments.description,
        initiatedAt: payments.initiatedAt,
        completedAt: payments.completedAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(users.as('creator'), eq(payments.creatorId, sql.raw('creator.id')))
      .innerJoin(users.as('company'), eq(payments.companyId, sql.raw('company.id')))
      .innerJoin(offers, eq(payments.offerId, offers.id))
      .orderBy(desc(payments.createdAt));
    
    return result;
  }

  async updatePaymentStatus(id: string, status: string, updates?: Partial<InsertPayment>): Promise<Payment | undefined> {
    const result = await db
      .update(payments)
      .set({
        status: status as any,
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
