import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { z } from "zod";
import {
  insertCreatorProfileSchema,
  insertCompanyProfileSchema,
  insertOfferSchema,
  insertOfferVideoSchema,
  insertApplicationSchema,
  insertMessageSchema,
  insertReviewSchema,
  insertFavoriteSchema,
  insertPaymentSettingSchema,
} from "@shared/schema";

// Alias for convenience
const requireAuth = isAuthenticated;

// Middleware to ensure user has specific role
function requireRole(...roles: string[]) {
  return (req: Request, res: any, next: any) => {
    if (!req.user || !roles.includes((req.user as any).role)) {
      return res.status(403).send("Forbidden");
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;

      if (user.role === 'creator') {
        const profile = await storage.getCreatorProfile(userId);
        if (!profile) {
          // Create default profile if doesn't exist
          const newProfile = await storage.createCreatorProfile({ userId });
          return res.json(newProfile);
        }
        return res.json(profile);
      } else if (user.role === 'company') {
        const profile = await storage.getCompanyProfile(userId);
        return res.json(profile);
      }

      res.json(null);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;

      if (user.role === 'creator') {
        const validated = insertCreatorProfileSchema.partial().parse(req.body);
        const profile = await storage.updateCreatorProfile(userId, validated);
        return res.json(profile);
      } else if (user.role === 'company') {
        const validated = insertCompanyProfileSchema.partial().parse(req.body);
        const profile = await storage.updateCompanyProfile(userId, validated);
        return res.json(profile);
      }

      res.status(400).send("Invalid role");
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Creator stats
  app.get("/api/creator/stats", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applications = await storage.getApplicationsByCreator(userId);
      const analyticsData = await storage.getAnalyticsByCreator(userId);

      const stats = {
        totalEarnings: analyticsData?.totalEarnings || 0,
        monthlyEarnings: 0, // TODO: Calculate monthly
        activeOffers: applications.filter(a => a.status === 'active').length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
        totalClicks: analyticsData?.totalClicks || 0,
        monthlyClicks: 0, // TODO: Calculate monthly
        unreadMessages: 0, // TODO: Calculate from messages
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Offers routes
  app.get("/api/offers", requireAuth, async (req, res) => {
    try {
      const offers = await storage.getOffers(req.query);
      res.json(offers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/offers/recommended", requireAuth, async (req, res) => {
    try {
      // TODO: Implement recommendation algorithm
      const offers = await storage.getOffers({});
      res.json(offers.slice(0, 3));
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/offers/:id", requireAuth, async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).send("Offer not found");
      }

      const videos = await storage.getOfferVideos(offer.id);
      const company = await storage.getCompanyProfileById(offer.companyId);

      res.json({ ...offer, videos, company });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/offers", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      
      if (!companyProfile || companyProfile.status !== 'approved') {
        return res.status(403).send("Company not approved");
      }

      const validated = insertOfferSchema.parse(req.body);
      const offer = await storage.createOffer({
        ...validated,
        companyId: companyProfile.id,
        status: 'pending_review',
      });

      res.json(offer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/offers/:id", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const validated = insertOfferSchema.partial().parse(req.body);
      const offer = await storage.updateOffer(req.params.id, validated);
      res.json(offer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Applications routes
  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applications = await storage.getApplicationsByCreator(userId);

      // Fetch offer details for each application
      const applicationsWithOffers = await Promise.all(
        applications.map(async (app) => {
          const offer = await storage.getOffer(app.offerId);
          const company = offer ? await storage.getCompanyProfileById(offer.companyId) : null;
          return { ...app, offer: offer ? { ...offer, company } : null };
        })
      );

      res.json(applicationsWithOffers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/applications", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertApplicationSchema.parse({
        ...req.body,
        creatorId: userId,
        status: 'pending',
      });

      const application = await storage.createApplication(validated);

      // TODO: Schedule auto-approval job for 7 minutes later

      res.json(application);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/applications/:id/approve", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).send("Application not found");
      }

      // Generate tracking link and code
      const trackingCode = `CR-${application.creatorId.substring(0, 8)}-${application.offerId.substring(0, 8)}`;
      const trackingLink = `https://example.com/track/${trackingCode}`;

      const approved = await storage.approveApplication(
        application.id,
        trackingLink,
        trackingCode
      );

      res.json(approved);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/applications/:id/complete", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).send("Application not found");
      }

      // Verify the application belongs to one of the company's offers
      const offer = await storage.getOffer(application.offerId);
      if (!offer) {
        return res.status(404).send("Offer not found");
      }

      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).send("Company profile not found");
      }

      // Compare offer.companyId against companyProfile.id (not userId)
      if (offer.companyId !== companyProfile.id) {
        return res.status(403).send("Unauthorized");
      }

      // Verify application is approved before marking complete
      if (application.status !== 'approved' && application.status !== 'active') {
        return res.status(400).send("Only approved applications can be marked as complete");
      }

      const completed = await storage.completeApplication(application.id);
      res.json(completed);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/company/applications", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).send("Company profile not found");
      }
      
      // Pass company profile ID, not user ID
      const applications = await storage.getApplicationsByCompany(companyProfile.id);
      res.json(applications);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Favorites routes
  app.get("/api/favorites", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const favorites = await storage.getFavoritesByCreator(userId);

      // Fetch offer details for each favorite
      const favoritesWithOffers = await Promise.all(
        favorites.map(async (fav) => {
          const offer = await storage.getOffer(fav.offerId);
          const company = offer ? await storage.getCompanyProfileById(offer.companyId) : null;
          return { ...fav, offer: offer ? { ...offer, company } : null };
        })
      );

      res.json(favoritesWithOffers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/favorites/:offerId", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const isFav = await storage.isFavorite(userId, req.params.offerId);
      res.json(isFav);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/favorites", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertFavoriteSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const favorite = await storage.createFavorite(validated);
      res.json(favorite);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/favorites/:offerId", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.deleteFavorite(userId, req.params.offerId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Tracking & Redirect System
  app.get("/track/:code", async (req, res) => {
    try {
      const trackingCode = req.params.code;
      
      // Look up application by tracking code
      const application = await storage.getApplicationByTrackingCode(trackingCode);
      if (!application) {
        return res.status(404).send("Tracking link not found");
      }

      // Get offer details for product URL
      const offer = await storage.getOffer(application.offerId);
      if (!offer) {
        return res.status(404).send("Offer not found");
      }

      // Extract client IP (normalize for proxies/load balancers)
      let clientIp = 'unknown';
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        // X-Forwarded-For can be comma-separated, take first (client) IP
        const ips = String(forwardedFor).split(',').map(ip => ip.trim());
        clientIp = ips[0];
      } else if (req.socket.remoteAddress) {
        clientIp = req.socket.remoteAddress;
      } else if (req.ip) {
        clientIp = req.ip;
      }
      
      // Clean IPv6-mapped IPv4 addresses (::ffff:192.168.1.1 → 192.168.1.1)
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }

      const userAgent = req.headers['user-agent'] || 'unknown';
      const referer = req.headers['referer'] || req.headers['referrer'] || 'direct';
      
      // Log the click asynchronously (don't block redirect)
      storage.logTrackingClick(application.id, {
        ip: clientIp,
        userAgent,
        referer,
        timestamp: new Date(),
      }).catch(err => console.error('[Tracking] Error logging click:', err));

      // Redirect to product URL
      res.redirect(302, offer.productUrl);
    } catch (error: any) {
      console.error('[Tracking] Error:', error);
      res.status(500).send("Internal server error");
    }
  });

  // Analytics routes
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const dateRange = (req.query.range as string) || '30d';
      const analyticsData = await storage.getAnalyticsByCreator(userId);
      const applications = await storage.getApplicationsByCreator(userId);
      const chartData = await storage.getAnalyticsTimeSeriesByCreator(userId, dateRange);

      const stats = {
        totalEarnings: analyticsData?.totalEarnings || 0,
        activeOffers: applications.filter(a => a.status === 'active' || a.status === 'approved').length,
        totalClicks: analyticsData?.totalClicks || 0,
        uniqueClicks: analyticsData?.uniqueClicks || 0,
        conversions: analyticsData?.conversions || 0,
        conversionRate: analyticsData?.totalClicks > 0 
          ? ((analyticsData?.conversions || 0) / analyticsData.totalClicks * 100).toFixed(1)
          : 0,
        chartData: chartData,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Messages routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/messages/:conversationId", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });

      const message = await storage.createMessage(validated);
      res.json(message);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Reviews routes
  app.post("/api/reviews", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertReviewSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const review = await storage.createReview(validated);
      res.json(review);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Payment Settings routes
  app.get("/api/payment-settings", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const settings = await storage.getPaymentSettings(userId);
      res.json(settings);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/payment-settings", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertPaymentSettingSchema.parse({
        ...req.body,
        userId,
      });

      const setting = await storage.createPaymentSetting(validated);
      res.json(setting);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company routes
  app.get("/api/company/stats", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      
      if (!companyProfile) {
        return res.json({
          activeCreators: 0,
          pendingApplications: 0,
          liveOffers: 0,
          draftOffers: 0,
          totalApplications: 0,
          totalClicks: 0,
          conversions: 0,
          companyProfile: null,
        });
      }

      const offers = await storage.getOffersByCompany(companyProfile.id);
      let totalApplications = 0;

      for (const offer of offers) {
        const apps = await storage.getApplicationsByOffer(offer.id);
        totalApplications += apps.length;
      }

      const stats = {
        activeCreators: 0, // TODO: Count unique active creators
        pendingApplications: 0, // TODO: Count pending applications
        liveOffers: offers.filter(o => o.status === 'approved').length,
        draftOffers: offers.filter(o => o.status === 'draft').length,
        totalApplications,
        totalClicks: 0, // TODO: Aggregate from analytics
        conversions: 0, // TODO: Aggregate from analytics
        companyProfile,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const pendingCompanies = await storage.getPendingCompanies();
      const pendingOffers = await storage.getPendingOffers();

      const stats = {
        totalUsers: 0, // TODO: Count all users
        newUsersThisWeek: 0, // TODO: Count users created this week
        pendingCompanies: pendingCompanies.length,
        pendingOffers: pendingOffers.length,
        activeOffers: 0, // TODO: Count approved offers
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/companies", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companies = await storage.getPendingCompanies();
      res.json(companies);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/companies/:id/approve", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const company = await storage.approveCompany(req.params.id);
      res.json(company);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/companies/:id/reject", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { reason } = req.body;
      const company = await storage.rejectCompany(req.params.id, reason);
      res.json(company);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/offers", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offers = await storage.getPendingOffers();
      res.json(offers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/offers/:id/approve", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offer = await storage.approveOffer(req.params.id);
      res.json(offer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Object Storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    const userId = (req.user as any)?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/company-logos", requireAuth, requireRole('company'), async (req, res) => {
    if (!req.body.logoUrl) {
      return res.status(400).json({ error: "logoUrl is required" });
    }
    const userId = (req.user as any).id;
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.logoUrl,
        {
          owner: userId,
          visibility: "public",
        },
      );
      const companyProfile = await storage.getCompanyProfile(userId);
      if (companyProfile) {
        await storage.updateCompanyProfile(userId, { logoUrl: objectPath });
      }
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting company logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/offer-videos", requireAuth, requireRole('company'), async (req, res) => {
    if (!req.body.videoUrl || !req.body.offerId) {
      return res.status(400).json({ error: "videoUrl and offerId are required" });
    }
    const userId = (req.user as any).id;
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.videoUrl,
        {
          owner: userId,
          visibility: "public",
        },
      );
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting offer video:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req: any) => {
    const userId = req.user?.id; // This would need proper auth integration
    
    if (userId) {
      clients.set(userId, ws);
    }

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat_message') {
          // Save message to database
          const savedMessage = await storage.createMessage({
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
          });

          // Find all participants in the conversation
          const conversation = await storage.getConversation(message.conversationId);
          
          // Send to all participants
          const recipientIds = [conversation.creatorId, conversation.companyId];
          for (const recipientId of recipientIds) {
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'new_message',
                message: savedMessage,
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
  });

  // Auto-approval scheduler - runs every minute to check for applications that need auto-approval
  const runAutoApprovalScheduler = async () => {
    try {
      const pendingApplications = await storage.getAllPendingApplications();
      const now = new Date();
      let processedCount = 0;
      
      for (const application of pendingApplications) {
        // Only process pending applications with scheduled auto-approval time
        if (application.status === 'pending' && application.autoApprovalScheduledAt) {
          const scheduledTime = new Date(application.autoApprovalScheduledAt);
          
          // Check if the application is past its 7-minute auto-approval window
          if (now >= scheduledTime) {
            try {
              const trackingCode = `CR-${application.creatorId.substring(0, 8)}-${application.offerId.substring(0, 8)}-${Date.now()}`;
              const trackingLink = `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/track/${trackingCode}`;
              
              await storage.approveApplication(
                application.id,
                trackingLink,
                trackingCode
              );
              
              processedCount++;
              console.log(`[Auto-Approval] ✓ Approved application ${application.id} (${processedCount} total)`);
            } catch (error) {
              console.error(`[Auto-Approval] ✗ Failed to approve application ${application.id}:`, error);
            }
          }
        }
      }
      
      if (processedCount > 0) {
        console.log(`[Auto-Approval] Processed ${processedCount} applications successfully`);
      }
    } catch (error) {
      console.error('[Auto-Approval] Scheduler error:', error);
    }
  };

  // Run scheduler every minute
  console.log('[Auto-Approval] Scheduler started - checking every 60 seconds');
  setInterval(runAutoApprovalScheduler, 60000);
  
  // Run once immediately on startup
  runAutoApprovalScheduler();

  return httpServer;
}
