import {
  subscriptions, aiCredits, userPremiumFeatures,
  type Subscription, type InsertSubscription,
  type AiCredits, type UserPremiumFeature,
  type User, type InsertUser,
  type ContactMessage, type InsertContactMessage,
  type NewsletterSubscriber, type InsertNewsletterSubscriber,
  type LeadMagnetLead, type InsertLeadMagnetLead,
  type ChatConversation, type ChatMessage,
  type Testimonial, type InsertTestimonial,
  type BlogPost, type InsertBlogPost, type UpdateBlogPost,
  type ContentDraft, type InsertContentDraft, type UpdateContentDraft,
  type AuthorityItem, type InsertAuthorityItem, type UpdateAuthorityItem,
  type MarketplaceProduct, type InsertMarketplaceProduct, type UpdateMarketplaceProduct,
  type KnowledgeDocument, type InsertKnowledgeDoc, type UpdateKnowledgeDoc,
  type Consultation, type InsertConsultation, type UpdateConsultation,
  type Booking, type InsertBooking,
  type Order,
  type DigestReport,
  type OfferMappingOverride,
  type AuditLog, type InsertAuditLog,
  type AutomationJob, type InsertAutomationJob,
  type AutomationJobLog, type InsertAutomationJobLog,
  type RevenueRecoveryAction, type InsertRevenueRecoveryAction, type UpdateRevenueRecoveryAction,
  type ContentOpportunity, type InsertContentOpportunity, type UpdateContentOpportunity,
  type AutonomousAlert, type InsertAutonomousAlert, type UpdateAutonomousAlert,
  type GrowthExperiment, type InsertGrowthExperiment, type UpdateGrowthExperiment,
  type SourcePerformanceSnapshot, type InsertSourcePerformanceSnapshot,
  type FunnelLeakReport, type InsertFunnelLeakReport,
  type OfferPerformanceSnapshot, type InsertOfferPerformanceSnapshot,
  type ExecutionPolicy, type InsertExecutionPolicy, type UpdateExecutionPolicy,
  type AppliedChange, type InsertAppliedChange, type UpdateAppliedChange,
  type ExecutionQueueItem, type InsertExecutionQueueItem, type UpdateExecutionQueueItem,
  type RollbackEvent, type InsertRollbackEvent,
  type UserRole, type InsertUserRole,
  type ApprovalRequest, type InsertApprovalRequest,
  type AiExplanation, type InsertAiExplanation,
  type SystemHealthSnapshot, type InsertSystemHealthSnapshot,
  type QuarterlyStrategyReport, type InsertQuarterlyStrategyReport,
  type QaSentinelReport, type InsertQaSentinelReport,
  type RecoveryReport, type InsertRecoveryReport,
  type GrowthIntelligenceReport, type InsertGrowthIntelligenceReport,
  type GrowthRecommendation, type InsertGrowthRecommendation,
  type Experiment, type InsertExperiment,
  type ExperimentAssignment, type ExperimentEvent,
  type PersonalizationSegment, type InsertPersonalizationSegment,
  type PersonalizationProfile, type PersonalizationRule, type InsertPersonalizationRule,
  users, contactMessages, newsletterSubscribers, leadMagnetLeads, chatConversations, clickEvents, pageViews, testimonials, blogPosts, contentDrafts, authorityItems, marketplaceProducts, knowledgeDocuments, consultations, bookings, orders, digestReports, offerMappingOverrides, auditLogs, automationSettings,
  automationJobs, automationJobLogs, revenueRecoveryActions, contentOpportunities, autonomousAlerts,
  growthExperiments, sourcePerformanceSnapshots, funnelLeakReports, offerPerformanceSnapshots,
  executionPolicies, appliedChanges, executionQueue, rollbackEvents,
  userRoles, approvalRequests, aiExplanations, systemHealthSnapshots, quarterlyStrategyReports,
  qaSentinelReports, recoveryReports, growthIntelligenceReports, growthRecommendations,
  experiments, experimentAssignments, experimentEvents,
  personalizationSegments, personalizationProfiles, personalizationRules, personalizationEvents,
  revenueCommandReports, revenueAlerts,
  type RevenueCommandReport, type InsertRevenueCommandReport,
  type RevenueAlert, type InsertRevenueAlert,
  orchestratorMemory, orchestratorWorkflows, orchestratorAgentRuns,
  type OrchestratorMemory, type InsertOrchestratorMemory,
  type OrchestratorWorkflow, type InsertOrchestratorWorkflow,
  type OrchestratorAgentRun, type InsertOrchestratorAgentRun,
  neuralSignals, commandBusEvents, cognitiveStateSnapshots, executiveEscalations,
  globalHealthScores, insightStreamEntries, workflowDependencies,
  type NeuralSignal, type InsertNeuralSignal,
  type CommandBusEvent, type InsertCommandBusEvent,
  type CognitiveStateSnapshot, type InsertCognitiveStateSnapshot,
  type ExecutiveEscalation, type InsertExecutiveEscalation,
  type GlobalHealthScore, type InsertGlobalHealthScore,
  type InsightStreamEntry, type InsertInsightStreamEntry,
  type WorkflowDependency, type InsertWorkflowDependency,
  meshAgents, meshMissions, meshTasks, meshCommunications,
  meshQueue, meshTopologySnapshots, meshWorkerMemory, meshAuditLogs,
  type MeshAgent, type InsertMeshAgent,
  type MeshMission, type InsertMeshMission,
  type MeshTask, type InsertMeshTask,
  type MeshCommunication, type InsertMeshCommunication,
  type MeshQueueItem, type InsertMeshQueueItem,
  type MeshTopologySnapshot, type InsertMeshTopologySnapshot,
  type MeshWorkerMemory, type InsertMeshWorkerMemory,
  type MeshAuditLog, type InsertMeshAuditLog,
  founderIntelReports, founderDecisionItems,
  type FounderIntelReport, type InsertFounderIntelReport,
  type FounderDecisionItem, type InsertFounderDecisionItem,
  revenueIntelReports, revenueInsights,
  type RevenueIntelReport, type InsertRevenueIntelReport,
  type RevenueInsight, type InsertRevenueInsight,
  growthAutoOpportunities, growthAutoCampaigns, growthAutoReports,
  type GrowthAutoOpportunity, type InsertGrowthAutoOpportunity,
  type GrowthAutoCampaign, type InsertGrowthAutoCampaign,
  type GrowthAutoReport, type InsertGrowthAutoReport,
  cognitiveDecisions, cognitiveBriefings, cognitiveConflicts,
  type CognitiveDecision, type InsertCognitiveDecision,
  type CognitiveBriefing, type InsertCognitiveBriefing,
  type CognitiveConflict, type InsertCognitiveConflict,
  campaigns, campaignAssets, CAMPAIGN_ASSET_KEYS,
  type Campaign, type CampaignAsset, type CampaignWithAssets,
  type CreateCampaignInput, type UpdateCampaignAssetInput, type CampaignAssetKey,
  type UpdateCampaignInput,
} from "@shared/schema";
import type { CognitiveSignal } from "@shared/types/cognitive";
import { db } from "./db";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Phase 68A — customer accounts + billing + AI credits
  getUserByEmail(email: string): Promise<User | undefined>;
  createCustomer(email: string, passwordHash: string): Promise<User>;
  setUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void>;
  setUserPremiumTier(userId: string, tier: string): Promise<void>;
  upsertSubscription(sub: InsertSubscription): Promise<Subscription>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  getActiveSubscriptionForUser(userId: string): Promise<Subscription | undefined>;
  listSubscriptionsByStatus(statuses: string[]): Promise<Subscription[]>;
  ensureAiCredits(userId: string, monthlyAllotment: number): Promise<AiCredits>;
  getAiCredits(userId: string): Promise<AiCredits | undefined>;
  consumeAiCredit(userId: string, cost: number): Promise<AiCredits | null>;
  setAiCreditAllotment(userId: string, monthlyAllotment: number, resetBalance: boolean): Promise<AiCredits>;
  listAiCreditAccounts(): Promise<AiCredits[]>;
  setPremiumFeatures(userId: string, featureKeys: string[], source: string): Promise<void>;
  getPremiumFeatures(userId: string): Promise<UserPremiumFeature[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  replyContactMessage(id: number): Promise<ContactMessage | undefined>;
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  createLeadMagnetLead(lead: InsertLeadMagnetLead): Promise<LeadMagnetLead>;
  getLeadMagnetLeadByEmail(email: string): Promise<LeadMagnetLead | undefined>;
  updateLeadMagnetLeadSource(id: number, source: string): Promise<LeadMagnetLead>;
  getLeadMagnetLeads(): Promise<LeadMagnetLead[]>;
  getOrCreateChatSession(sessionId: string): Promise<ChatConversation>;
  appendChatMessage(sessionId: string, message: ChatMessage): Promise<void>;
  updateChatLead(sessionId: string, name?: string, email?: string): Promise<void>;
  getChatConversation(sessionId: string): Promise<ChatConversation | undefined>;
  getAllChatConversations(temperature?: string): Promise<ChatConversation[]>;
  updateChatIntelligence(sessionId: string, data: Partial<ChatConversation>): Promise<void>;
  getChatSession(sessionId: string): Promise<ChatConversation | undefined>;
  updateChatSummary(sessionId: string, data: {
    sessionSummary?: string;
    leadQuality?: string;
    recommendedFollowup?: string;
    ctaShown?: string;
    conversionOutcome?: string;
  }): Promise<void>;
  markLeadConverted(sessionId: string): Promise<void>;
  recordPageView(page: string): Promise<void>;
  getPageViews(days?: number): Promise<{ createdAt: Date; page: string }[]>;
  getVisitTotals(): Promise<{ total: number; last7d: number; last24h: number }>;
  recordClick(product: string, label: string): Promise<void>;
  getClickStats(): Promise<{ product: string; label: string; count: number }[]>;
  getTestimonials(all?: boolean): Promise<Testimonial[]>;
  createTestimonial(t: InsertTestimonial): Promise<Testimonial>;
  deleteTestimonial(id: number): Promise<void>;
  toggleTestimonialApproval(id: number): Promise<Testimonial | undefined>;
  getContentDrafts(status?: string): Promise<ContentDraft[]>;
  getContentDraft(id: number): Promise<ContentDraft | undefined>;
  createContentDraft(draft: InsertContentDraft): Promise<ContentDraft>;
  updateContentDraft(id: number, updates: UpdateContentDraft): Promise<ContentDraft | undefined>;
  setContentDraftStatus(id: number, status: string, publishedPostId?: number): Promise<ContentDraft | undefined>;
  transitionContentDraftStatus(id: number, from: string[], to: string): Promise<ContentDraft | undefined>;
  deleteContentDraft(id: number): Promise<void>;
  getAuthorityItems(publishedOnly?: boolean): Promise<AuthorityItem[]>;
  getAuthorityItem(id: number): Promise<AuthorityItem | undefined>;
  createAuthorityItem(item: InsertAuthorityItem): Promise<AuthorityItem>;
  updateAuthorityItem(id: number, updates: UpdateAuthorityItem): Promise<AuthorityItem | undefined>;
  deleteAuthorityItem(id: number): Promise<void>;
  getMarketplaceProducts(publishedOnly?: boolean): Promise<MarketplaceProduct[]>;
  getMarketplaceProduct(id: number): Promise<MarketplaceProduct | undefined>;
  getMarketplaceProductBySlug(slug: string): Promise<MarketplaceProduct | undefined>;
  createMarketplaceProduct(product: InsertMarketplaceProduct): Promise<MarketplaceProduct>;
  updateMarketplaceProduct(id: number, updates: UpdateMarketplaceProduct): Promise<MarketplaceProduct | undefined>;
  deleteMarketplaceProduct(id: number): Promise<void>;
  setOrderFulfillment(stripeSessionId: string, fulfillmentStatus: string): Promise<Order | undefined>;
  getBlogPosts(publishedOnly?: boolean): Promise<BlogPost[]>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, updates: UpdateBlogPost): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<void>;
  toggleBlogPostPublished(id: number): Promise<BlogPost | undefined>;
  // Phase 72 — Content Distribution Engine (Campaigns)
  createCampaignFromBlog(input: CreateCampaignInput): Promise<CampaignWithAssets>;
  listCampaigns(): Promise<CampaignWithAssets[]>;
  getCampaign(id: number): Promise<CampaignWithAssets | undefined>;
  updateCampaign(id: number, updates: UpdateCampaignInput): Promise<Campaign | undefined>;
  updateCampaignAsset(campaignId: number, assetKey: CampaignAssetKey, updates: UpdateCampaignAssetInput): Promise<CampaignAsset | undefined>;
  duplicateCampaign(id: number): Promise<CampaignWithAssets | undefined>;
  deleteCampaign(id: number): Promise<void>;
  // Phase 35 — Knowledge Base
  getKnowledgeDocs(publishedOnly?: boolean): Promise<KnowledgeDocument[]>;
  getPublishedKnowledgeByIntent(intent?: string | null): Promise<KnowledgeDocument[]>;
  createKnowledgeDoc(doc: InsertKnowledgeDoc): Promise<KnowledgeDocument>;
  updateKnowledgeDoc(id: number, updates: UpdateKnowledgeDoc): Promise<KnowledgeDocument | undefined>;
  deleteKnowledgeDoc(id: number): Promise<void>;
  toggleKnowledgeDocPublished(id: number): Promise<KnowledgeDocument | undefined>;
  // Phase 40 — CRM Pipeline
  updateLeadPipelineStage(sessionId: string, stage: string, note?: string, wonValue?: number, lostReason?: string, followupDueDate?: Date | null): Promise<void>;
  getLeadsByPipelineStage(stage?: string): Promise<ChatConversation[]>;
  // Phase 36 — Consultations
  getConsultations(activeOnly?: boolean): Promise<Consultation[]>;
  getConsultation(id: number): Promise<Consultation | undefined>;
  createConsultation(data: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: number, data: UpdateConsultation): Promise<Consultation | undefined>;
  deleteConsultation(id: number): Promise<void>;
  toggleConsultationActive(id: number): Promise<Consultation | undefined>;
  seedDefaultConsultations(): Promise<void>;
  // Phase 36 — Bookings
  createBooking(data: InsertBooking): Promise<Booking>;
  getAllBookings(): Promise<(Booking & { consultationTitle?: string })[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<void>;
  // Phase 37 — Orders
  createOrder(data: any): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByStripeSession(stripeSessionId: string): Promise<Order | undefined>;
  updateOrderStatus(stripeSessionId: string, status: string, extra?: any): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrderStats(): Promise<{ total: number; paid: number; revenue: number; abandoned: number }>;
  // Phase 45 — Reliability & Audit Layer
  createAuditLog(entry: Omit<InsertAuditLog, "actorLabel"> & { actorLabel?: string }): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getSystemHealthSummary(): Promise<{ lastLeadAt: Date | null; lastDigestAt: Date | null; totalLeads: number; totalPaidOrders: number; totalAuditActions: number }>;

  // Phase 44 — Revenue Attribution Dashboard
  getRevenueAttributionData(): Promise<{
    monthlySeries: { month: string; stripeRevenue: number; wonRevenue: number; total: number }[];
    byOffer: { name: string; revenue: number; count: number; avgValue: number }[];
    byIntent: { intent: string; revenue: number; count: number }[];
    bySource: { source: string; revenue: number; count: number }[];
    topPaths: { intent: string; offer: string; revenue: number; count: number }[];
    totals: { stripeRevenue: number; wonRevenue: number; combinedRevenue: number; paidOrders: number; wonDeals: number; avgOrderValue: number };
  }>;
  // Phase 43 — Offer Recommendation Optimization
  getOfferMappingOverrides(): Promise<OfferMappingOverride[]>;
  setOfferMappingOverride(intent: string, offer: string): Promise<OfferMappingOverride>;
  removeOfferMappingOverride(intent: string): Promise<void>;
  toggleOfferMappingOverride(intent: string, isActive: boolean): Promise<void>;
  getOfferOptimizerData(): Promise<{
    perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }>;
    perIntent: Record<string, { recommended: number; accepted: number; acceptanceRate: number; topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null }>;
  }>;
  // Phase 42 — Follow-Up Automation
  markFollowupSent(sessionId: string, newDueDate: Date): Promise<void>;
  getReminderQueue(): Promise<{ overdue: ChatConversation[]; silentHot: ChatConversation[] }>;
  // Phase 41 — Conversion Analytics
  markOfferAccepted(sessionId: string, offerSlug: string, source: string): Promise<void>;
  getConversionFunnel(): Promise<{
    totalSessions: number; withIntent: number; emailCaptured: number;
    qualified: number; booked: number; paidOrders: number;
    stages: { name: string; count: number; rate: number }[];
  }>;
  getConversionAnalytics(): Promise<{
    byIntent: Record<string, { total: number; qualified: number; qualifiedRate: number; booked: number; bookedRate: number; won: number; wonRate: number; offered: number; accepted: number; offerAcceptanceRate: number }>;
    offerAcceptance: Record<string, { timesRecommended: number; timesAccepted: number; acceptanceRate: number; bySource: Record<string, number> }>;
    byConsultation: Record<string, { title: string; total: number; confirmed: number; confirmRate: number }>;
  }>;
  getUrgencyDashboard(): Promise<{
    overdueHotLeads: number; newQualifiedLeads: number; pendingBookings: number;
    paidOrdersToday: number; unrepliedContacts: number; topRecommendedOffer: string | null;
  }>;
  // Phase 39 — Digest + Intelligence
  saveDigestReport(data: {
    weekStart: Date; weekEnd: Date; narrative: string;
    topIntents: any; hotLeadsCount: number; qualifiedCount: number;
    bookedCount: number; wonValue: number; followupsDue: number;
    unansweredHotLeads: number; topRecommendedOffer: string | null;
    knowledgeBackedChats: number; supportPatterns: string | null;
    contentOpportunities: string | null; conversionByIntent: any;
  }): Promise<DigestReport>;
  getLatestDigest(): Promise<DigestReport | null>;
  getAllDigests(limit?: number): Promise<DigestReport[]>;
  getDashboardIntelligence(): Promise<{
    qualifiedCount: number;
    bookedThisWeek: number;
    wonThisMonth: number;
    overdueFollowups: number;
    topRecommendedOffer: string | null;
    knowledgeBackedChats: number;
    conversionByIntent: Record<string, { total: number; won: number; rate: number }>;
    overdueLeads: { sessionId: string; leadName: string | null; leadEmail: string | null; intent: string | null; followupDueDate: Date | null }[];
  }>;
  getDashboardSummary(): Promise<{
    leads: { total: number; emailCaptured: number; hot: number; qualified: number; bookedThisWeek: number; wonThisMonth: number };
    revenue: { totalPaid: number; paidOrders: number; avgOrderValue: number; abandoned: number };
    engagement: { newsletterSubscribers: number; contactForms: number; unrepliedContacts: number; pendingBookings: number };
    topIntent: string | null;
    topRecommendedOffer: string | null;
    generatedAt: string;
  }>;
  getAutomationSetting(key: string): Promise<string | null>;
  setAutomationSetting(key: string, value: string): Promise<void>;

  // Phase 49 — Automation Jobs
  getAutomationJob(jobKey: string): Promise<AutomationJob | null>;
  getAutomationJobs(): Promise<AutomationJob[]>;
  upsertAutomationJob(jobKey: string, patch: Partial<InsertAutomationJob>): Promise<AutomationJob>;
  createAutomationJobLog(input: InsertAutomationJobLog): Promise<void>;
  getAutomationJobLogs(jobKey: string, limit?: number): Promise<AutomationJobLog[]>;

  // Phase 53 — QA Sentinel reports
  createQaSentinelReport(input: InsertQaSentinelReport): Promise<QaSentinelReport>;
  getLatestQaSentinelReport(): Promise<QaSentinelReport | null>;
  getQaSentinelReports(limit?: number): Promise<QaSentinelReport[]>;

  // Phase 54 — Recovery reports
  createRecoveryReport(input: InsertRecoveryReport): Promise<RecoveryReport>;
  getLatestRecoveryReport(): Promise<RecoveryReport | null>;
  getRecoveryReports(limit?: number): Promise<RecoveryReport[]>;

  // Phase 56 — Growth Intelligence
  createGrowthReport(input: InsertGrowthIntelligenceReport): Promise<GrowthIntelligenceReport>;
  getLatestGrowthReport(): Promise<GrowthIntelligenceReport | null>;
  getGrowthReports(limit?: number): Promise<GrowthIntelligenceReport[]>;
  createGrowthRecommendation(input: InsertGrowthRecommendation): Promise<GrowthRecommendation>;
  listGrowthRecommendations(status?: string, limit?: number): Promise<GrowthRecommendation[]>;
  getGrowthRecommendation(id: number): Promise<GrowthRecommendation | null>;
  updateGrowthRecommendationStatus(
    id: number,
    status: "approved" | "rejected" | "applied" | "pending",
    decidedBy: string,
    notes?: string
  ): Promise<GrowthRecommendation>;

  // Phase 57 — Experiment Orchestrator
  createExperiment(input: InsertExperiment): Promise<Experiment>;
  getExperiment(id: number): Promise<Experiment | null>;
  getExperimentByKey(key: string): Promise<Experiment | null>;
  listExperiments(status?: string, limit?: number): Promise<Experiment[]>;
  updateExperiment(id: number, patch: Partial<Experiment>): Promise<Experiment>;
  getOrCreateExperimentAssignment(experimentId: number, subjectKey: string, variantKey: string): Promise<ExperimentAssignment>;
  getExperimentAssignment(experimentId: number, subjectKey: string): Promise<ExperimentAssignment | null>;
  recordExperimentEvent(experimentId: number, variantKey: string, subjectKey: string, eventType: string, value?: number | null): Promise<void>;
  getExperimentVariantStats(experimentId: number): Promise<Array<{ variantKey: string; assignments: number; conversions: number; revenueCents: number }>>;

  // Phase 58 — Personalization Engine
  listPersonalizationSegments(): Promise<PersonalizationSegment[]>;
  upsertPersonalizationSegment(input: InsertPersonalizationSegment): Promise<PersonalizationSegment>;
  getPersonalizationProfile(subjectKey: string): Promise<PersonalizationProfile | null>;
  upsertPersonalizationProfile(input: { subjectKey: string; segmentKey: string; behavioralScore: number; intent: string; funnelStage: string; signals: Record<string, any> }): Promise<PersonalizationProfile>;
  listPersonalizationRules(status?: string, surface?: string): Promise<PersonalizationRule[]>;
  getPersonalizationRule(id: number): Promise<PersonalizationRule | null>;
  findActivePersonalizationRule(surface: string, segmentKey: string): Promise<PersonalizationRule | null>;
  createPersonalizationRule(input: InsertPersonalizationRule): Promise<PersonalizationRule>;
  updatePersonalizationRule(id: number, patch: Partial<PersonalizationRule>): Promise<PersonalizationRule>;
  deactivateOtherPersonalizationRules(surface: string, segmentKey: string, exceptId: number): Promise<void>;
  recordPersonalizationEvent(input: { subjectKey: string; segmentKey: string; surface: string; ruleId: number | null; eventType: string; value: number | null }): Promise<void>;
  getPersonalizationEventStats(surface?: string): Promise<Array<{ surface: string; segmentKey: string; views: number; clicks: number; conversions: number; ctr: number; cvr: number; revenueCents: number }>>;
  getPersonalizationProfileCounts(): Promise<Array<{ segmentKey: string; count: number; avgScore: number }>>;

  // Phase 59 — Revenue Command Center
  listRecentOrders(windowDays: number): Promise<Order[]>;
  createRevenueCommandReport(input: InsertRevenueCommandReport): Promise<RevenueCommandReport>;
  getLatestRevenueCommandReport(): Promise<RevenueCommandReport | null>;
  listRevenueAlerts(status?: string, limit?: number): Promise<RevenueAlert[]>;
  createRevenueAlert(input: InsertRevenueAlert): Promise<RevenueAlert | null>;
  acknowledgeRevenueAlert(id: number, ackedBy: string): Promise<RevenueAlert>;

  // Phase 60 — Orchestrator
  upsertOrchestratorMemory(input: InsertOrchestratorMemory): Promise<OrchestratorMemory>;
  listOrchestratorMemory(scope?: string, limit?: number): Promise<OrchestratorMemory[]>;
  createOrchestratorWorkflow(input: InsertOrchestratorWorkflow): Promise<OrchestratorWorkflow>;
  getOrchestratorWorkflow(id: number): Promise<OrchestratorWorkflow | null>;
  updateOrchestratorWorkflow(id: number, patch: Partial<OrchestratorWorkflow>): Promise<OrchestratorWorkflow>;
  claimOrchestratorWorkflow(id: number, attemptCount: number): Promise<OrchestratorWorkflow | null>;
  listOrchestratorWorkflows(status?: string, limit?: number): Promise<OrchestratorWorkflow[]>;
  listQueuedOrchestratorWorkflows(limit?: number): Promise<OrchestratorWorkflow[]>;
  findRecentCompletedWorkflow(workflowKey: string, withinMinutes: number): Promise<OrchestratorWorkflow | null>;
  createOrchestratorAgentRun(input: InsertOrchestratorAgentRun): Promise<OrchestratorAgentRun>;
  listOrchestratorAgentRuns(workflowId: number): Promise<OrchestratorAgentRun[]>;
  getOrchestratorStats(): Promise<{ queued: number; running: number; pendingApproval: number; succeeded24h: number; failed24h: number; blocked24h: number }>;

  // Phase 61 — Neural Command Grid
  createNeuralSignal(input: InsertNeuralSignal): Promise<NeuralSignal | null>;
  listNeuralSignals(opts?: { severity?: string; status?: string; limit?: number }): Promise<NeuralSignal[]>;
  updateNeuralSignalStatus(id: number, status: string): Promise<void>;
  createCommandBusEvent(input: InsertCommandBusEvent): Promise<CommandBusEvent>;
  listCommandBusEvents(limit?: number): Promise<CommandBusEvent[]>;
  createCognitiveStateSnapshot(input: InsertCognitiveStateSnapshot): Promise<CognitiveStateSnapshot>;
  getLatestCognitiveStateSnapshot(): Promise<CognitiveStateSnapshot | null>;
  createExecutiveEscalation(input: InsertExecutiveEscalation): Promise<ExecutiveEscalation | null>;
  listExecutiveEscalations(status?: string, limit?: number): Promise<ExecutiveEscalation[]>;
  resolveExecutiveEscalation(id: number, by: string): Promise<ExecutiveEscalation>;
  createGlobalHealthScore(input: InsertGlobalHealthScore): Promise<GlobalHealthScore>;
  listLatestGlobalHealthScores(): Promise<GlobalHealthScore[]>;
  createInsightStreamEntry(input: InsertInsightStreamEntry): Promise<InsightStreamEntry>;
  listInsightStreamEntries(limit?: number): Promise<InsightStreamEntry[]>;
  createWorkflowDependency(input: InsertWorkflowDependency): Promise<WorkflowDependency | null>;
  listWorkflowDependencies(): Promise<WorkflowDependency[]>;

  // Phase 62 — Autonomous Execution Mesh
  upsertMeshAgent(input: InsertMeshAgent): Promise<MeshAgent>;
  listMeshAgents(status?: string): Promise<MeshAgent[]>;
  getMeshAgentByKey(agentKey: string): Promise<MeshAgent | null>;
  heartbeatMeshAgent(agentKey: string, status?: string): Promise<void>;
  recordMeshAgentRun(agentKey: string, success: boolean, latencyMs: number): Promise<void>;
  createMeshMission(input: InsertMeshMission): Promise<MeshMission>;
  listMeshMissions(status?: string, limit?: number): Promise<MeshMission[]>;
  getMeshMission(id: number): Promise<MeshMission | null>;
  updateMeshMission(id: number, patch: Partial<MeshMission>): Promise<MeshMission>;
  claimMeshMission(id: number): Promise<MeshMission | null>;
  createMeshTask(input: InsertMeshTask): Promise<MeshTask>;
  listMeshTasks(missionId?: number, limit?: number): Promise<MeshTask[]>;
  updateMeshTask(id: number, patch: Partial<MeshTask>): Promise<MeshTask>;
  createMeshCommunication(input: InsertMeshCommunication): Promise<MeshCommunication>;
  listMeshCommunications(limit?: number): Promise<MeshCommunication[]>;
  enqueueMeshMission(input: InsertMeshQueueItem): Promise<MeshQueueItem | null>;
  lockMeshQueueItem(workerId: string, ttlMs: number): Promise<MeshQueueItem | null>;
  releaseMeshQueueItem(id: number, status: string): Promise<void>;
  listMeshQueue(status?: string, limit?: number): Promise<MeshQueueItem[]>;
  createMeshTopologySnapshot(input: InsertMeshTopologySnapshot): Promise<MeshTopologySnapshot>;
  getLatestMeshTopologySnapshot(): Promise<MeshTopologySnapshot | null>;
  writeMeshWorkerMemory(input: InsertMeshWorkerMemory): Promise<MeshWorkerMemory>;
  readMeshWorkerMemory(agentKey: string, memoryScope?: string): Promise<MeshWorkerMemory[]>;
  createMeshAuditLog(input: InsertMeshAuditLog): Promise<MeshAuditLog>;
  listMeshAuditLogs(missionId?: number, limit?: number): Promise<MeshAuditLog[]>;
  getMeshStats(): Promise<{ idleAgents: number; busyAgents: number; queuedMissions: number; runningMissions: number; failedMissions24h: number; completedMissions24h: number }>;

  // Phase 49 — Revenue Recovery
  getRevenueRecoveryActions(limit?: number): Promise<RevenueRecoveryAction[]>;
  createRevenueRecoveryAction(input: InsertRevenueRecoveryAction): Promise<RevenueRecoveryAction>;
  updateRevenueRecoveryAction(id: number, patch: UpdateRevenueRecoveryAction): Promise<RevenueRecoveryAction | undefined>;
  listAcceptedButUnpaidSessions(): Promise<any[]>;
  listAbandonedCheckoutOrders(hoursSinceCreated?: number): Promise<any[]>;
  listStaleFulfillmentOrders(hoursStale?: number): Promise<any[]>;

  // Phase 49 — Content Opportunities
  getContentOpportunities(limit?: number): Promise<ContentOpportunity[]>;
  createContentOpportunity(input: InsertContentOpportunity): Promise<ContentOpportunity>;
  updateContentOpportunity(id: number, patch: UpdateContentOpportunity): Promise<ContentOpportunity | undefined>;

  // Phase 49 — Executive Digests
  getLatestDigestByType(reportType: string): Promise<any | undefined>;
  createDigestReportTyped(input: any): Promise<any>;

  // Phase 49 — Autonomous Alerts
  getAutonomousAlerts(limit?: number): Promise<AutonomousAlert[]>;
  createAutonomousAlert(input: InsertAutonomousAlert): Promise<AutonomousAlert>;
  updateAutonomousAlert(id: number, patch: UpdateAutonomousAlert): Promise<AutonomousAlert | undefined>;

  // Phase 50 — Growth Optimization
  getGrowthExperiments(limit?: number): Promise<GrowthExperiment[]>;
  createGrowthExperiment(input: InsertGrowthExperiment): Promise<GrowthExperiment>;
  updateGrowthExperiment(id: number, patch: UpdateGrowthExperiment): Promise<GrowthExperiment | undefined>;
  getLatestSourcePerformance(limit?: number): Promise<SourcePerformanceSnapshot[]>;
  createSourcePerformanceSnapshot(input: InsertSourcePerformanceSnapshot): Promise<SourcePerformanceSnapshot>;
  getLatestFunnelLeaks(limit?: number): Promise<FunnelLeakReport[]>;
  createFunnelLeakReport(input: InsertFunnelLeakReport): Promise<FunnelLeakReport>;
  getLatestOfferPerformance(limit?: number): Promise<OfferPerformanceSnapshot[]>;
  createOfferPerformanceSnapshot(input: InsertOfferPerformanceSnapshot): Promise<OfferPerformanceSnapshot>;
  getSourcePerformanceCandidates(periodDays?: number): Promise<any[]>;
  getOfferPerformanceCandidates(periodDays?: number): Promise<any[]>;
  getFunnelLeakCandidates(periodDays?: number): Promise<any>;

  // Phase 51 — Autonomous Execution
  getExecutionPolicies(): Promise<ExecutionPolicy[]>;
  upsertExecutionPolicy(input: InsertExecutionPolicy): Promise<ExecutionPolicy>;
  updateExecutionPolicy(policyKey: string, patch: Partial<InsertExecutionPolicy>): Promise<ExecutionPolicy | undefined>;
  getExecutionQueue(limit?: number): Promise<ExecutionQueueItem[]>;
  createExecutionQueueItem(input: InsertExecutionQueueItem): Promise<ExecutionQueueItem>;
  updateExecutionQueueItem(id: number, patch: Partial<InsertExecutionQueueItem>): Promise<ExecutionQueueItem | undefined>;
  getAppliedChanges(limit?: number): Promise<AppliedChange[]>;
  createAppliedChange(input: InsertAppliedChange): Promise<AppliedChange>;
  updateAppliedChange(id: number, patch: UpdateAppliedChange): Promise<AppliedChange | undefined>;
  getAppliedChangeByKey(changeKey: string): Promise<AppliedChange | undefined>;
  getRollbackEvents(limit?: number): Promise<RollbackEvent[]>;
  createRollbackEvent(input: InsertRollbackEvent): Promise<RollbackEvent>;
  getApprovedExperimentsReadyForExecution(): Promise<GrowthExperiment[]>;
  getSafeOverrideCandidates(): Promise<any[]>;
  getSafeCtaCandidates(): Promise<any[]>;
  getLinksPriorityCandidates(): Promise<any[]>;
  getChangeImpactMetrics(changeKey: string): Promise<any>;
  seedDefaultExecutionPolicies(): Promise<void>;

  // Phase 52 — Founder Control, Scale & Maturity
  getUserRoles(): Promise<UserRole[]>;
  upsertUserRole(input: InsertUserRole): Promise<UserRole>;
  updateUserRole(id: number, patch: Partial<InsertUserRole>): Promise<UserRole | undefined>;
  getApprovalRequests(status?: string): Promise<ApprovalRequest[]>;
  createApprovalRequest(input: InsertApprovalRequest): Promise<ApprovalRequest>;
  updateApprovalRequest(id: number, patch: Partial<InsertApprovalRequest>): Promise<ApprovalRequest | undefined>;
  getAiExplanations(entityType?: string, entityId?: string, limit?: number): Promise<AiExplanation[]>;
  createAiExplanation(input: InsertAiExplanation): Promise<AiExplanation>;
  getSystemHealthSnapshots(limit?: number): Promise<SystemHealthSnapshot[]>;
  createSystemHealthSnapshot(input: InsertSystemHealthSnapshot): Promise<SystemHealthSnapshot>;
  getLatestHealthSnapshot(): Promise<SystemHealthSnapshot | undefined>;
  getQuarterlyStrategyReports(limit?: number): Promise<QuarterlyStrategyReport[]>;
  createQuarterlyStrategyReport(input: InsertQuarterlyStrategyReport): Promise<QuarterlyStrategyReport>;
  getFounderOverview(): Promise<any>;
  getWhatChangedToday(): Promise<any>;

  // Phase 67 — Cognitive Operating System
  getCognitiveDecisions(opts?: { kind?: string; status?: string; limit?: number }): Promise<CognitiveDecision[]>;
  createCognitiveDecision(input: InsertCognitiveDecision): Promise<CognitiveDecision>;
  replaceCognitiveDecisions(items: InsertCognitiveDecision[]): Promise<CognitiveDecision[]>;
  updateCognitiveDecisionStatus(id: number, status: string): Promise<CognitiveDecision | undefined>;
  getCognitiveBriefings(periodType?: string, limit?: number): Promise<CognitiveBriefing[]>;
  getCognitiveBriefing(id: number): Promise<CognitiveBriefing | undefined>;
  createCognitiveBriefing(input: InsertCognitiveBriefing): Promise<CognitiveBriefing>;
  getCognitiveConflicts(opts?: { status?: string; limit?: number }): Promise<CognitiveConflict[]>;
  createCognitiveConflict(input: InsertCognitiveConflict): Promise<CognitiveConflict>;
  replaceCognitiveConflicts(items: InsertCognitiveConflict[]): Promise<CognitiveConflict[]>;
  updateCognitiveConflictStatus(id: number, status: string): Promise<CognitiveConflict | undefined>;
  getAllCognitiveSignals(): Promise<CognitiveSignal[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ─── Phase 68A — customer accounts + billing + AI credits ───────────────────
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createCustomer(email: string, passwordHash: string): Promise<User> {
    const [user] = await db.insert(users)
      .values({ email: email.toLowerCase(), passwordHash, premiumTier: "free" })
      .returning();
    return user;
  }

  async setUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
  }

  async setUserPremiumTier(userId: string, tier: string): Promise<void> {
    await db.update(users).set({ premiumTier: tier }).where(eq(users.id, userId));
  }

  async upsertSubscription(sub: InsertSubscription): Promise<Subscription> {
    const existing = sub.stripeSubscriptionId
      ? await this.getSubscriptionByStripeId(sub.stripeSubscriptionId)
      : undefined;
    if (existing) {
      const [updated] = await db.update(subscriptions)
        .set({ ...sub, updatedAt: new Date() })
        .where(eq(subscriptions.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(subscriptions).values(sub).returning();
    return created;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [row] = await db.select().from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return row;
  }

  async getActiveSubscriptionForUser(userId: string): Promise<Subscription | undefined> {
    const [row] = await db.select().from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "trialing", "past_due"]),
      ))
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(1);
    return row;
  }

  async listSubscriptionsByStatus(statuses: string[]): Promise<Subscription[]> {
    if (statuses.length === 0) return [];
    return db.select().from(subscriptions).where(inArray(subscriptions.status, statuses));
  }

  async ensureAiCredits(userId: string, monthlyAllotment: number): Promise<AiCredits> {
    const existing = await this.getAiCredits(userId);
    if (existing) return existing;
    const [created] = await db.insert(aiCredits)
      .values({ userId, balance: monthlyAllotment, monthlyAllotment })
      .onConflictDoNothing({ target: aiCredits.userId })
      .returning();
    if (created) return created;
    // Lost the race — row already created concurrently.
    return (await this.getAiCredits(userId))!;
  }

  async getAiCredits(userId: string): Promise<AiCredits | undefined> {
    const [row] = await db.select().from(aiCredits).where(eq(aiCredits.userId, userId));
    return row;
  }

  // Atomic, race-safe decrement. Returns the updated row, or null if there were
  // not enough credits (the guarded UPDATE matched no row).
  async consumeAiCredit(userId: string, cost: number): Promise<AiCredits | null> {
    const [row] = await db.update(aiCredits)
      .set({ balance: sql`${aiCredits.balance} - ${cost}`, updatedAt: new Date() })
      .where(and(eq(aiCredits.userId, userId), gte(aiCredits.balance, cost)))
      .returning();
    return row ?? null;
  }

  async setAiCreditAllotment(userId: string, monthlyAllotment: number, resetBalance: boolean): Promise<AiCredits> {
    await this.ensureAiCredits(userId, monthlyAllotment);
    const set: any = { monthlyAllotment, updatedAt: new Date() };
    if (resetBalance) { set.balance = monthlyAllotment; set.lastResetAt = new Date(); }
    const [row] = await db.update(aiCredits).set(set).where(eq(aiCredits.userId, userId)).returning();
    return row;
  }

  async listAiCreditAccounts(): Promise<AiCredits[]> {
    return db.select().from(aiCredits);
  }

  async setPremiumFeatures(userId: string, featureKeys: string[], source: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Replace subscription-sourced entitlements; preserve manual grants.
      await tx.delete(userPremiumFeatures)
        .where(and(eq(userPremiumFeatures.userId, userId), eq(userPremiumFeatures.source, source)));
      if (featureKeys.length > 0) {
        await tx.insert(userPremiumFeatures)
          .values(featureKeys.map((featureKey) => ({ userId, featureKey, source, enabled: true })))
          .onConflictDoNothing({ target: [userPremiumFeatures.userId, userPremiumFeatures.featureKey] });
      }
    });
  }

  async getPremiumFeatures(userId: string): Promise<UserPremiumFeature[]> {
    return db.select().from(userPremiumFeatures)
      .where(and(eq(userPremiumFeatures.userId, userId), eq(userPremiumFeatures.enabled, true)));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [contactMessage] = await db.insert(contactMessages).values(message).returning();
    return contactMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(contactMessages.createdAt);
  }

  async replyContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [updated] = await db
      .update(contactMessages)
      .set({ repliedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  }

  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [newsletterSubscriber] = await db.insert(newsletterSubscribers).values(subscriber).returning();
    return newsletterSubscriber;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers);
  }

  async createLeadMagnetLead(lead: InsertLeadMagnetLead): Promise<LeadMagnetLead> {
    const [created] = await db.insert(leadMagnetLeads).values(lead).returning();
    return created;
  }

  async getLeadMagnetLeadByEmail(email: string): Promise<LeadMagnetLead | undefined> {
    const [found] = await db
      .select()
      .from(leadMagnetLeads)
      .where(eq(leadMagnetLeads.email, email))
      .limit(1);
    return found;
  }

  async updateLeadMagnetLeadSource(id: number, source: string): Promise<LeadMagnetLead> {
    const [updated] = await db
      .update(leadMagnetLeads)
      .set({ source, updatedAt: new Date() })
      .where(eq(leadMagnetLeads.id, id))
      .returning();
    return updated;
  }

  async getLeadMagnetLeads(): Promise<LeadMagnetLead[]> {
    return db.select().from(leadMagnetLeads).orderBy(desc(leadMagnetLeads.createdAt));
  }

  async getOrCreateChatSession(sessionId: string): Promise<ChatConversation> {
    const [existing] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));

    if (existing) return existing;

    const [created] = await db
      .insert(chatConversations)
      .values({ sessionId, messages: [] })
      .returning();

    return created;
  }

  async appendChatMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const conversation = await this.getOrCreateChatSession(sessionId);
    const currentMessages = (conversation.messages as ChatMessage[]) ?? [];
    const updatedMessages = [...currentMessages, message];

    await db
      .update(chatConversations)
      .set({ messages: updatedMessages, updatedAt: new Date() })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async updateChatLead(sessionId: string, name?: string, email?: string): Promise<void> {
    const updates: Partial<ChatConversation> = { updatedAt: new Date() };
    if (name) updates.leadName = name;
    if (email) updates.leadEmail = email;

    await db
      .update(chatConversations)
      .set(updates)
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getChatConversation(sessionId: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));
    return conversation;
  }

  async getAllChatConversations(temperature?: string): Promise<ChatConversation[]> {
    const query = db.select().from(chatConversations);
    if (temperature && temperature !== "all") {
      return query
        .where(eq(chatConversations.leadTemperature, temperature))
        .orderBy(desc(chatConversations.updatedAt));
    }
    return query.orderBy(desc(chatConversations.updatedAt));
  }

  async updateChatIntelligence(sessionId: string, data: Partial<ChatConversation>): Promise<void> {
    await db
      .update(chatConversations)
      .set(data)
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getChatSession(sessionId: string): Promise<ChatConversation | undefined> {
    const [row] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));
    return row;
  }

  async updateChatSummary(sessionId: string, data: {
    sessionSummary?: string;
    leadQuality?: string;
    recommendedFollowup?: string;
    ctaShown?: string;
    conversionOutcome?: string;
  }): Promise<void> {
    await db
      .update(chatConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async markLeadConverted(sessionId: string): Promise<void> {
    await db
      .update(chatConversations)
      .set({
        conversionOutcome: "converted",
        assignedStage: "converted",
        leadTemperature: "priority",
        updatedAt: new Date(),
      })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async recordPageView(page: string): Promise<void> {
    await db.insert(pageViews).values({ page });
  }

  // Bounded read — page-view rows from the last `days` only (default 90), with a
  // hard row cap. The pageViews table grows without bound in production; loading
  // it whole into Node memory caused out-of-memory events on the fixed-size prod
  // instance. All-time totals come from getVisitTotals() (SQL COUNT) instead.
  async getPageViews(days = 90): Promise<{ createdAt: Date; page: string }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db.select({ createdAt: pageViews.createdAt, page: pageViews.page })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .orderBy(desc(pageViews.createdAt))
      .limit(50_000);
  }

  // All-time + windowed visit counts computed in SQL — never materializes rows.
  async getVisitTotals(): Promise<{ total: number; last7d: number; last24h: number }> {
    const [row] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        last7d: sql<number>`cast(count(*) filter (where ${pageViews.createdAt} >= now() - interval '7 days') as int)`,
        last24h: sql<number>`cast(count(*) filter (where ${pageViews.createdAt} >= now() - interval '24 hours') as int)`,
      })
      .from(pageViews);
    return row ?? { total: 0, last7d: 0, last24h: 0 };
  }

  async recordClick(product: string, label: string): Promise<void> {
    await db.insert(clickEvents).values({ product, label });
  }

  async getClickStats(): Promise<{ product: string; label: string; count: number }[]> {
    return db
      .select({
        product: clickEvents.product,
        label: clickEvents.label,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(clickEvents)
      .groupBy(clickEvents.product, clickEvents.label)
      .orderBy(sql`count(*) desc`);
  }

  async getTestimonials(all = false): Promise<Testimonial[]> {
    if (all) {
      return db.select().from(testimonials).orderBy(testimonials.createdAt);
    }
    return db.select().from(testimonials)
      .where(eq(testimonials.approved, true))
      .orderBy(testimonials.createdAt);
  }

  async createTestimonial(t: InsertTestimonial): Promise<Testimonial> {
    const [row] = await db.insert(testimonials).values(t).returning();
    return row;
  }

  async deleteTestimonial(id: number): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }

  async toggleTestimonialApproval(id: number): Promise<Testimonial | undefined> {
    const [existing] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(testimonials)
      .set({ approved: !existing.approved })
      .where(eq(testimonials.id, id))
      .returning();
    return updated;
  }

  async getContentDrafts(status?: string): Promise<ContentDraft[]> {
    if (status) {
      return db.select().from(contentDrafts).where(eq(contentDrafts.status, status)).orderBy(desc(contentDrafts.createdAt));
    }
    return db.select().from(contentDrafts).orderBy(desc(contentDrafts.createdAt));
  }

  async getContentDraft(id: number): Promise<ContentDraft | undefined> {
    const [row] = await db.select().from(contentDrafts).where(eq(contentDrafts.id, id));
    return row;
  }

  async createContentDraft(draft: InsertContentDraft): Promise<ContentDraft> {
    const [row] = await db.insert(contentDrafts).values(draft).returning();
    return row;
  }

  async updateContentDraft(id: number, updates: UpdateContentDraft): Promise<ContentDraft | undefined> {
    const [row] = await db.update(contentDrafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentDrafts.id, id))
      .returning();
    return row;
  }

  async setContentDraftStatus(id: number, status: string, publishedPostId?: number): Promise<ContentDraft | undefined> {
    const set: Record<string, unknown> = { status, updatedAt: new Date() };
    if (publishedPostId !== undefined) set.publishedPostId = publishedPostId;
    const [row] = await db.update(contentDrafts)
      .set(set)
      .where(eq(contentDrafts.id, id))
      .returning();
    return row;
  }

  async transitionContentDraftStatus(id: number, from: string[], to: string): Promise<ContentDraft | undefined> {
    const [row] = await db.update(contentDrafts)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(contentDrafts.id, id), inArray(contentDrafts.status, from)))
      .returning();
    return row;
  }

  async deleteContentDraft(id: number): Promise<void> {
    await db.delete(contentDrafts).where(eq(contentDrafts.id, id));
  }

  async getAuthorityItems(publishedOnly = true): Promise<AuthorityItem[]> {
    const order = [asc(authorityItems.sortOrder), desc(authorityItems.createdAt)];
    if (publishedOnly) {
      return db.select().from(authorityItems).where(eq(authorityItems.published, true)).orderBy(...order);
    }
    return db.select().from(authorityItems).orderBy(...order);
  }

  async getAuthorityItem(id: number): Promise<AuthorityItem | undefined> {
    const [row] = await db.select().from(authorityItems).where(eq(authorityItems.id, id));
    return row;
  }

  async createAuthorityItem(item: InsertAuthorityItem): Promise<AuthorityItem> {
    const [row] = await db.insert(authorityItems).values(item).returning();
    return row;
  }

  async updateAuthorityItem(id: number, updates: UpdateAuthorityItem): Promise<AuthorityItem | undefined> {
    const [row] = await db.update(authorityItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(authorityItems.id, id))
      .returning();
    return row;
  }

  async deleteAuthorityItem(id: number): Promise<void> {
    await db.delete(authorityItems).where(eq(authorityItems.id, id));
  }

  async getMarketplaceProducts(publishedOnly = true): Promise<MarketplaceProduct[]> {
    const order = [asc(marketplaceProducts.sortOrder), desc(marketplaceProducts.createdAt)];
    if (publishedOnly) {
      return db.select().from(marketplaceProducts).where(eq(marketplaceProducts.published, true)).orderBy(...order);
    }
    return db.select().from(marketplaceProducts).orderBy(...order);
  }

  async getMarketplaceProduct(id: number): Promise<MarketplaceProduct | undefined> {
    const [row] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, id));
    return row;
  }

  async getMarketplaceProductBySlug(slug: string): Promise<MarketplaceProduct | undefined> {
    const [row] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.slug, slug));
    return row;
  }

  async createMarketplaceProduct(product: InsertMarketplaceProduct): Promise<MarketplaceProduct> {
    const [row] = await db.insert(marketplaceProducts).values(product).returning();
    return row;
  }

  async updateMarketplaceProduct(id: number, updates: UpdateMarketplaceProduct): Promise<MarketplaceProduct | undefined> {
    const [row] = await db.update(marketplaceProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketplaceProducts.id, id))
      .returning();
    return row;
  }

  async deleteMarketplaceProduct(id: number): Promise<void> {
    await db.delete(marketplaceProducts).where(eq(marketplaceProducts.id, id));
  }

  async setOrderFulfillment(stripeSessionId: string, fulfillmentStatus: string): Promise<Order | undefined> {
    const [row] = await db.update(orders)
      .set({ fulfillmentStatus, updatedAt: new Date() })
      .where(eq(orders.stripeSessionId, stripeSessionId))
      .returning();
    return row;
  }

  async getBlogPosts(publishedOnly = true): Promise<BlogPost[]> {
    if (publishedOnly) {
      return db.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(blogPosts.createdAt);
    }
    return db.select().from(blogPosts).orderBy(blogPosts.createdAt);
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [row] = await db.insert(blogPosts).values(post).returning();
    return row;
  }

  async updateBlogPost(id: number, updates: UpdateBlogPost): Promise<BlogPost | undefined> {
    const [row] = await db.update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return row;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async toggleBlogPostPublished(id: number): Promise<BlogPost | undefined> {
    const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(blogPosts)
      .set({ published: !existing.published, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  // Phase 72 — Content Distribution Engine (Campaigns)
  async createCampaignFromBlog(input: CreateCampaignInput): Promise<CampaignWithAssets> {
    return db.transaction(async (tx) => {
      const [campaign] = await tx.insert(campaigns).values({
        title: input.title,
        source: "blog",
        blogPostId: input.blogPostId,
        blogSlug: input.blogSlug,
        topic: input.topic ?? "",
      }).returning();
      const blogContent = input.blogContent ?? "";
      const rows = CAMPAIGN_ASSET_KEYS.map((assetKey) => ({
        campaignId: campaign.id,
        assetKey,
        content: assetKey === "blog" ? blogContent : "",
        status: (assetKey === "blog" && blogContent ? "generated" : "empty") as string,
      }));
      const assets = await tx.insert(campaignAssets).values(rows).returning();
      return { ...campaign, assets };
    });
  }

  async listCampaigns(): Promise<CampaignWithAssets[]> {
    const list = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
    if (list.length === 0) return [];
    const ids = list.map((c) => c.id);
    const allAssets = await db.select().from(campaignAssets)
      .where(inArray(campaignAssets.campaignId, ids))
      .orderBy(asc(campaignAssets.id));
    const byCampaign = new Map<number, CampaignAsset[]>();
    for (const a of allAssets) {
      const arr = byCampaign.get(a.campaignId);
      if (arr) arr.push(a);
      else byCampaign.set(a.campaignId, [a]);
    }
    return list.map((c) => ({ ...c, assets: byCampaign.get(c.id) ?? [] }));
  }

  async updateCampaign(id: number, updates: UpdateCampaignInput): Promise<Campaign | undefined> {
    const set: Partial<typeof campaigns.$inferInsert> = { updatedAt: new Date() };
    if (updates.status !== undefined) set.status = updates.status;
    if (updates.title !== undefined) set.title = updates.title;
    const [row] = await db.update(campaigns).set(set).where(eq(campaigns.id, id)).returning();
    return row;
  }

  async duplicateCampaign(id: number): Promise<CampaignWithAssets | undefined> {
    return db.transaction(async (tx) => {
      const [source] = await tx.select().from(campaigns).where(eq(campaigns.id, id));
      if (!source) return undefined;
      const srcAssets = await tx.select().from(campaignAssets)
        .where(eq(campaignAssets.campaignId, id))
        .orderBy(asc(campaignAssets.id));
      const [copy] = await tx.insert(campaigns).values({
        title: `Copy of ${source.title}`.slice(0, 300),
        source: source.source,
        blogPostId: source.blogPostId,
        blogSlug: source.blogSlug,
        topic: source.topic,
        status: "draft",
      }).returning();
      const rows = srcAssets.length > 0
        ? srcAssets.map((a) => ({ campaignId: copy.id, assetKey: a.assetKey, content: a.content, status: a.status }))
        : CAMPAIGN_ASSET_KEYS.map((assetKey) => ({ campaignId: copy.id, assetKey, content: "", status: "empty" as string }));
      const assets = await tx.insert(campaignAssets).values(rows).returning();
      return { ...copy, assets };
    });
  }

  async getCampaign(id: number): Promise<CampaignWithAssets | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!campaign) return undefined;
    const assets = await db.select().from(campaignAssets)
      .where(eq(campaignAssets.campaignId, id))
      .orderBy(asc(campaignAssets.id));
    return { ...campaign, assets };
  }

  async updateCampaignAsset(
    campaignId: number,
    assetKey: CampaignAssetKey,
    updates: UpdateCampaignAssetInput,
  ): Promise<CampaignAsset | undefined> {
    return db.transaction(async (tx) => {
      const [campaign] = await tx.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, campaignId));
      if (!campaign) return undefined;
      const now = new Date();
      const [row] = await tx.insert(campaignAssets)
        .values({
          campaignId,
          assetKey,
          content: updates.content,
          status: updates.status ?? "edited",
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [campaignAssets.campaignId, campaignAssets.assetKey],
          set: {
            content: updates.content,
            status: updates.status ?? "edited",
            updatedAt: now,
          },
        })
        .returning();
      await tx.update(campaigns).set({ updatedAt: now }).where(eq(campaigns.id, campaignId));
      return row;
    });
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(campaignAssets).where(eq(campaignAssets.campaignId, id));
      await tx.delete(campaigns).where(eq(campaigns.id, id));
    });
  }

  // Phase 35 — Knowledge Base
  async getKnowledgeDocs(publishedOnly?: boolean): Promise<KnowledgeDocument[]> {
    const query = db.select().from(knowledgeDocuments);
    if (publishedOnly) {
      return query.where(eq(knowledgeDocuments.isPublished, true)).orderBy(desc(knowledgeDocuments.priority), asc(knowledgeDocuments.createdAt));
    }
    return query.orderBy(desc(knowledgeDocuments.priority), asc(knowledgeDocuments.createdAt));
  }

  async getPublishedKnowledgeByIntent(intent?: string | null): Promise<KnowledgeDocument[]> {
    const INTENT_CATEGORY_MAP: Record<string, string[]> = {
      app_interest: ["apps", "general"],
      book_interest: ["books", "general"],
      music_interest: ["music", "general"],
      art_commission: ["art_studio", "general"],
      sales_service: ["services", "pricing", "general"],
      sales_consultation: ["services", "pricing", "general"],
      support: ["support", "faq", "general"],
      collaboration: ["collaboration", "general"],
      media_press: ["brand_story", "general"],
      newsletter: ["general"],
      general_brand: ["brand_story", "general"],
    };
    const docs = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.isPublished, true))
      .orderBy(desc(knowledgeDocuments.priority), asc(knowledgeDocuments.createdAt));

    if (!intent || !INTENT_CATEGORY_MAP[intent]) return docs.slice(0, 8);

    const preferred = INTENT_CATEGORY_MAP[intent];
    const prioritized = [
      ...docs.filter((d) => preferred.slice(0, -1).includes(d.category)),
      ...docs.filter((d) => d.category === "general"),
      ...docs.filter((d) => !preferred.includes(d.category)),
    ];
    return prioritized.slice(0, 8);
  }

  async createKnowledgeDoc(doc: InsertKnowledgeDoc): Promise<KnowledgeDocument> {
    const [row] = await db.insert(knowledgeDocuments).values(doc).returning();
    return row;
  }

  async updateKnowledgeDoc(id: number, updates: UpdateKnowledgeDoc): Promise<KnowledgeDocument | undefined> {
    const [row] = await db.update(knowledgeDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, id))
      .returning();
    return row;
  }

  async deleteKnowledgeDoc(id: number): Promise<void> {
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
  }

  async toggleKnowledgeDocPublished(id: number): Promise<KnowledgeDocument | undefined> {
    const [existing] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(knowledgeDocuments)
      .set({ isPublished: !existing.isPublished, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, id))
      .returning();
    return updated;
  }

  // Phase 40 — CRM Pipeline
  async updateLeadPipelineStage(
    sessionId: string,
    stage: string,
    note?: string,
    wonValue?: number,
    lostReason?: string,
    followupDueDate?: Date | null
  ): Promise<void> {
    const [existing] = await db
      .select({ stageHistory: chatConversations.stageHistory })
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));
    if (!existing) return;

    const history = (existing.stageHistory as { stage: string; at: string; note?: string }[]) ?? [];
    const newEntry = { stage, at: new Date().toISOString(), ...(note ? { note } : {}) };

    const updateData: Partial<ChatConversation> = {
      pipelineStage: stage,
      stageHistory: [...history, newEntry] as any,
      updatedAt: new Date(),
    };
    if (wonValue !== undefined) updateData.wonValue = wonValue;
    if (lostReason !== undefined) updateData.lostReason = lostReason;
    if (followupDueDate !== undefined) updateData.followupDueDate = followupDueDate ?? undefined;

    await db.update(chatConversations).set(updateData).where(eq(chatConversations.sessionId, sessionId));
  }

  async getLeadsByPipelineStage(stage?: string): Promise<ChatConversation[]> {
    if (stage && stage !== "all") {
      return db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.pipelineStage, stage))
        .orderBy(desc(chatConversations.updatedAt));
    }
    return db.select().from(chatConversations).orderBy(desc(chatConversations.updatedAt));
  }

  // Phase 36 — Consultations
  async getConsultations(activeOnly?: boolean): Promise<Consultation[]> {
    const q = db.select().from(consultations);
    if (activeOnly) {
      return q.where(eq(consultations.isActive, true)).orderBy(asc(consultations.sortOrder), asc(consultations.createdAt));
    }
    return q.orderBy(asc(consultations.sortOrder), asc(consultations.createdAt));
  }

  async getConsultation(id: number): Promise<Consultation | undefined> {
    const [row] = await db.select().from(consultations).where(eq(consultations.id, id));
    return row;
  }

  async createConsultation(data: InsertConsultation): Promise<Consultation> {
    const [row] = await db.insert(consultations).values(data).returning();
    return row;
  }

  async updateConsultation(id: number, data: UpdateConsultation): Promise<Consultation | undefined> {
    const [row] = await db.update(consultations).set(data).where(eq(consultations.id, id)).returning();
    return row;
  }

  async deleteConsultation(id: number): Promise<void> {
    await db.delete(consultations).where(eq(consultations.id, id));
  }

  async toggleConsultationActive(id: number): Promise<Consultation | undefined> {
    const [existing] = await db.select().from(consultations).where(eq(consultations.id, id));
    if (!existing) return undefined;
    const [updated] = await db.update(consultations)
      .set({ isActive: !existing.isActive })
      .where(eq(consultations.id, id))
      .returning();
    return updated;
  }

  async seedDefaultConsultations(): Promise<void> {
    // Idempotent backfill-by-title: guarantees the canonical 7 premium offers exist
    // on both fresh and already-seeded databases without duplicating or overwriting
    // founder-edited rows. Titles must stay in sync with client SESSION_MODE_MAP / SESSION_DETAILS.
    const defaults: InsertConsultation[] = [
      { title: "Brand Strategy Session", description: "Deep-dive into your brand identity, positioning, and growth roadmap. Walk away with a clear action plan to elevate your brand presence across all channels.", duration: 60, price: 9700, currency: "USD", isActive: true, sortOrder: 1 },
      { title: "AI Content Consultation", description: "Learn how to use AI tools to create, schedule, and scale your content strategy. Includes a personalised content calendar template and platform-specific guidance.", duration: 45, price: 7700, currency: "USD", isActive: true, sortOrder: 2 },
      { title: "Creative Direction Call", description: "Get expert creative feedback on your visuals, copywriting, and overall aesthetic. Ideal for product launches, rebrands, or campaigns that need a premium edge.", duration: 60, price: 9700, currency: "USD", isActive: true, sortOrder: 3 },
      { title: "App / Product Consultation", description: "Strategic guidance on your mobile app or digital product — from concept to launch. Covers UX thinking, monetisation, and growth levers based on real-world experience building Bondedlove, Healthwisesupport, and Video Crafter.", duration: 90, price: 14700, currency: "USD", isActive: true, sortOrder: 4 },
      { title: "Collaboration Discovery Call", description: "Explore potential partnerships, brand deals, music licensing, or co-creation opportunities with Elevate360Official. A relaxed, high-value call to see if we're a great fit.", duration: 30, price: 0, currency: "USD", isActive: true, sortOrder: 5 },
      { title: "Premium AI Brand Audit", description: "A premium diagnostic across your brand, content, and digital presence. You receive a written report with scores and a prioritized list of the highest-leverage improvements to elevate fast.", duration: 60, price: 19700, currency: "USD", isActive: true, sortOrder: 6 },
      { title: "Founder Growth Strategy Session", description: "A personalized founder growth roadmap built around your strengths — positioning, monetization, and the systems that scale you sustainably without burnout.", duration: 90, price: 24700, currency: "USD", isActive: true, sortOrder: 7 },
    ];
    const existing = await db.select({ title: consultations.title }).from(consultations);
    const existingTitles = new Set(existing.map((c) => c.title));
    const missing = defaults.filter((d) => !existingTitles.has(d.title));
    if (missing.length > 0) {
      await db.insert(consultations).values(missing);
    }
  }

  // Phase 36 — Bookings
  async createBooking(data: InsertBooking): Promise<Booking> {
    const [row] = await db.insert(bookings).values(data).returning();
    return row;
  }

  async getAllBookings(): Promise<(Booking & { consultationTitle?: string })[]> {
    const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    const allConsultations = await db.select({ id: consultations.id, title: consultations.title }).from(consultations);
    const consultMap = Object.fromEntries(allConsultations.map((c) => [c.id, c.title]));
    return rows.map((b) => ({ ...b, consultationTitle: b.consultationId ? consultMap[b.consultationId] : undefined }));
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [row] = await db.update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return row;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Phase 37 — Orders
  async createOrder(data: {
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    stripeProductId?: string;
    stripePriceId?: string;
    productName?: string;
    customerEmail: string;
    customerName?: string;
    amountPaid?: number;
    currency?: string;
    status?: string;
    fulfillmentStatus?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<Order> {
    const [row] = await db.insert(orders).values(data as any).returning();
    return row;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    return row;
  }

  async getOrderByStripeSession(stripeSessionId: string): Promise<Order | undefined> {
    const [row] = await db.select().from(orders).where(eq(orders.stripeSessionId, stripeSessionId));
    return row;
  }

  async updateOrderStatus(stripeSessionId: string, status: string, extra?: Partial<{
    stripePaymentIntentId: string;
    amountPaid: number;
    customerName: string;
    customerEmail: string;
  }>): Promise<Order | undefined> {
    const [row] = await db.update(orders)
      .set({ status, updatedAt: new Date(), ...(extra ?? {}) })
      .where(eq(orders.stripeSessionId, stripeSessionId))
      .returning();
    return row;
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderStats(): Promise<{ total: number; paid: number; revenue: number; abandoned: number }> {
    const all = await db.select().from(orders);
    const paid = all.filter((o) => o.status === "paid");
    return {
      total: all.length,
      paid: paid.length,
      revenue: paid.reduce((s, o) => s + (o.amountPaid ?? 0), 0),
      abandoned: all.filter((o) => o.status === "initiated").length,
    };
  }

  // Phase 45 — Reliability & Audit Layer
  async createAuditLog(entry: Omit<InsertAuditLog, "actorLabel"> & { actorLabel?: string }): Promise<AuditLog> {
    const [row] = await db.insert(auditLogs).values({
      actorLabel: entry.actorLabel ?? "admin",
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      meta: entry.meta ?? null,
    }).returning();
    return row;
  }

  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getSystemHealthSummary(): Promise<{ lastLeadAt: Date | null; lastDigestAt: Date | null; totalLeads: number; totalPaidOrders: number; totalAuditActions: number }> {
    const [leads, digests, paidOrders, auditCount] = await Promise.all([
      db.select({ createdAt: chatConversations.createdAt }).from(chatConversations).orderBy(desc(chatConversations.createdAt)).limit(1),
      db.select({ generatedAt: digestReports.generatedAt }).from(digestReports).orderBy(desc(digestReports.generatedAt)).limit(1),
      db.select({ id: orders.id }).from(orders).where(eq(orders.status, "paid")),
      db.select({ id: auditLogs.id }).from(auditLogs),
    ]);
    const [allLeads] = await Promise.all([
      db.select({ id: chatConversations.id }).from(chatConversations),
    ]);
    return {
      lastLeadAt: leads[0]?.createdAt ?? null,
      lastDigestAt: digests[0]?.generatedAt ?? null,
      totalLeads: allLeads.length,
      totalPaidOrders: paidOrders.length,
      totalAuditActions: auditCount.length,
    };
  }

  // Phase 44 — Revenue Attribution Dashboard
  async getRevenueAttributionData(): Promise<{
    monthlySeries: { month: string; stripeRevenue: number; wonRevenue: number; total: number }[];
    byOffer: { name: string; revenue: number; count: number; avgValue: number }[];
    byIntent: { intent: string; revenue: number; count: number }[];
    bySource: { source: string; revenue: number; count: number }[];
    topPaths: { intent: string; offer: string; revenue: number; count: number }[];
    totals: { stripeRevenue: number; wonRevenue: number; combinedRevenue: number; paidOrders: number; wonDeals: number; avgOrderValue: number };
  }> {
    const [paidOrders, allWonSessions] = await Promise.all([
      db.select().from(orders).where(eq(orders.status, "paid")).orderBy(asc(orders.createdAt)),
      db.select({
        intent: chatConversations.intent,
        wonValue: chatConversations.wonValue,
        acceptedOfferSlug: chatConversations.acceptedOfferSlug,
        acceptedOfferSource: chatConversations.acceptedOfferSource,
        updatedAt: chatConversations.updatedAt,
        sessionId: chatConversations.sessionId,
      }).from(chatConversations)
        .where(sql`${chatConversations.pipelineStage} = 'won' AND ${chatConversations.wonValue} IS NOT NULL AND ${chatConversations.wonValue} > 0`),
    ]);

    // M01 fix — exclude won sessions that already have a paid Stripe order to prevent double-counting
    const paidStripeSessionIds = new Set(paidOrders.map((o) => o.sessionId).filter(Boolean));
    const wonSessions = allWonSessions.filter((w) => !paidStripeSessionIds.has(w.sessionId));

    // Build session map for joining orders → intents
    const sessionIntentMap: Record<string, string | null> = {};
    const sessionSourceMap: Record<string, string | null> = {};
    const allSessions = await db.select({
      sessionId: chatConversations.sessionId,
      intent: chatConversations.intent,
      acceptedOfferSource: chatConversations.acceptedOfferSource,
    }).from(chatConversations);
    for (const s of allSessions) {
      sessionIntentMap[s.sessionId] = s.intent;
      sessionSourceMap[s.sessionId] = s.acceptedOfferSource;
    }

    // Monthly series (last 6 months)
    const now = new Date();
    const months: { month: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      months.push({ month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), start: d, end });
    }

    const monthlySeries = months.map(({ month, start, end }) => {
      const stripeRevenue = paidOrders
        .filter((o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end)
        .reduce((s, o) => s + (o.amountPaid ?? 0), 0);
      const wonRevenue = wonSessions
        .filter((s) => new Date(s.updatedAt) >= start && new Date(s.updatedAt) <= end)
        .reduce((s, w) => s + (w.wonValue ?? 0), 0);
      return { month, stripeRevenue, wonRevenue, total: stripeRevenue + wonRevenue };
    });

    // By offer (Stripe orders)
    const offerMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const name = o.productName ?? "Unknown Offer";
      if (!offerMap[name]) offerMap[name] = { revenue: 0, count: 0 };
      offerMap[name].revenue += o.amountPaid ?? 0;
      offerMap[name].count++;
    }
    const byOffer = Object.entries(offerMap)
      .map(([name, d]) => ({ name, revenue: d.revenue, count: d.count, avgValue: d.count > 0 ? Math.round(d.revenue / d.count) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    // By intent (orders joined via sessionId)
    const intentRevMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const intent = (o.sessionId && sessionIntentMap[o.sessionId]) ?? "direct";
      if (!intentRevMap[intent]) intentRevMap[intent] = { revenue: 0, count: 0 };
      intentRevMap[intent].revenue += o.amountPaid ?? 0;
      intentRevMap[intent].count++;
    }
    // Add won pipeline revenue to intent buckets
    for (const w of wonSessions) {
      const intent = w.intent ?? "direct";
      if (!intentRevMap[intent]) intentRevMap[intent] = { revenue: 0, count: 0 };
      intentRevMap[intent].revenue += w.wonValue ?? 0;
      intentRevMap[intent].count++;
    }
    const byIntent = Object.entries(intentRevMap)
      .map(([intent, d]) => ({ intent, revenue: d.revenue, count: d.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // By source
    const sourceMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const source = (o.sessionId && sessionSourceMap[o.sessionId]) ?? "direct";
      if (!sourceMap[source]) sourceMap[source] = { revenue: 0, count: 0 };
      sourceMap[source].revenue += o.amountPaid ?? 0;
      sourceMap[source].count++;
    }
    const bySource = Object.entries(sourceMap)
      .map(([source, d]) => ({ source, revenue: d.revenue, count: d.count }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top paths: intent → offer
    const pathMap: Record<string, { revenue: number; count: number }> = {};
    for (const o of paidOrders) {
      const intent = (o.sessionId && sessionIntentMap[o.sessionId]) ?? "direct";
      const offer = o.productName ?? "Unknown";
      const key = `${intent}||${offer}`;
      if (!pathMap[key]) pathMap[key] = { revenue: 0, count: 0 };
      pathMap[key].revenue += o.amountPaid ?? 0;
      pathMap[key].count++;
    }
    const topPaths = Object.entries(pathMap)
      .map(([key, d]) => { const [intent, offer] = key.split("||"); return { intent, offer, revenue: d.revenue, count: d.count }; })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const stripeRevenue = paidOrders.reduce((s, o) => s + (o.amountPaid ?? 0), 0);
    const wonRevenue = wonSessions.reduce((s, w) => s + (w.wonValue ?? 0), 0);
    const combinedRevenue = stripeRevenue + wonRevenue;

    return {
      monthlySeries,
      byOffer,
      byIntent,
      bySource,
      topPaths,
      totals: {
        stripeRevenue,
        wonRevenue,
        combinedRevenue,
        paidOrders: paidOrders.length,
        wonDeals: wonSessions.length,
        avgOrderValue: paidOrders.length > 0 ? Math.round(stripeRevenue / paidOrders.length) : 0,
      },
    };
  }

  // Phase 43 — Offer Recommendation Optimization
  async getOfferMappingOverrides(): Promise<OfferMappingOverride[]> {
    return db.select().from(offerMappingOverrides).orderBy(asc(offerMappingOverrides.intent));
  }

  async setOfferMappingOverride(intent: string, offer: string): Promise<OfferMappingOverride> {
    const existing = await db.select().from(offerMappingOverrides)
      .where(eq(offerMappingOverrides.intent, intent)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(offerMappingOverrides)
        .set({ overrideOffer: offer, isActive: true, updatedAt: new Date() })
        .where(eq(offerMappingOverrides.intent, intent))
        .returning();
      return updated;
    }
    const [created] = await db.insert(offerMappingOverrides)
      .values({ intent, overrideOffer: offer, isActive: true })
      .returning();
    return created;
  }

  async removeOfferMappingOverride(intent: string): Promise<void> {
    await db.delete(offerMappingOverrides).where(eq(offerMappingOverrides.intent, intent));
  }

  async toggleOfferMappingOverride(intent: string, isActive: boolean): Promise<void> {
    await db.update(offerMappingOverrides)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(offerMappingOverrides.intent, intent));
  }

  async getOfferOptimizerData(): Promise<{
    perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }>;
    perIntent: Record<string, { recommended: number; accepted: number; acceptanceRate: number; topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null }>;
  }> {
    const sessions = await db.select({
      intent: chatConversations.intent,
      recommendedOffer: chatConversations.recommendedOffer,
      acceptedOfferSlug: chatConversations.acceptedOfferSlug,
      recommendedOfferAccepted: chatConversations.recommendedOfferAccepted,
    }).from(chatConversations)
      .where(sql`${chatConversations.recommendedOffer} IS NOT NULL`);

    const perOffer: Record<string, { recommended: number; accepted: number; acceptanceRate: number; intents: string[] }> = {};
    const perIntent: Record<string, {
      recommended: number; accepted: number; acceptanceRate: number;
      topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null;
      _offerCounts: Record<string, { rec: number; acc: number }>;
    }> = {};

    for (const s of sessions) {
      const offer = s.recommendedOffer!;
      const intent = s.intent ?? "unknown";
      const accepted = s.recommendedOfferAccepted ?? false;

      // perOffer aggregation
      if (!perOffer[offer]) perOffer[offer] = { recommended: 0, accepted: 0, acceptanceRate: 0, intents: [] };
      perOffer[offer].recommended++;
      if (accepted) perOffer[offer].accepted++;
      if (!perOffer[offer].intents.includes(intent)) perOffer[offer].intents.push(intent);

      // perIntent aggregation
      if (!perIntent[intent]) perIntent[intent] = {
        recommended: 0, accepted: 0, acceptanceRate: 0,
        topOffer: null, currentMapping: null, suggestedOffer: null,
        _offerCounts: {},
      };
      perIntent[intent].recommended++;
      if (accepted) perIntent[intent].accepted++;
      if (!perIntent[intent]._offerCounts[offer]) perIntent[intent]._offerCounts[offer] = { rec: 0, acc: 0 };
      perIntent[intent]._offerCounts[offer].rec++;
      if (accepted) perIntent[intent]._offerCounts[offer].acc++;
    }

    // Compute acceptance rates + suggested offer (highest acceptance rate among offered options)
    for (const offer of Object.values(perOffer)) {
      offer.acceptanceRate = offer.recommended > 0 ? Math.round((offer.accepted / offer.recommended) * 100) : 0;
    }
    for (const [, intentData] of Object.entries(perIntent)) {
      intentData.acceptanceRate = intentData.recommended > 0
        ? Math.round((intentData.accepted / intentData.recommended) * 100) : 0;
      // Find best-performing offer for this intent
      let bestOffer: string | null = null;
      let bestRate = -1;
      for (const [offerName, counts] of Object.entries(intentData._offerCounts)) {
        const rate = counts.rec > 0 ? counts.acc / counts.rec : 0;
        if (rate > bestRate) { bestRate = rate; bestOffer = offerName; }
      }
      intentData.topOffer = bestOffer;
      intentData.suggestedOffer = bestOffer;
    }

    // Strip internal _offerCounts before returning
    const cleanPerIntent: Record<string, { recommended: number; accepted: number; acceptanceRate: number; topOffer: string | null; currentMapping: string | null; suggestedOffer: string | null }> = {};
    for (const [intent, data] of Object.entries(perIntent)) {
      const { _offerCounts: _ignored, ...rest } = data;
      cleanPerIntent[intent] = rest;
    }

    return { perOffer, perIntent: cleanPerIntent };
  }

  // Phase 42 — Follow-Up Automation
  async markFollowupSent(sessionId: string, newDueDate: Date): Promise<void> {
    const conv = await db.select({ followupCount: chatConversations.followupCount })
      .from(chatConversations).where(eq(chatConversations.sessionId, sessionId)).limit(1);
    const currentCount = conv[0]?.followupCount ?? 0;
    await db.update(chatConversations)
      .set({
        lastFollowupSentAt: new Date(),
        followupCount: currentCount + 1,
        followupDueDate: newDueDate,
      })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getReminderQueue(): Promise<{ overdue: ChatConversation[]; silentHot: ChatConversation[] }> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    // M04 fix — removed email-only filter so hot leads without a captured email still appear;
    // the UI already reads capturedEmail/leadEmail from each lead to decide which CTA to show.
    const all = await db.select().from(chatConversations)
      .orderBy(desc(chatConversations.leadScore));

    const overdue = all.filter((s) =>
      s.followupDueDate &&
      new Date(s.followupDueDate) < now &&
      !["won", "lost", "closed"].includes(s.pipelineStage ?? "")
    );

    const silentHot = all.filter((s) => {
      const isHot = (s.leadScore ?? 0) >= 50;
      const lastActivity = s.lastActivityAt ?? s.updatedAt;
      const isSilent = lastActivity && new Date(lastActivity) < threeDaysAgo;
      const notAlreadyOverdue = !(s.followupDueDate && new Date(s.followupDueDate) < now);
      const notWon = !["won", "lost", "closed"].includes(s.pipelineStage ?? "");
      return isHot && isSilent && notAlreadyOverdue && notWon;
    });

    return { overdue, silentHot };
  }

  // Phase 41 — Conversion Analytics
  async markOfferAccepted(sessionId: string, offerSlug: string, source: string): Promise<void> {
    await db.update(chatConversations)
      .set({ recommendedOfferAccepted: true, acceptedOfferSlug: offerSlug, acceptedOfferSource: source })
      .where(eq(chatConversations.sessionId, sessionId));
  }

  async getConversionFunnel() {
    const all = await db.select().from(chatConversations);
    const allOrders = await db.select({ id: orders.id, status: orders.status }).from(orders);
    const allBookings = await db.select({ id: bookings.id }).from(bookings);
    const totalSessions = all.length;
    const withIntent = all.filter((s) => s.intent).length;
    const emailCaptured = all.filter((s) => s.capturedEmail || s.leadEmail).length;
    const qualified = all.filter((s) => ["qualified", "booked", "won", "converted"].includes(s.pipelineStage)).length;
    const booked = allBookings.length;
    const paidOrders = allOrders.filter((o) => o.status === "paid").length;
    const r = (n: number) => (totalSessions ? Math.round((n / totalSessions) * 100) : 0);
    return {
      totalSessions, withIntent, emailCaptured, qualified, booked, paidOrders,
      stages: [
        { name: "Chat Sessions", count: totalSessions, rate: 100 },
        { name: "Intent Classified", count: withIntent, rate: r(withIntent) },
        { name: "Email Captured", count: emailCaptured, rate: r(emailCaptured) },
        { name: "Qualified", count: qualified, rate: r(qualified) },
        { name: "Booked", count: booked, rate: r(booked) },
        { name: "Won / Paid", count: paidOrders, rate: r(paidOrders) },
      ],
    };
  }

  async getConversionAnalytics() {
    const all = await db.select().from(chatConversations);
    const allBookings = await db.select().from(bookings);
    const allConsultations = await db.select().from(consultations);

    // By intent
    const intentGroups = new Map<string, typeof all>();
    for (const s of all) {
      const key = s.intent ?? "unclassified";
      if (!intentGroups.has(key)) intentGroups.set(key, []);
      intentGroups.get(key)!.push(s);
    }
    const byIntent: Record<string, any> = {};
    for (const [intent, sessions] of Array.from(intentGroups.entries())) {
      const total = sessions.length;
      const qualified = sessions.filter((s) => ["qualified", "booked", "won", "converted"].includes(s.pipelineStage)).length;
      const booked = sessions.filter((s) => ["booked", "won", "converted"].includes(s.pipelineStage)).length;
      const won = sessions.filter((s) => s.pipelineStage === "won").length;
      const offered = sessions.filter((s) => s.recommendedOffer).length;
      const accepted = sessions.filter((s) => s.recommendedOfferAccepted).length;
      byIntent[intent] = {
        total,
        qualified, qualifiedRate: total ? Math.round((qualified / total) * 100) : 0,
        booked, bookedRate: total ? Math.round((booked / total) * 100) : 0,
        won, wonRate: total ? Math.round((won / total) * 100) : 0,
        offered, accepted, offerAcceptanceRate: offered ? Math.round((accepted / offered) * 100) : 0,
      };
    }

    // Offer acceptance breakdown
    const offerAcceptance: Record<string, any> = {};
    for (const s of all.filter((x) => x.recommendedOffer)) {
      const offer = s.recommendedOffer!;
      if (!offerAcceptance[offer]) {
        offerAcceptance[offer] = { timesRecommended: 0, timesAccepted: 0, bySource: { AI: 0, page: 0, direct: 0, dashboard: 0 } };
      }
      offerAcceptance[offer].timesRecommended++;
      if (s.recommendedOfferAccepted) {
        offerAcceptance[offer].timesAccepted++;
        const src = (s.acceptedOfferSource as string) ?? "direct";
        offerAcceptance[offer].bySource[src] = (offerAcceptance[offer].bySource[src] ?? 0) + 1;
      }
    }
    for (const key of Object.keys(offerAcceptance)) {
      const row = offerAcceptance[key];
      row.acceptanceRate = row.timesRecommended ? Math.round((row.timesAccepted / row.timesRecommended) * 100) : 0;
    }

    // Consultation win rates
    const byConsultation: Record<string, any> = {};
    for (const c of allConsultations) {
      const cBookings = allBookings.filter((b) => b.consultationId === c.id);
      const confirmed = cBookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
      byConsultation[String(c.id)] = {
        title: c.title,
        total: cBookings.length,
        confirmed,
        confirmRate: cBookings.length ? Math.round((confirmed / cBookings.length) * 100) : 0,
      };
    }
    return { byIntent, offerAcceptance, byConsultation };
  }

  async getUrgencyDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const all = await db.select().from(chatConversations);
    const allBookings = await db.select({ id: bookings.id, status: bookings.status }).from(bookings);
    const allOrders = await db.select({ id: orders.id, status: orders.status, updatedAt: orders.updatedAt }).from(orders);
    const allContacts = await db.select({ id: contactMessages.id, repliedAt: contactMessages.repliedAt }).from(contactMessages);

    const overdueHotLeads = all.filter((s) =>
      (s.leadScore ?? 0) >= 50 &&
      s.followupDueDate &&
      new Date(s.followupDueDate) < now &&
      !["won", "lost"].includes(s.pipelineStage)
    ).length;

    const newQualifiedLeads = all.filter((s) => {
      if (s.pipelineStage !== "qualified") return false;
      const history = (s.stageHistory as any[]) ?? [];
      const lastQual = [...history].reverse().find((h: any) => h.stage === "qualified");
      return lastQual && new Date(lastQual.timestamp) >= oneDayAgo;
    }).length;

    const pendingBookings = allBookings.filter((b) => b.status === "pending").length;
    const paidOrdersToday = allOrders.filter((o) => o.status === "paid" && new Date(o.updatedAt) >= todayStart).length;
    const unrepliedContacts = allContacts.filter((c) => !c.repliedAt).length;

    const thisWeekLeads = all.filter((s) => s.recommendedOffer && new Date(s.updatedAt) >= weekStart);
    const offerCounts = new Map<string, number>();
    for (const s of thisWeekLeads) {
      const o = s.recommendedOffer!;
      offerCounts.set(o, (offerCounts.get(o) ?? 0) + 1);
    }
    let topRecommendedOffer: string | null = null;
    let topCount = 0;
    for (const [o, c] of Array.from(offerCounts.entries())) {
      if (c > topCount) { topCount = c; topRecommendedOffer = o; }
    }
    return { overdueHotLeads, newQualifiedLeads, pendingBookings, paidOrdersToday, unrepliedContacts, topRecommendedOffer };
  }

  // Phase 39 — Digest Reports
  async saveDigestReport(data: {
    weekStart: Date; weekEnd: Date; narrative: string;
    topIntents: any; hotLeadsCount: number; qualifiedCount: number;
    bookedCount: number; wonValue: number; followupsDue: number;
    unansweredHotLeads: number; topRecommendedOffer: string | null;
    knowledgeBackedChats: number; supportPatterns: string | null;
    contentOpportunities: string | null; conversionByIntent: any;
  }): Promise<DigestReport> {
    const [row] = await db.insert(digestReports).values(data as any).returning();
    return row;
  }

  async getLatestDigest(): Promise<DigestReport | null> {
    const [row] = await db
      .select()
      .from(digestReports)
      .orderBy(desc(digestReports.generatedAt))
      .limit(1);
    return row ?? null;
  }

  async getAllDigests(limit = 100): Promise<DigestReport[]> {
    return db.select().from(digestReports).orderBy(desc(digestReports.generatedAt)).limit(limit);
  }

  // Phase 39 — Dashboard Intelligence KPIs
  async getDashboardIntelligence(): Promise<{
    qualifiedCount: number;
    bookedThisWeek: number;
    wonThisMonth: number;
    overdueFollowups: number;
    topRecommendedOffer: string | null;
    knowledgeBackedChats: number;
    conversionByIntent: Record<string, { total: number; won: number; rate: number }>;
    overdueLeads: { sessionId: string; leadName: string | null; leadEmail: string | null; intent: string | null; followupDueDate: Date | null }[];
  }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const all = await db.select().from(chatConversations);

    const qualifiedCount = all.filter((l) =>
      ["qualified", "booked", "won", "converted"].includes(l.pipelineStage)
    ).length;

    const bookedThisWeek = all.filter(
      (l) => l.pipelineStage === "booked" && l.lastActivityAt && new Date(l.lastActivityAt) >= weekAgo
    ).length;

    const wonThisMonth = all.filter(
      (l) =>
        (l.pipelineStage === "won" || l.pipelineStage === "converted") &&
        l.lastActivityAt &&
        new Date(l.lastActivityAt) >= monthAgo
    ).length;

    const overdueLeads = all.filter(
      (l) =>
        l.followupDueDate &&
        new Date(l.followupDueDate) < now &&
        !["won", "lost", "converted"].includes(l.pipelineStage)
    );
    const overdueFollowups = overdueLeads.length;

    // Top recommended offer among hot/priority leads
    const offerMap = new Map<string, number>();
    for (const l of all) {
      if (l.recommendedOffer && (l.leadScore ?? 0) >= 50) {
        offerMap.set(l.recommendedOffer, (offerMap.get(l.recommendedOffer) ?? 0) + 1);
      }
    }
    const topRecommendedOffer = offerMap.size > 0
      ? Array.from(offerMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    const knowledgeBackedChats = all.filter((l) => l.sessionSummary).length;

    // Conversion by intent
    const intentTotals = new Map<string, number>();
    const intentWons = new Map<string, number>();
    for (const l of all) {
      if (!l.intent) continue;
      intentTotals.set(l.intent, (intentTotals.get(l.intent) ?? 0) + 1);
      if (l.pipelineStage === "won" || l.pipelineStage === "converted") {
        intentWons.set(l.intent, (intentWons.get(l.intent) ?? 0) + 1);
      }
    }
    const conversionByIntent: Record<string, { total: number; won: number; rate: number }> = {};
    for (const [intent, total] of Array.from(intentTotals.entries())) {
      const won = intentWons.get(intent) ?? 0;
      conversionByIntent[intent] = { total, won, rate: total > 0 ? Math.round((won / total) * 100) : 0 };
    }

    return {
      qualifiedCount,
      bookedThisWeek,
      wonThisMonth,
      overdueFollowups,
      topRecommendedOffer,
      knowledgeBackedChats,
      conversionByIntent,
      overdueLeads: overdueLeads.map((l) => ({
        sessionId: l.sessionId,
        leadName: l.leadName ?? l.capturedName,
        leadEmail: l.leadEmail ?? l.capturedEmail,
        intent: l.intent,
        followupDueDate: l.followupDueDate,
      })),
    };
  }

  async getAutomationSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(automationSettings).where(eq(automationSettings.key, key)).limit(1);
    return row?.value ?? null;
  }

  async setAutomationSetting(key: string, value: string): Promise<void> {
    await db.insert(automationSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: automationSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getDashboardSummary() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [allLeads, allOrders, allSubscribers, allContacts, allBookings] = await Promise.all([
      db.select().from(chatConversations),
      db.select().from(orders),
      db.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers),
      db.select({ id: contactMessages.id, repliedAt: contactMessages.repliedAt }).from(contactMessages),
      db.select({ id: bookings.id, status: bookings.status }).from(bookings),
    ]);

    const paidOrders = allOrders.filter((o) => o.status === "paid");
    const stripeRevenue = paidOrders.reduce((s, o) => s + (o.amountPaid ?? 0), 0);

    const intentCounts = new Map<string, number>();
    const offerCounts = new Map<string, number>();
    for (const l of allLeads) {
      if (l.intent) intentCounts.set(l.intent, (intentCounts.get(l.intent) ?? 0) + 1);
      if (l.recommendedOffer && (l.leadScore ?? 0) >= 50)
        offerCounts.set(l.recommendedOffer, (offerCounts.get(l.recommendedOffer) ?? 0) + 1);
    }
    const topIntent = intentCounts.size > 0
      ? Array.from(intentCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;
    const topRecommendedOffer = offerCounts.size > 0
      ? Array.from(offerCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      leads: {
        total: allLeads.length,
        emailCaptured: allLeads.filter((l) => l.capturedEmail || l.leadEmail).length,
        hot: allLeads.filter((l) => l.leadTemperature === "hot" || l.leadTemperature === "priority").length,
        qualified: allLeads.filter((l) => ["qualified", "booked", "won", "converted"].includes(l.pipelineStage)).length,
        bookedThisWeek: allLeads.filter((l) => l.pipelineStage === "booked" && l.lastActivityAt && new Date(l.lastActivityAt) >= weekAgo).length,
        wonThisMonth: allLeads.filter((l) => ["won", "converted"].includes(l.pipelineStage) && l.lastActivityAt && new Date(l.lastActivityAt) >= monthAgo).length,
      },
      revenue: {
        totalPaid: stripeRevenue,
        paidOrders: paidOrders.length,
        avgOrderValue: paidOrders.length > 0 ? Math.round(stripeRevenue / paidOrders.length) : 0,
        abandoned: allOrders.filter((o) => o.status === "initiated").length,
      },
      engagement: {
        newsletterSubscribers: allSubscribers.length,
        contactForms: allContacts.length,
        unrepliedContacts: allContacts.filter((c) => !c.repliedAt).length,
        pendingBookings: allBookings.filter((b) => b.status === "pending").length,
      },
      topIntent,
      topRecommendedOffer,
      generatedAt: now.toISOString(),
    };
  }

  // ── Phase 49 — Automation Jobs ──────────────────────────────────────────────

  async getAutomationJob(jobKey: string): Promise<AutomationJob | null> {
    const rows = await db.select().from(automationJobs).where(eq(automationJobs.jobKey, jobKey)).limit(1);
    return rows[0] ?? null;
  }

  async getAutomationJobs(): Promise<AutomationJob[]> {
    return db.select().from(automationJobs).orderBy(asc(automationJobs.jobGroup), asc(automationJobs.jobKey));
  }

  async upsertAutomationJob(jobKey: string, patch: Partial<InsertAutomationJob>): Promise<AutomationJob> {
    const existing = await db.select().from(automationJobs).where(eq(automationJobs.jobKey, jobKey)).limit(1);
    if (existing[0]) {
      const [updated] = await db.update(automationJobs)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(automationJobs.jobKey, jobKey))
        .returning();
      return updated;
    }
    const [created] = await db.insert(automationJobs)
      .values({
        jobKey,
        jobGroup: patch.jobGroup ?? "autonomous",
        status: patch.status ?? "idle",
        isEnabled: patch.isEnabled ?? true,
        cadenceMinutes: patch.cadenceMinutes ?? null,
        nextRunAt: patch.nextRunAt ?? null,
      })
      .returning();
    return created;
  }

  async createAutomationJobLog(input: InsertAutomationJobLog): Promise<void> {
    await db.insert(automationJobLogs).values(input);
  }

  async getAutomationJobLogs(jobKey: string, limit = 50): Promise<AutomationJobLog[]> {
    return db.select().from(automationJobLogs)
      .where(eq(automationJobLogs.jobKey, jobKey))
      .orderBy(desc(automationJobLogs.startedAt))
      .limit(limit);
  }

  // ── Phase 53 — QA Sentinel reports ──────────────────────────────────────────

  async createQaSentinelReport(input: InsertQaSentinelReport): Promise<QaSentinelReport> {
    const [created] = await db.insert(qaSentinelReports).values(input).returning();
    return created;
  }

  async getLatestQaSentinelReport(): Promise<QaSentinelReport | null> {
    const [row] = await db.select().from(qaSentinelReports)
      .orderBy(desc(qaSentinelReports.createdAt))
      .limit(1);
    return row ?? null;
  }

  async getQaSentinelReports(limit = 50): Promise<QaSentinelReport[]> {
    return db.select().from(qaSentinelReports)
      .orderBy(desc(qaSentinelReports.createdAt))
      .limit(limit);
  }

  // ── Phase 54 — Recovery reports ─────────────────────────────────────────────

  async createRecoveryReport(input: InsertRecoveryReport): Promise<RecoveryReport> {
    const [created] = await db.insert(recoveryReports).values(input).returning();
    return created;
  }

  async getLatestRecoveryReport(): Promise<RecoveryReport | null> {
    const [row] = await db.select().from(recoveryReports)
      .orderBy(desc(recoveryReports.createdAt))
      .limit(1);
    return row ?? null;
  }

  async getRecoveryReports(limit = 50): Promise<RecoveryReport[]> {
    return db.select().from(recoveryReports)
      .orderBy(desc(recoveryReports.createdAt))
      .limit(limit);
  }

  // ── Phase 56 — Growth Intelligence ──────────────────────────────────────────

  async createGrowthReport(input: InsertGrowthIntelligenceReport): Promise<GrowthIntelligenceReport> {
    const [row] = await db.insert(growthIntelligenceReports).values(input).returning();
    return row;
  }

  async getLatestGrowthReport(): Promise<GrowthIntelligenceReport | null> {
    const [row] = await db.select().from(growthIntelligenceReports)
      .orderBy(desc(growthIntelligenceReports.createdAt))
      .limit(1);
    return row ?? null;
  }

  async getGrowthReports(limit = 20): Promise<GrowthIntelligenceReport[]> {
    return db.select().from(growthIntelligenceReports)
      .orderBy(desc(growthIntelligenceReports.createdAt))
      .limit(limit);
  }

  async createGrowthRecommendation(input: InsertGrowthRecommendation): Promise<GrowthRecommendation> {
    const [row] = await db.insert(growthRecommendations).values(input).returning();
    return row;
  }

  async listGrowthRecommendations(status?: string, limit = 50): Promise<GrowthRecommendation[]> {
    const q = db.select().from(growthRecommendations)
      .orderBy(desc(growthRecommendations.createdAt))
      .limit(limit);
    if (status) return q.where(eq(growthRecommendations.status, status));
    return q;
  }

  async getGrowthRecommendation(id: number): Promise<GrowthRecommendation | null> {
    const [row] = await db.select().from(growthRecommendations)
      .where(eq(growthRecommendations.id, id));
    return row ?? null;
  }

  async updateGrowthRecommendationStatus(
    id: number,
    status: "approved" | "rejected" | "applied" | "pending",
    decidedBy: string,
    notes?: string
  ): Promise<GrowthRecommendation> {
    const [row] = await db.update(growthRecommendations)
      .set({ status, decidedBy, decidedAt: new Date(), notes: notes ?? null })
      .where(eq(growthRecommendations.id, id))
      .returning();
    return row;
  }

  // ── Phase 57 — Experiment Orchestrator ─────────────────────────────────────

  async createExperiment(input: InsertExperiment): Promise<Experiment> {
    const [row] = await db.insert(experiments).values(input).returning();
    return row;
  }

  async getExperiment(id: number): Promise<Experiment | null> {
    const [row] = await db.select().from(experiments).where(eq(experiments.id, id));
    return row ?? null;
  }

  async getExperimentByKey(key: string): Promise<Experiment | null> {
    const [row] = await db.select().from(experiments).where(eq(experiments.experimentKey, key));
    return row ?? null;
  }

  async listExperiments(status?: string, limit = 100): Promise<Experiment[]> {
    const q = db.select().from(experiments).orderBy(desc(experiments.createdAt)).limit(limit);
    if (status) return q.where(eq(experiments.status, status));
    return q;
  }

  async updateExperiment(id: number, patch: Partial<Experiment>): Promise<Experiment> {
    const [row] = await db.update(experiments).set(patch as any).where(eq(experiments.id, id)).returning();
    return row;
  }

  async getExperimentAssignment(experimentId: number, subjectKey: string): Promise<ExperimentAssignment | null> {
    const [row] = await db.select().from(experimentAssignments)
      .where(and(eq(experimentAssignments.experimentId, experimentId), eq(experimentAssignments.subjectKey, subjectKey)));
    return row ?? null;
  }

  async getOrCreateExperimentAssignment(experimentId: number, subjectKey: string, variantKey: string): Promise<ExperimentAssignment> {
    const existing = await this.getExperimentAssignment(experimentId, subjectKey);
    if (existing) return existing;
    try {
      const [row] = await db.insert(experimentAssignments)
        .values({ experimentId, subjectKey, variantKey })
        .returning();
      return row;
    } catch {
      // race: another request wrote first
      const again = await this.getExperimentAssignment(experimentId, subjectKey);
      if (again) return again;
      throw new Error("Could not assign variant");
    }
  }

  async recordExperimentEvent(
    experimentId: number,
    variantKey: string,
    subjectKey: string,
    eventType: string,
    value?: number | null
  ): Promise<void> {
    await db.insert(experimentEvents).values({
      experimentId, variantKey, subjectKey, eventType, value: value ?? null,
    });
  }

  // ── Phase 58 — Personalization ─────────────────────────────────────────────

  async listPersonalizationSegments(): Promise<PersonalizationSegment[]> {
    return db.select().from(personalizationSegments).orderBy(desc(personalizationSegments.priority), asc(personalizationSegments.id));
  }

  async upsertPersonalizationSegment(input: InsertPersonalizationSegment): Promise<PersonalizationSegment> {
    const existing = await db.select().from(personalizationSegments).where(eq(personalizationSegments.segmentKey, input.segmentKey));
    if (existing[0]) {
      const [row] = await db.update(personalizationSegments).set(input as any).where(eq(personalizationSegments.id, existing[0].id)).returning();
      return row;
    }
    const [row] = await db.insert(personalizationSegments).values(input as any).returning();
    return row;
  }

  async getPersonalizationProfile(subjectKey: string): Promise<PersonalizationProfile | null> {
    const [row] = await db.select().from(personalizationProfiles).where(eq(personalizationProfiles.subjectKey, subjectKey));
    return row ?? null;
  }

  async upsertPersonalizationProfile(input: { subjectKey: string; segmentKey: string; behavioralScore: number; intent: string; funnelStage: string; signals: Record<string, any> }): Promise<PersonalizationProfile> {
    const existing = await this.getPersonalizationProfile(input.subjectKey);
    if (existing) {
      const [row] = await db.update(personalizationProfiles).set({
        segmentKey: input.segmentKey,
        behavioralScore: input.behavioralScore,
        intent: input.intent,
        funnelStage: input.funnelStage,
        signals: input.signals as any,
        updatedAt: new Date(),
      }).where(eq(personalizationProfiles.id, existing.id)).returning();
      return row;
    }
    const [row] = await db.insert(personalizationProfiles).values({
      subjectKey: input.subjectKey,
      segmentKey: input.segmentKey,
      behavioralScore: input.behavioralScore,
      intent: input.intent,
      funnelStage: input.funnelStage,
      signals: input.signals as any,
    }).returning();
    return row;
  }

  async listPersonalizationRules(status?: string, surface?: string): Promise<PersonalizationRule[]> {
    const conds: any[] = [];
    if (status) conds.push(eq(personalizationRules.status, status));
    if (surface) conds.push(eq(personalizationRules.surface, surface));
    const q = db.select().from(personalizationRules).orderBy(desc(personalizationRules.createdAt)).limit(500);
    if (conds.length === 0) return q;
    if (conds.length === 1) return q.where(conds[0]);
    return q.where(and(...conds));
  }

  async getPersonalizationRule(id: number): Promise<PersonalizationRule | null> {
    const [row] = await db.select().from(personalizationRules).where(eq(personalizationRules.id, id));
    return row ?? null;
  }

  async findActivePersonalizationRule(surface: string, segmentKey: string): Promise<PersonalizationRule | null> {
    const [row] = await db.select().from(personalizationRules)
      .where(and(
        eq(personalizationRules.surface, surface),
        eq(personalizationRules.segmentKey, segmentKey),
        eq(personalizationRules.status, "active"),
      ))
      .orderBy(desc(personalizationRules.priority), desc(personalizationRules.decidedAt))
      .limit(1);
    return row ?? null;
  }

  async createPersonalizationRule(input: InsertPersonalizationRule): Promise<PersonalizationRule> {
    const [row] = await db.insert(personalizationRules).values(input as any).returning();
    return row;
  }

  async updatePersonalizationRule(id: number, patch: Partial<PersonalizationRule>): Promise<PersonalizationRule> {
    const [row] = await db.update(personalizationRules).set(patch as any).where(eq(personalizationRules.id, id)).returning();
    return row;
  }

  async deactivateOtherPersonalizationRules(surface: string, segmentKey: string, exceptId: number): Promise<void> {
    // Wrap in a transaction so deactivation + the eventual activation form an
    // atomic swap. Combined with the partial UNIQUE INDEX
    // personalization_rules_one_active_idx (surface, segment_key) WHERE status='active',
    // this guarantees at most one active rule per (surface, segment) under concurrency.
    await db.transaction(async (tx) => {
      await tx.update(personalizationRules).set({ status: "inactive" as any }).where(and(
        eq(personalizationRules.surface, surface),
        eq(personalizationRules.segmentKey, segmentKey),
        eq(personalizationRules.status, "active"),
        ne(personalizationRules.id, exceptId),
      ));
    });
  }

  async recordPersonalizationEvent(input: { subjectKey: string; segmentKey: string; surface: string; ruleId: number | null; eventType: string; value: number | null }): Promise<void> {
    await db.insert(personalizationEvents).values(input as any);
  }

  async getPersonalizationEventStats(surface?: string): Promise<Array<{ surface: string; segmentKey: string; views: number; clicks: number; conversions: number; ctr: number; cvr: number; revenueCents: number }>> {
    const rows = surface
      ? await db.execute(sql`
          SELECT surface, segment_key AS "segmentKey",
            COALESCE(SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END), 0)::int AS views,
            COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0)::int AS clicks,
            COALESCE(SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END), 0)::int AS conversions,
            COALESCE(SUM(CASE WHEN event_type = 'conversion' THEN value ELSE 0 END), 0)::int AS "revenueCents"
          FROM personalization_events
          WHERE surface = ${surface}
          GROUP BY surface, segment_key
          ORDER BY surface, segment_key
        `)
      : await db.execute(sql`
          SELECT surface, segment_key AS "segmentKey",
            COALESCE(SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END), 0)::int AS views,
            COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0)::int AS clicks,
            COALESCE(SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END), 0)::int AS conversions,
            COALESCE(SUM(CASE WHEN event_type = 'conversion' THEN value ELSE 0 END), 0)::int AS "revenueCents"
          FROM personalization_events
          GROUP BY surface, segment_key
          ORDER BY surface, segment_key
        `);
    const arr: any[] = (rows as any)?.rows ?? (Array.isArray(rows) ? (rows as any) : []);
    return arr.map((r: any) => {
      const views = Number(r.views) || 0;
      const clicks = Number(r.clicks) || 0;
      const conversions = Number(r.conversions) || 0;
      return {
        surface: r.surface,
        segmentKey: r.segmentKey,
        views, clicks, conversions,
        revenueCents: Number(r.revenueCents) || 0,
        ctr: views > 0 ? Math.round((clicks / views) * 10000) / 10000 : 0,
        cvr: views > 0 ? Math.round((conversions / views) * 10000) / 10000 : 0,
      };
    });
  }

  async getPersonalizationProfileCounts(): Promise<Array<{ segmentKey: string; count: number; avgScore: number }>> {
    const rows = await db.execute(sql`
      SELECT segment_key AS "segmentKey", COUNT(*)::int AS count,
             COALESCE(AVG(behavioral_score), 0)::float AS "avgScore"
      FROM personalization_profiles
      GROUP BY segment_key
      ORDER BY count DESC
    `);
    const arr: any[] = (rows as any)?.rows ?? (Array.isArray(rows) ? (rows as any) : []);
    return arr.map((r: any) => ({
      segmentKey: r.segmentKey,
      count: Number(r.count) || 0,
      avgScore: Math.round(Number(r.avgScore) * 10) / 10,
    }));
  }

  // ── Phase 59 — Revenue Command Center ──────────────────────────────────────

  async listRecentOrders(windowDays: number): Promise<Order[]> {
    const since = new Date(Date.now() - windowDays * 86400_000);
    return db.select().from(orders).where(gte(orders.createdAt, since)).orderBy(desc(orders.createdAt)).limit(2000);
  }

  async createRevenueCommandReport(input: InsertRevenueCommandReport): Promise<RevenueCommandReport> {
    const [row] = await db.insert(revenueCommandReports).values(input as any).returning();
    return row;
  }

  async getLatestRevenueCommandReport(): Promise<RevenueCommandReport | null> {
    const [row] = await db.select().from(revenueCommandReports).orderBy(desc(revenueCommandReports.createdAt)).limit(1);
    return row ?? null;
  }

  async listRevenueAlerts(status?: string, limit = 100): Promise<RevenueAlert[]> {
    const q = db.select().from(revenueAlerts).orderBy(desc(revenueAlerts.createdAt)).limit(limit);
    if (status) return q.where(eq(revenueAlerts.status, status));
    return q;
  }

  async createRevenueAlert(input: InsertRevenueAlert): Promise<RevenueAlert | null> {
    // ON CONFLICT DO NOTHING on the partial unique (alert_type, title) WHERE status='open'.
    // Returns null when a duplicate open alert already exists — engine treats as dedup.
    const [row] = await db.insert(revenueAlerts).values(input as any).onConflictDoNothing().returning();
    return row ?? null;
  }

  async acknowledgeRevenueAlert(id: number, ackedBy: string): Promise<RevenueAlert> {
    const [row] = await db.update(revenueAlerts).set({
      status: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: ackedBy,
    }).where(eq(revenueAlerts.id, id)).returning();
    if (!row) throw new Error("Alert not found");
    return row;
  }

  // ── Phase 60 — Orchestrator ─────────────────────────────────────────────────

  async upsertOrchestratorMemory(input: InsertOrchestratorMemory): Promise<OrchestratorMemory> {
    const [row] = await db.insert(orchestratorMemory)
      .values(input as any)
      .onConflictDoUpdate({
        target: [orchestratorMemory.scope, orchestratorMemory.key],
        set: { value: input.value as any, confidence: input.confidence as any, memoryType: input.memoryType as any, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async listOrchestratorMemory(scope?: string, limit = 200): Promise<OrchestratorMemory[]> {
    const q = db.select().from(orchestratorMemory).orderBy(desc(orchestratorMemory.updatedAt)).limit(limit);
    if (scope) return q.where(eq(orchestratorMemory.scope, scope));
    return q;
  }

  async createOrchestratorWorkflow(input: InsertOrchestratorWorkflow): Promise<OrchestratorWorkflow> {
    const [row] = await db.insert(orchestratorWorkflows).values(input as any).returning();
    return row;
  }

  async getOrchestratorWorkflow(id: number): Promise<OrchestratorWorkflow | null> {
    const [row] = await db.select().from(orchestratorWorkflows).where(eq(orchestratorWorkflows.id, id)).limit(1);
    return row ?? null;
  }

  async updateOrchestratorWorkflow(id: number, patch: Partial<OrchestratorWorkflow>): Promise<OrchestratorWorkflow> {
    const [row] = await db.update(orchestratorWorkflows).set(patch as any).where(eq(orchestratorWorkflows.id, id)).returning();
    if (!row) throw new Error("Workflow not found");
    return row;
  }

  /**
   * Atomic claim: transition `queued|approved|retrying` → `running` for exactly one caller.
   * Returns the claimed row, or null if another worker already claimed it (or the row
   * is in a terminal/pending state). Prevents the lost-update race the in-process lock
   * alone cannot defend against under future multi-node deploys.
   */
  async claimOrchestratorWorkflow(id: number, attemptCount: number): Promise<OrchestratorWorkflow | null> {
    const [row] = await db.update(orchestratorWorkflows)
      .set({ status: "running", startedAt: new Date(), attemptCount } as any)
      .where(and(
        eq(orchestratorWorkflows.id, id),
        or(
          eq(orchestratorWorkflows.status, "queued"),
          eq(orchestratorWorkflows.status, "approved"),
          eq(orchestratorWorkflows.status, "retrying"),
        ),
      ))
      .returning();
    return row ?? null;
  }

  async listOrchestratorWorkflows(status?: string, limit = 50): Promise<OrchestratorWorkflow[]> {
    const q = db.select().from(orchestratorWorkflows).orderBy(desc(orchestratorWorkflows.createdAt)).limit(limit);
    if (status) return q.where(eq(orchestratorWorkflows.status, status));
    return q;
  }

  async listQueuedOrchestratorWorkflows(limit = 10): Promise<OrchestratorWorkflow[]> {
    return db.select().from(orchestratorWorkflows)
      .where(eq(orchestratorWorkflows.status, "queued"))
      .orderBy(desc(orchestratorWorkflows.priority), asc(orchestratorWorkflows.createdAt))
      .limit(limit);
  }

  async findRecentCompletedWorkflow(workflowKey: string, withinMinutes: number): Promise<OrchestratorWorkflow | null> {
    const since = new Date(Date.now() - withinMinutes * 60_000);
    const [row] = await db.select().from(orchestratorWorkflows)
      .where(and(
        eq(orchestratorWorkflows.workflowKey, workflowKey),
        gte(orchestratorWorkflows.completedAt, since),
      ))
      .orderBy(desc(orchestratorWorkflows.completedAt))
      .limit(1);
    return row ?? null;
  }

  async createOrchestratorAgentRun(input: InsertOrchestratorAgentRun): Promise<OrchestratorAgentRun> {
    const [row] = await db.insert(orchestratorAgentRuns).values(input as any).returning();
    return row;
  }

  async listOrchestratorAgentRuns(workflowId: number): Promise<OrchestratorAgentRun[]> {
    return db.select().from(orchestratorAgentRuns)
      .where(eq(orchestratorAgentRuns.workflowId, workflowId))
      .orderBy(asc(orchestratorAgentRuns.createdAt));
  }

  async getOrchestratorStats(): Promise<{ queued: number; running: number; pendingApproval: number; succeeded24h: number; failed24h: number; blocked24h: number }> {
    const since = new Date(Date.now() - 24 * 3600_000);
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
        COUNT(*) FILTER (WHERE status = 'running')::int AS running,
        COUNT(*) FILTER (WHERE status = 'pending_founder_approval')::int AS pending_approval,
        COUNT(*) FILTER (WHERE status = 'succeeded' AND completed_at >= ${since})::int AS succeeded24h,
        COUNT(*) FILTER (WHERE status = 'failed' AND completed_at >= ${since})::int AS failed24h,
        COUNT(*) FILTER (WHERE status = 'blocked' AND completed_at >= ${since})::int AS blocked24h
      FROM orchestrator_workflows
    `);
    const r: any = (rows as any).rows?.[0] ?? (rows as any)[0] ?? {};
    return {
      queued: Number(r.queued) || 0,
      running: Number(r.running) || 0,
      pendingApproval: Number(r.pending_approval) || 0,
      succeeded24h: Number(r.succeeded24h) || 0,
      failed24h: Number(r.failed24h) || 0,
      blocked24h: Number(r.blocked24h) || 0,
    };
  }

  // ── Phase 61 — Neural Command Grid ─────────────────────────────────────────

  async createNeuralSignal(input: InsertNeuralSignal): Promise<NeuralSignal | null> {
    try {
      const [row] = await db.insert(neuralSignals).values(input as any)
        .onConflictDoNothing().returning();
      return row ?? null;
    } catch (e: any) {
      console.warn("[storage] createNeuralSignal failed:", e?.message);
      return null;
    }
  }
  async listNeuralSignals(opts: { severity?: string; status?: string; limit?: number } = {}): Promise<NeuralSignal[]> {
    const conds: any[] = [];
    if (opts.severity) conds.push(eq(neuralSignals.severity, opts.severity));
    if (opts.status) conds.push(eq(neuralSignals.status, opts.status));
    const q = db.select().from(neuralSignals).orderBy(desc(neuralSignals.createdAt)).limit(opts.limit ?? 100);
    return conds.length ? q.where(and(...conds)) : q;
  }
  async updateNeuralSignalStatus(id: number, status: string): Promise<void> {
    await db.update(neuralSignals).set({ status }).where(eq(neuralSignals.id, id));
  }
  async createCommandBusEvent(input: InsertCommandBusEvent): Promise<CommandBusEvent> {
    const [row] = await db.insert(commandBusEvents).values(input as any).returning();
    return row;
  }
  async listCommandBusEvents(limit = 50): Promise<CommandBusEvent[]> {
    return db.select().from(commandBusEvents).orderBy(desc(commandBusEvents.createdAt)).limit(limit);
  }
  async createCognitiveStateSnapshot(input: InsertCognitiveStateSnapshot): Promise<CognitiveStateSnapshot> {
    const [row] = await db.insert(cognitiveStateSnapshots).values(input as any).returning();
    return row;
  }
  async getLatestCognitiveStateSnapshot(): Promise<CognitiveStateSnapshot | null> {
    const [row] = await db.select().from(cognitiveStateSnapshots).orderBy(desc(cognitiveStateSnapshots.createdAt)).limit(1);
    return row ?? null;
  }
  async createExecutiveEscalation(input: InsertExecutiveEscalation): Promise<ExecutiveEscalation | null> {
    try {
      const [row] = await db.insert(executiveEscalations).values(input as any)
        .onConflictDoNothing().returning();
      return row ?? null;
    } catch (e: any) {
      console.warn("[storage] createExecutiveEscalation failed:", e?.message);
      return null;
    }
  }
  async listExecutiveEscalations(status?: string, limit = 50): Promise<ExecutiveEscalation[]> {
    const q = db.select().from(executiveEscalations).orderBy(desc(executiveEscalations.createdAt)).limit(limit);
    return status ? q.where(eq(executiveEscalations.status, status)) : q;
  }
  async resolveExecutiveEscalation(id: number, by: string): Promise<ExecutiveEscalation> {
    const [row] = await db.update(executiveEscalations)
      .set({ status: "resolved", resolvedAt: new Date(), resolvedBy: by })
      .where(eq(executiveEscalations.id, id)).returning();
    if (!row) throw new Error("Escalation not found");
    return row;
  }
  async createGlobalHealthScore(input: InsertGlobalHealthScore): Promise<GlobalHealthScore> {
    const [row] = await db.insert(globalHealthScores).values(input as any).returning();
    return row;
  }
  async listLatestGlobalHealthScores(): Promise<GlobalHealthScore[]> {
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (category) id, category, score, trend, explanation, metadata, created_at
      FROM global_health_scores
      ORDER BY category, created_at DESC
    `);
    const list: any[] = (rows as any).rows ?? (rows as any);
    return list.map((r: any) => ({
      id: r.id, category: r.category, score: r.score, trend: r.trend,
      explanation: r.explanation, metadata: r.metadata, createdAt: r.created_at,
    })) as GlobalHealthScore[];
  }
  async createInsightStreamEntry(input: InsertInsightStreamEntry): Promise<InsightStreamEntry> {
    const [row] = await db.insert(insightStreamEntries).values(input as any).returning();
    return row;
  }
  async listInsightStreamEntries(limit = 50): Promise<InsightStreamEntry[]> {
    return db.select().from(insightStreamEntries).orderBy(desc(insightStreamEntries.createdAt)).limit(limit);
  }
  async createWorkflowDependency(input: InsertWorkflowDependency): Promise<WorkflowDependency | null> {
    try {
      const [row] = await db.insert(workflowDependencies).values(input as any).onConflictDoNothing().returning();
      return row ?? null;
    } catch { return null; }
  }
  async listWorkflowDependencies(): Promise<WorkflowDependency[]> {
    return db.select().from(workflowDependencies).orderBy(desc(workflowDependencies.createdAt));
  }

  // ── Phase 62 — Autonomous Execution Mesh ───────────────────────────────────

  async upsertMeshAgent(input: InsertMeshAgent): Promise<MeshAgent> {
    const [row] = await db.insert(meshAgents).values(input as any)
      .onConflictDoUpdate({
        target: meshAgents.agentKey,
        set: {
          displayName: input.displayName,
          specialization: input.specialization,
          provider: input.provider,
          maxConcurrency: input.maxConcurrency,
          cooldownSeconds: input.cooldownSeconds,
          capabilities: input.capabilities as any,
          metadata: (input.metadata ?? {}) as any,
        },
      }).returning();
    return row;
  }
  async listMeshAgents(status?: string): Promise<MeshAgent[]> {
    const q = db.select().from(meshAgents).orderBy(asc(meshAgents.agentKey));
    return status ? q.where(eq(meshAgents.status, status)) : q;
  }
  async getMeshAgentByKey(agentKey: string): Promise<MeshAgent | null> {
    const [row] = await db.select().from(meshAgents).where(eq(meshAgents.agentKey, agentKey)).limit(1);
    return row ?? null;
  }
  async heartbeatMeshAgent(agentKey: string, status?: string): Promise<void> {
    const patch: any = { lastHeartbeatAt: new Date() };
    if (status) patch.status = status;
    await db.update(meshAgents).set(patch).where(eq(meshAgents.agentKey, agentKey));
  }
  async recordMeshAgentRun(agentKey: string, success: boolean, latencyMs: number): Promise<void> {
    const agent = await this.getMeshAgentByKey(agentKey);
    if (!agent) return;
    const total = agent.totalRuns + 1;
    const succ = agent.successfulRuns + (success ? 1 : 0);
    const fail = agent.failedRuns + (success ? 0 : 1);
    const avg = Math.round(((agent.averageLatencyMs * agent.totalRuns) + latencyMs) / Math.max(1, total));
    await db.update(meshAgents)
      .set({ totalRuns: total, successfulRuns: succ, failedRuns: fail, averageLatencyMs: avg, lastBusyAt: new Date(), status: "idle" })
      .where(eq(meshAgents.agentKey, agentKey));
  }
  async createMeshMission(input: InsertMeshMission): Promise<MeshMission> {
    const [row] = await db.insert(meshMissions).values(input as any).returning();
    return row;
  }
  async listMeshMissions(status?: string, limit = 50): Promise<MeshMission[]> {
    const q = db.select().from(meshMissions).orderBy(desc(meshMissions.createdAt)).limit(limit);
    return status ? q.where(eq(meshMissions.status, status)) : q;
  }
  async getMeshMission(id: number): Promise<MeshMission | null> {
    const [row] = await db.select().from(meshMissions).where(eq(meshMissions.id, id)).limit(1);
    return row ?? null;
  }
  async updateMeshMission(id: number, patch: Partial<MeshMission>): Promise<MeshMission> {
    const [row] = await db.update(meshMissions).set(patch as any).where(eq(meshMissions.id, id)).returning();
    if (!row) throw new Error("Mission not found");
    return row;
  }
  /** Atomic claim: queued|assigned → running. Returns null if already claimed. */
  async claimMeshMission(id: number): Promise<MeshMission | null> {
    const [row] = await db.update(meshMissions)
      .set({ status: "running", startedAt: new Date() } as any)
      .where(and(eq(meshMissions.id, id), or(eq(meshMissions.status, "queued"), eq(meshMissions.status, "assigned"), eq(meshMissions.status, "retrying"))))
      .returning();
    return row ?? null;
  }
  async createMeshTask(input: InsertMeshTask): Promise<MeshTask> {
    const [row] = await db.insert(meshTasks).values(input as any).returning();
    return row;
  }
  async listMeshTasks(missionId?: number, limit = 200): Promise<MeshTask[]> {
    const q = db.select().from(meshTasks).orderBy(asc(meshTasks.executionOrder)).limit(limit);
    return missionId ? q.where(eq(meshTasks.missionId, missionId)) : q;
  }
  async updateMeshTask(id: number, patch: Partial<MeshTask>): Promise<MeshTask> {
    const [row] = await db.update(meshTasks).set(patch as any).where(eq(meshTasks.id, id)).returning();
    if (!row) throw new Error("Task not found");
    return row;
  }
  async createMeshCommunication(input: InsertMeshCommunication): Promise<MeshCommunication> {
    const [row] = await db.insert(meshCommunications).values(input as any).returning();
    return row;
  }
  async listMeshCommunications(limit = 50): Promise<MeshCommunication[]> {
    return db.select().from(meshCommunications).orderBy(desc(meshCommunications.createdAt)).limit(limit);
  }
  async enqueueMeshMission(input: InsertMeshQueueItem): Promise<MeshQueueItem | null> {
    try {
      const [row] = await db.insert(meshQueue).values(input as any).onConflictDoNothing().returning();
      return row ?? null;
    } catch (e: any) {
      console.warn("[storage] enqueueMeshMission failed:", e?.message);
      return null;
    }
  }
  /**
   * Atomic queue lock. Returns the next available queue entry (queued, or
   * a locked entry whose lock has expired) and atomically marks it as
   * locked by `workerId`. Concurrent workers cannot grab the same row.
   */
  async lockMeshQueueItem(workerId: string, ttlMs: number): Promise<MeshQueueItem | null> {
    const expiresAt = new Date(Date.now() + ttlMs);
    const result: any = await db.execute(sql`
      UPDATE mesh_queue SET status = 'locked', locked_by = ${workerId}, lock_expires_at = ${expiresAt}
      WHERE id = (
        SELECT id FROM mesh_queue
        WHERE (status = 'queued' AND scheduled_for <= NOW())
           OR (status = 'locked' AND lock_expires_at < NOW())
        ORDER BY priority DESC, scheduled_for ASC
        LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING id, queue_name, mission_id, priority, scheduled_for, locked_by, lock_expires_at, status, created_at
    `);
    const rows = result?.rows ?? result ?? [];
    const list: any[] = Array.isArray(rows) ? rows : [];
    const r = list[0];
    if (!r) return null;
    return {
      id: r.id, queueName: r.queue_name, missionId: r.mission_id, priority: r.priority,
      scheduledFor: r.scheduled_for, lockedBy: r.locked_by, lockExpiresAt: r.lock_expires_at,
      status: r.status, createdAt: r.created_at,
    } as MeshQueueItem;
  }
  async releaseMeshQueueItem(id: number, status: string): Promise<void> {
    await db.update(meshQueue).set({ status, lockedBy: null, lockExpiresAt: null } as any).where(eq(meshQueue.id, id));
  }
  async listMeshQueue(status?: string, limit = 50): Promise<MeshQueueItem[]> {
    const q = db.select().from(meshQueue).orderBy(desc(meshQueue.priority), asc(meshQueue.scheduledFor)).limit(limit);
    return status ? q.where(eq(meshQueue.status, status)) : q;
  }
  async createMeshTopologySnapshot(input: InsertMeshTopologySnapshot): Promise<MeshTopologySnapshot> {
    const [row] = await db.insert(meshTopologySnapshots).values(input as any).returning();
    return row;
  }
  async getLatestMeshTopologySnapshot(): Promise<MeshTopologySnapshot | null> {
    const [row] = await db.select().from(meshTopologySnapshots).orderBy(desc(meshTopologySnapshots.createdAt)).limit(1);
    return row ?? null;
  }
  async writeMeshWorkerMemory(input: InsertMeshWorkerMemory): Promise<MeshWorkerMemory> {
    const [row] = await db.insert(meshWorkerMemory).values(input as any)
      .onConflictDoUpdate({
        target: [meshWorkerMemory.agentKey, meshWorkerMemory.memoryScope, meshWorkerMemory.memoryKey],
        set: { memoryValue: input.memoryValue as any, confidence: input.confidence ?? 50, createdAt: new Date() },
      }).returning();
    return row;
  }
  async readMeshWorkerMemory(agentKey: string, memoryScope?: string): Promise<MeshWorkerMemory[]> {
    const conds = [eq(meshWorkerMemory.agentKey, agentKey)];
    if (memoryScope) conds.push(eq(meshWorkerMemory.memoryScope, memoryScope));
    return db.select().from(meshWorkerMemory).where(and(...conds)).orderBy(desc(meshWorkerMemory.createdAt)).limit(100);
  }
  async createMeshAuditLog(input: InsertMeshAuditLog): Promise<MeshAuditLog> {
    const [row] = await db.insert(meshAuditLogs).values(input as any).returning();
    return row;
  }
  async listMeshAuditLogs(missionId?: number, limit = 100): Promise<MeshAuditLog[]> {
    const q = db.select().from(meshAuditLogs).orderBy(desc(meshAuditLogs.createdAt)).limit(limit);
    return missionId ? q.where(eq(meshAuditLogs.missionId, missionId)) : q;
  }
  async getMeshStats(): Promise<{ idleAgents: number; busyAgents: number; queuedMissions: number; runningMissions: number; failedMissions24h: number; completedMissions24h: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result: any = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM mesh_agents WHERE status = 'idle') AS idle_agents,
        (SELECT COUNT(*) FROM mesh_agents WHERE status = 'busy') AS busy_agents,
        (SELECT COUNT(*) FROM mesh_missions WHERE status = 'queued') AS queued_missions,
        (SELECT COUNT(*) FROM mesh_missions WHERE status = 'running') AS running_missions,
        (SELECT COUNT(*) FROM mesh_missions WHERE status = 'failed' AND created_at >= ${since}) AS failed_24h,
        (SELECT COUNT(*) FROM mesh_missions WHERE status = 'completed' AND created_at >= ${since}) AS completed_24h
    `);
    const rows = result?.rows ?? result ?? [];
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { idleAgents: 0, busyAgents: 0, queuedMissions: 0, runningMissions: 0, failedMissions24h: 0, completedMissions24h: 0 };
    return {
      idleAgents: Number(row.idle_agents) || 0,
      busyAgents: Number(row.busy_agents) || 0,
      queuedMissions: Number(row.queued_missions) || 0,
      runningMissions: Number(row.running_missions) || 0,
      failedMissions24h: Number(row.failed_24h) || 0,
      completedMissions24h: Number(row.completed_24h) || 0,
    };
  }

  async getExperimentVariantStats(experimentId: number): Promise<Array<{ variantKey: string; assignments: number; conversions: number; revenueCents: number }>> {
    const assignRows = await db.execute(sql`
      SELECT variant_key AS "variantKey", COUNT(*)::int AS "assignments"
      FROM experiment_assignments
      WHERE experiment_id = ${experimentId}
      GROUP BY variant_key
    `);
    const eventRows = await db.execute(sql`
      SELECT variant_key AS "variantKey",
             COUNT(DISTINCT subject_key)::int AS "conversions",
             COALESCE(SUM(value), 0)::int AS "revenueCents"
      FROM experiment_events
      WHERE experiment_id = ${experimentId} AND event_type = 'conversion'
      GROUP BY variant_key
    `);
    const map = new Map<string, { variantKey: string; assignments: number; conversions: number; revenueCents: number }>();
    const assignArr: any[] = (assignRows as any)?.rows ?? (Array.isArray(assignRows) ? (assignRows as any) : []);
    const eventArr: any[] = (eventRows as any)?.rows ?? (Array.isArray(eventRows) ? (eventRows as any) : []);
    for (const r of assignArr) {
      map.set(r.variantKey, { variantKey: r.variantKey, assignments: Number(r.assignments) || 0, conversions: 0, revenueCents: 0 });
    }
    for (const r of eventArr) {
      const cur = map.get(r.variantKey) ?? { variantKey: r.variantKey, assignments: 0, conversions: 0, revenueCents: 0 };
      cur.conversions = Number(r.conversions) || 0;
      cur.revenueCents = Number(r.revenueCents) || 0;
      map.set(r.variantKey, cur);
    }
    return Array.from(map.values());
  }

  // ── Phase 49 — Revenue Recovery ─────────────────────────────────────────────

  async getRevenueRecoveryActions(limit = 100): Promise<RevenueRecoveryAction[]> {
    return db.select().from(revenueRecoveryActions)
      .orderBy(desc(revenueRecoveryActions.priorityScore), desc(revenueRecoveryActions.createdAt))
      .limit(limit);
  }

  async createRevenueRecoveryAction(input: InsertRevenueRecoveryAction): Promise<RevenueRecoveryAction> {
    const [row] = await db.insert(revenueRecoveryActions).values(input).returning();
    return row;
  }

  async updateRevenueRecoveryAction(id: number, patch: UpdateRevenueRecoveryAction): Promise<RevenueRecoveryAction | undefined> {
    const [row] = await db.update(revenueRecoveryActions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(revenueRecoveryActions.id, id))
      .returning();
    return row;
  }

  async listAcceptedButUnpaidSessions(): Promise<any[]> {
    return db.select({
        sessionId: chatConversations.sessionId,
        leadEmail: chatConversations.leadEmail,
        leadName: chatConversations.leadName,
        leadScore: chatConversations.leadScore,
        productName: orders.productName,
        orderId: orders.id,
        orderStatus: orders.status,
        recoveryStatus: orders.recoveryStatus,
        createdAt: orders.createdAt,
      })
      .from(chatConversations)
      .leftJoin(orders, eq(orders.sessionId, chatConversations.sessionId))
      .where(
        and(
          eq(chatConversations.requiresFollowup, true),
          gte(chatConversations.leadScore, 60),
          or(isNull(orders.id), ne(orders.status, "paid"))
        )
      )
      .orderBy(desc(chatConversations.leadScore), desc(chatConversations.updatedAt));
  }

  async listAbandonedCheckoutOrders(hoursSinceCreated = 1): Promise<any[]> {
    const cutoff = new Date(Date.now() - hoursSinceCreated * 60 * 60 * 1000);
    return db.select().from(orders).where(
      and(
        lte(orders.createdAt, cutoff),
        ne(orders.status, "paid"),
        or(eq(orders.recoveryStatus, "none"), isNull(orders.recoveryStatus))
      )
    ).orderBy(desc(orders.createdAt));
  }

  async listStaleFulfillmentOrders(hoursStale = 24): Promise<any[]> {
    const cutoff = new Date(Date.now() - hoursStale * 60 * 60 * 1000);
    return db.select().from(orders).where(
      and(
        eq(orders.status, "paid"),
        or(eq(orders.fulfillmentStatus, "queued"), eq(orders.fulfillmentStatus, "processing")),
        lte(orders.updatedAt, cutoff)
      )
    ).orderBy(desc(orders.updatedAt));
  }

  // ── Phase 49 — Content Opportunities ────────────────────────────────────────

  async getContentOpportunities(limit = 100): Promise<ContentOpportunity[]> {
    return db.select().from(contentOpportunities)
      .orderBy(desc(contentOpportunities.opportunityScore), desc(contentOpportunities.createdAt))
      .limit(limit);
  }

  async createContentOpportunity(input: InsertContentOpportunity): Promise<ContentOpportunity> {
    const [row] = await db.insert(contentOpportunities).values(input).returning();
    return row;
  }

  async updateContentOpportunity(id: number, patch: UpdateContentOpportunity): Promise<ContentOpportunity | undefined> {
    const [row] = await db.update(contentOpportunities)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(contentOpportunities.id, id))
      .returning();
    return row;
  }

  // ── Phase 49 — Executive Digests ─────────────────────────────────────────────

  async getLatestDigestByType(reportType: string): Promise<any | undefined> {
    const [row] = await db.select().from(digestReports)
      .where(eq(digestReports.reportType, reportType))
      .orderBy(desc(digestReports.generatedAt))
      .limit(1);
    return row;
  }

  async createDigestReportTyped(input: any): Promise<any> {
    const [row] = await db.insert(digestReports).values(input).returning();
    return row;
  }

  // ── Phase 49 — Autonomous Alerts ─────────────────────────────────────────────

  async getAutonomousAlerts(limit = 100): Promise<AutonomousAlert[]> {
    return db.select().from(autonomousAlerts)
      .orderBy(
        sql`CASE ${autonomousAlerts.severity}
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4 END`,
        desc(autonomousAlerts.createdAt)
      )
      .limit(limit);
  }

  async createAutonomousAlert(input: InsertAutonomousAlert): Promise<AutonomousAlert> {
    const [row] = await db.insert(autonomousAlerts).values(input).returning();
    return row;
  }

  async updateAutonomousAlert(id: number, patch: UpdateAutonomousAlert): Promise<AutonomousAlert | undefined> {
    const [row] = await db.update(autonomousAlerts)
      .set(patch)
      .where(eq(autonomousAlerts.id, id))
      .returning();
    return row;
  }

  // ─── Phase 50: Growth Optimization ──────────────────────────────────────────

  async getGrowthExperiments(limit = 100): Promise<GrowthExperiment[]> {
    return db.select().from(growthExperiments)
      .orderBy(desc(growthExperiments.expectedImpactScore), desc(growthExperiments.createdAt))
      .limit(limit);
  }

  async createGrowthExperiment(input: InsertGrowthExperiment): Promise<GrowthExperiment> {
    const [row] = await db.insert(growthExperiments).values(input).returning();
    return row;
  }

  async updateGrowthExperiment(id: number, patch: UpdateGrowthExperiment): Promise<GrowthExperiment | undefined> {
    const [row] = await db.update(growthExperiments)
      .set(patch)
      .where(eq(growthExperiments.id, id))
      .returning();
    return row;
  }

  async getLatestSourcePerformance(limit = 100): Promise<SourcePerformanceSnapshot[]> {
    return db.select().from(sourcePerformanceSnapshots)
      .orderBy(desc(sourcePerformanceSnapshots.snapshotDate), desc(sourcePerformanceSnapshots.qualityScore))
      .limit(limit);
  }

  async createSourcePerformanceSnapshot(input: InsertSourcePerformanceSnapshot): Promise<SourcePerformanceSnapshot> {
    const [row] = await db.insert(sourcePerformanceSnapshots).values(input).returning();
    return row;
  }

  async getLatestFunnelLeaks(limit = 50): Promise<FunnelLeakReport[]> {
    return db.select().from(funnelLeakReports)
      .orderBy(desc(funnelLeakReports.createdAt), desc(funnelLeakReports.severityScore))
      .limit(limit);
  }

  async createFunnelLeakReport(input: InsertFunnelLeakReport): Promise<FunnelLeakReport> {
    const [row] = await db.insert(funnelLeakReports).values(input).returning();
    return row;
  }

  async getLatestOfferPerformance(limit = 100): Promise<OfferPerformanceSnapshot[]> {
    return db.select().from(offerPerformanceSnapshots)
      .orderBy(desc(offerPerformanceSnapshots.snapshotDate), desc(offerPerformanceSnapshots.performanceScore))
      .limit(limit);
  }

  async createOfferPerformanceSnapshot(input: InsertOfferPerformanceSnapshot): Promise<OfferPerformanceSnapshot> {
    const [row] = await db.insert(offerPerformanceSnapshots).values(input).returning();
    return row;
  }

  async getSourcePerformanceCandidates(periodDays = 14): Promise<any[]> {
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const result: any = await db.execute(sql`
      with pv as (
        select coalesce(page, 'unknown') as source_name,
          count(*)::int as visits
        from page_views where created_at >= ${start} group by 1
      ),
      chats as (
        select
          coalesce(intent, 'unknown') as source_name,
          count(*)::int as chat_leads,
          count(*) filter (where lead_score >= 60)::int as qualified_leads
        from chat_conversations where created_at >= ${start} group by 1
      ),
      b as (
        select 'bookings' as source_name, count(*)::int as bookings
        from bookings where created_at >= ${start}
      ),
      o as (
        select 'orders' as source_name,
          count(*) filter (where status = 'paid')::int as paid_orders,
          coalesce(sum(case when status = 'paid' then amount_paid else 0 end), 0)::int as revenue,
          coalesce(avg(case when status = 'paid' then amount_paid end), 0)::int as avg_order_value
        from orders where created_at >= ${start}
      )
      select
        pv.source_name,
        pv.visits,
        coalesce(chats.chat_leads, 0) as chat_leads,
        coalesce(chats.qualified_leads, 0) as qualified_leads,
        (select bookings from b limit 1) as bookings,
        (select paid_orders from o limit 1) as paid_orders,
        (select revenue from o limit 1) as revenue,
        (select avg_order_value from o limit 1) as avg_order_value
      from pv
      left join chats on chats.source_name = pv.source_name
      order by pv.visits desc
      limit 20
    `);
    return result.rows ?? result;
  }

  async getOfferPerformanceCandidates(periodDays = 30): Promise<any[]> {
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const result: any = await db.execute(sql`
      select
        coalesce(recommended_offer, accepted_offer_slug, 'unknown') as offer_slug,
        intent,
        null::text as source_name,
        count(*) filter (where recommended_offer is not null)::int as recommended_count,
        count(*) filter (where recommended_offer_accepted = true)::int as accepted_count,
        0::int as paid_count,
        0::int as avg_order_value
      from chat_conversations
      where created_at >= ${start}
        and coalesce(recommended_offer, accepted_offer_slug) is not null
      group by 1,2,3
      order by recommended_count desc
      limit 30
    `);
    return result.rows ?? result;
  }

  async getFunnelLeakCandidates(periodDays = 14): Promise<any> {
    const start = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const [visitsRow] = await db.select({ c: count() }).from(pageViews).where(gte(pageViews.createdAt, start));
    const [chatsRow] = await db.select({ c: count() }).from(chatConversations).where(gte(chatConversations.createdAt, start));
    const [qualifiedRow] = await db.select({ c: count() }).from(chatConversations)
      .where(and(gte(chatConversations.createdAt, start), gte(chatConversations.leadScore, 60)));
    const [bookedRow] = await db.select({ c: count() }).from(bookings).where(gte(bookings.createdAt, start));
    const [wonRow] = await db.select({ c: count() }).from(orders)
      .where(and(gte(orders.createdAt, start), eq(orders.status, "paid")));
    return {
      visits: Number(visitsRow?.c ?? 0),
      chats: Number(chatsRow?.c ?? 0),
      qualified: Number(qualifiedRow?.c ?? 0),
      booked: Number(bookedRow?.c ?? 0),
      won: Number(wonRow?.c ?? 0),
      periodStart: start,
      periodEnd: new Date(),
    };
  }
  // ── Phase 51: Autonomous Execution ──────────────────────────────────────────

  async getExecutionPolicies(): Promise<ExecutionPolicy[]> {
    return db.select().from(executionPolicies).orderBy(executionPolicies.area);
  }

  async upsertExecutionPolicy(input: InsertExecutionPolicy): Promise<ExecutionPolicy> {
    const [row] = await db
      .insert(executionPolicies)
      .values(input)
      .onConflictDoUpdate({
        target: executionPolicies.policyKey,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async updateExecutionPolicy(policyKey: string, patch: Partial<InsertExecutionPolicy>): Promise<ExecutionPolicy | undefined> {
    const [row] = await db
      .update(executionPolicies)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(executionPolicies.policyKey, policyKey))
      .returning();
    return row;
  }

  async getExecutionQueue(limit = 50): Promise<ExecutionQueueItem[]> {
    return db.select().from(executionQueue)
      .orderBy(desc(executionQueue.priorityScore), desc(executionQueue.createdAt))
      .limit(limit);
  }

  async createExecutionQueueItem(input: InsertExecutionQueueItem): Promise<ExecutionQueueItem> {
    const [row] = await db.insert(executionQueue).values(input).returning();
    return row;
  }

  async updateExecutionQueueItem(id: number, patch: Partial<InsertExecutionQueueItem>): Promise<ExecutionQueueItem | undefined> {
    const [row] = await db.update(executionQueue).set(patch).where(eq(executionQueue.id, id)).returning();
    return row;
  }

  async getAppliedChanges(limit = 100): Promise<AppliedChange[]> {
    return db.select().from(appliedChanges)
      .orderBy(desc(appliedChanges.createdAt))
      .limit(limit);
  }

  async createAppliedChange(input: InsertAppliedChange): Promise<AppliedChange> {
    const [row] = await db.insert(appliedChanges).values(input).returning();
    return row;
  }

  async updateAppliedChange(id: number, patch: UpdateAppliedChange): Promise<AppliedChange | undefined> {
    const [row] = await db.update(appliedChanges).set(patch).where(eq(appliedChanges.id, id)).returning();
    return row;
  }

  async getAppliedChangeByKey(changeKey: string): Promise<AppliedChange | undefined> {
    const [row] = await db.select().from(appliedChanges).where(eq(appliedChanges.changeKey, changeKey));
    return row;
  }

  async getRollbackEvents(limit = 50): Promise<RollbackEvent[]> {
    return db.select().from(rollbackEvents).orderBy(desc(rollbackEvents.createdAt)).limit(limit);
  }

  async createRollbackEvent(input: InsertRollbackEvent): Promise<RollbackEvent> {
    const [row] = await db.insert(rollbackEvents).values(input).returning();
    return row;
  }

  async getApprovedExperimentsReadyForExecution(): Promise<GrowthExperiment[]> {
    return db.select().from(growthExperiments)
      .where(eq(growthExperiments.status, "approved"))
      .orderBy(desc(growthExperiments.expectedImpactScore))
      .limit(10);
  }

  async getSafeOverrideCandidates(): Promise<any[]> {
    const rows = await db.select().from(offerPerformanceSnapshots)
      .orderBy(desc(offerPerformanceSnapshots.performanceScore))
      .limit(10);
    return rows.filter((r) => r.performanceScore >= 70);
  }

  async getSafeCtaCandidates(): Promise<any[]> {
    const leaks = await db.select().from(funnelLeakReports)
      .orderBy(desc(funnelLeakReports.severityScore))
      .limit(5);
    return leaks.map((l) => ({
      stage: l.leakStage,
      severityScore: l.severityScore,
      dropoffRate: l.dropoffRate,
      recommendedFix: l.recommendedFix,
    }));
  }

  async getLinksPriorityCandidates(): Promise<any[]> {
    const clicks = await db.select().from(clickEvents)
      .orderBy(desc(clickEvents.createdAt))
      .limit(200);
    const byProduct: Record<string, number> = {};
    for (const c of clicks) {
      byProduct[c.product] = (byProduct[c.product] ?? 0) + 1;
    }
    return Object.entries(byProduct)
      .map(([product, count]) => ({ product, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getChangeImpactMetrics(changeKey: string): Promise<any> {
    const change = await this.getAppliedChangeByKey(changeKey);
    if (!change) return null;
    const since = change.appliedAt ?? change.createdAt;
    const [leadsAfter] = await db.select({ c: count() }).from(chatConversations)
      .where(gte(chatConversations.createdAt, since));
    const [ordersAfter] = await db.select({ c: count() }).from(orders)
      .where(and(gte(orders.createdAt, since), eq(orders.status, "paid")));
    const rollbacks = await db.select().from(rollbackEvents)
      .where(eq(rollbackEvents.appliedChangeId, change.id));
    return {
      changeKey,
      appliedAt: since,
      leadsAfter: Number(leadsAfter?.c ?? 0),
      ordersAfter: Number(ordersAfter?.c ?? 0),
      hasRollback: rollbacks.length > 0,
      change,
    };
  }

  // ── Phase 52: Founder Control, Scale & Maturity ──────────────────────────────

  async getUserRoles(): Promise<UserRole[]> {
    return db.select().from(userRoles).orderBy(userRoles.role);
  }

  async upsertUserRole(input: InsertUserRole): Promise<UserRole> {
    const [row] = await db
      .insert(userRoles)
      .values(input)
      .onConflictDoUpdate({ target: userRoles.email, set: { ...input } })
      .returning();
    return row;
  }

  async updateUserRole(id: number, patch: Partial<InsertUserRole>): Promise<UserRole | undefined> {
    const [row] = await db.update(userRoles).set(patch).where(eq(userRoles.id, id)).returning();
    return row;
  }

  async getApprovalRequests(status?: string): Promise<ApprovalRequest[]> {
    const q = db.select().from(approvalRequests).orderBy(desc(approvalRequests.createdAt));
    if (status) {
      return q.where(eq(approvalRequests.status, status)).limit(100);
    }
    return q.limit(100);
  }

  async createApprovalRequest(input: InsertApprovalRequest): Promise<ApprovalRequest> {
    const [row] = await db.insert(approvalRequests).values(input).returning();
    return row;
  }

  async updateApprovalRequest(id: number, patch: Partial<InsertApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const [row] = await db.update(approvalRequests).set(patch).where(eq(approvalRequests.id, id)).returning();
    return row;
  }

  async getAiExplanations(entityType?: string, entityId?: string, limit = 50): Promise<AiExplanation[]> {
    const q = db.select().from(aiExplanations).orderBy(desc(aiExplanations.createdAt));
    if (entityType && entityId) {
      return q.where(and(eq(aiExplanations.entityType, entityType), eq(aiExplanations.entityId, entityId))).limit(limit);
    }
    if (entityType) {
      return q.where(eq(aiExplanations.entityType, entityType)).limit(limit);
    }
    return q.limit(limit);
  }

  async createAiExplanation(input: InsertAiExplanation): Promise<AiExplanation> {
    const [row] = await db.insert(aiExplanations).values(input).returning();
    return row;
  }

  async getSystemHealthSnapshots(limit = 30): Promise<SystemHealthSnapshot[]> {
    return db.select().from(systemHealthSnapshots).orderBy(desc(systemHealthSnapshots.snapshotTime)).limit(limit);
  }

  async createSystemHealthSnapshot(input: InsertSystemHealthSnapshot): Promise<SystemHealthSnapshot> {
    const [row] = await db.insert(systemHealthSnapshots).values(input).returning();
    return row;
  }

  async getLatestHealthSnapshot(): Promise<SystemHealthSnapshot | undefined> {
    const [row] = await db.select().from(systemHealthSnapshots).orderBy(desc(systemHealthSnapshots.snapshotTime)).limit(1);
    return row;
  }

  async getQuarterlyStrategyReports(limit = 10): Promise<QuarterlyStrategyReport[]> {
    return db.select().from(quarterlyStrategyReports).orderBy(desc(quarterlyStrategyReports.createdAt)).limit(limit);
  }

  async createQuarterlyStrategyReport(input: InsertQuarterlyStrategyReport): Promise<QuarterlyStrategyReport> {
    const [row] = await db.insert(quarterlyStrategyReports).values(input).returning();
    return row;
  }

  async getFounderOverview(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [changedToday] = await db.select({ c: count() }).from(appliedChanges).where(gte(appliedChanges.createdAt, today));
    const [rolledBackToday] = await db.select({ c: count() }).from(rollbackEvents).where(gte(rollbackEvents.createdAt, today));
    const [pendingApprovals] = await db.select({ c: count() }).from(executionQueue).where(eq(executionQueue.status, "pending"));
    const [pendingRequests] = await db.select({ c: count() }).from(approvalRequests).where(eq(approvalRequests.status, "pending"));
    const latestHealth = await this.getLatestHealthSnapshot();
    const topExperiment = await db.select().from(growthExperiments)
      .where(eq(growthExperiments.status, "won"))
      .orderBy(desc(growthExperiments.expectedImpactScore))
      .limit(1);
    const topSource = await db.select().from(sourcePerformanceSnapshots)
      .orderBy(desc(sourcePerformanceSnapshots.qualityScore))
      .limit(1);
    const topOffer = await db.select().from(offerPerformanceSnapshots)
      .orderBy(desc(offerPerformanceSnapshots.performanceScore))
      .limit(1);
    return {
      changedToday: Number(changedToday?.c ?? 0),
      rolledBackToday: Number(rolledBackToday?.c ?? 0),
      pendingApprovals: Number(pendingApprovals?.c ?? 0) + Number(pendingRequests?.c ?? 0),
      maturityScore: latestHealth?.overallMaturityScore ?? 0,
      topGrowthWin: topExperiment[0] ?? null,
      topSource: topSource[0] ?? null,
      topOffer: topOffer[0] ?? null,
    };
  }

  async getWhatChangedToday(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const changes = await db.select().from(appliedChanges).where(gte(appliedChanges.createdAt, today)).orderBy(desc(appliedChanges.createdAt));
    const rollbacks = await db.select().from(rollbackEvents).where(gte(rollbackEvents.createdAt, today)).orderBy(desc(rollbackEvents.createdAt));
    const experiments = await db.select().from(growthExperiments).where(gte(growthExperiments.createdAt, today)).orderBy(desc(growthExperiments.createdAt));
    const queued = await db.select().from(executionQueue).where(gte(executionQueue.createdAt, today)).orderBy(desc(executionQueue.createdAt));
    return { changes, rollbacks, experiments, queued };
  }

  async seedDefaultExecutionPolicies(): Promise<void> {
    const defaults: InsertExecutionPolicy[] = [
      { policyKey: "offer_auto_apply", area: "offer", mode: "suggest_only", minConfidence: 75, maxRiskScore: 20, isEnabled: true },
      { policyKey: "cta_auto_apply", area: "cta", mode: "approval_required", minConfidence: 70, maxRiskScore: 25, isEnabled: true },
      { policyKey: "links_auto_apply", area: "links", mode: "auto_apply_safe", minConfidence: 80, maxRiskScore: 15, isEnabled: true },
      { policyKey: "experiment_auto_apply", area: "experiment", mode: "approval_required", minConfidence: 80, maxRiskScore: 20, isEnabled: true },
      { policyKey: "override_auto_apply", area: "override", mode: "suggest_only", minConfidence: 85, maxRiskScore: 10, isEnabled: true },
    ];
    for (const policy of defaults) {
      await this.upsertExecutionPolicy(policy);
    }
  }

  // ─── Phase 64 — Founder Intelligence System ────────────────────────────────
  // Daily time-series for predictive intelligence (last N days).
  async getFounderIntelSeries(days = 30): Promise<Array<{
    date: string; visits: number; leads: number; conversions: number; revenueCents: number;
  }>> {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [visitRows, leadRows, orderRows] = await Promise.all([
      db.select({ d: sql<string>`to_char(${pageViews.createdAt}, 'YYYY-MM-DD')`, c: count() })
        .from(pageViews).where(gte(pageViews.createdAt, since))
        .groupBy(sql`to_char(${pageViews.createdAt}, 'YYYY-MM-DD')`),
      db.select({
        d: sql<string>`to_char(${chatConversations.createdAt}, 'YYYY-MM-DD')`,
        c: count(),
      }).from(chatConversations).where(gte(chatConversations.createdAt, since))
        .groupBy(sql`to_char(${chatConversations.createdAt}, 'YYYY-MM-DD')`),
      db.select({
        d: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
        rev: sql<number>`coalesce(sum(${orders.amountPaid}), 0)`,
        conv: sql<number>`count(*) FILTER (WHERE ${orders.status} = 'paid')`,
      }).from(orders).where(gte(orders.createdAt, since))
        .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`),
    ]);

    const visitMap = new Map(visitRows.map((r) => [r.d, Number(r.c)]));
    const leadMap = new Map(leadRows.map((r) => [r.d, Number(r.c)]));
    const revMap = new Map(orderRows.map((r) => [r.d, Number(r.rev)]));
    const orderConvMap = new Map(orderRows.map((r) => [r.d, Number(r.conv)]));

    const out: Array<{ date: string; visits: number; leads: number; conversions: number; revenueCents: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        date: key,
        visits: visitMap.get(key) ?? 0,
        leads: leadMap.get(key) ?? 0,
        // Canonical conversion = paid orders only, to avoid double-counting a
        // won lead and its paid order as two separate conversions.
        conversions: orderConvMap.get(key) ?? 0,
        revenueCents: revMap.get(key) ?? 0,
      });
    }
    return out;
  }

  async createFounderIntelReport(input: InsertFounderIntelReport): Promise<FounderIntelReport> {
    const [row] = await db.insert(founderIntelReports).values(input).returning();
    return row;
  }

  async listFounderIntelReports(periodType?: string, limit = 30): Promise<FounderIntelReport[]> {
    const q = db.select().from(founderIntelReports);
    const rows = periodType
      ? await q.where(eq(founderIntelReports.periodType, periodType)).orderBy(desc(founderIntelReports.createdAt)).limit(limit)
      : await q.orderBy(desc(founderIntelReports.createdAt)).limit(limit);
    return rows;
  }

  async getFounderIntelReport(id: number): Promise<FounderIntelReport | undefined> {
    const [row] = await db.select().from(founderIntelReports).where(eq(founderIntelReports.id, id)).limit(1);
    return row;
  }

  async createFounderDecisionItem(input: InsertFounderDecisionItem): Promise<FounderDecisionItem> {
    const [row] = await db.insert(founderDecisionItems).values(input).returning();
    return row;
  }

  // Atomic regeneration: clears open auto-derived items only (preserving any
  // open items from other sources), then inserts the fresh batch.
  async replaceFounderDecisionItems(items: InsertFounderDecisionItem[]): Promise<FounderDecisionItem[]> {
    return db.transaction(async (tx) => {
      await tx.delete(founderDecisionItems).where(
        and(
          eq(founderDecisionItems.status, "open"),
          inArray(founderDecisionItems.source, ["rules", "forecast", "growth"]),
        ),
      );
      if (items.length === 0) return [];
      return tx.insert(founderDecisionItems).values(items).returning();
    });
  }

  async listFounderDecisionItems(opts: { kind?: string; status?: string; limit?: number } = {}): Promise<FounderDecisionItem[]> {
    const conds: any[] = [];
    if (opts.kind) conds.push(eq(founderDecisionItems.kind, opts.kind));
    if (opts.status) conds.push(eq(founderDecisionItems.status, opts.status));
    const base = db.select().from(founderDecisionItems);
    const filtered = conds.length > 0 ? base.where(and(...conds)) : base;
    return filtered
      .orderBy(desc(founderDecisionItems.priority), desc(founderDecisionItems.createdAt))
      .limit(Math.max(1, Math.min(200, opts.limit ?? 100)));
  }

  async updateFounderDecisionStatus(id: number, status: string): Promise<FounderDecisionItem | undefined> {
    const [row] = await db.update(founderDecisionItems)
      .set({ status })
      .where(eq(founderDecisionItems.id, id))
      .returning();
    return row;
  }

  // ─── Phase 65 — Revenue Intelligence Engine ────────────────────────────────

  // Customer Lifetime Value: aggregate paid orders by customer. Emails are
  // masked here so raw PII never leaves storage. Read-only.
  async getCustomerLtvData(): Promise<{
    totalCustomers: number;
    repeatCustomers: number;
    repeatRate: number;        // % of customers with >1 paid order
    avgLtvCents: number;       // avg total spend per customer
    avgOrdersPerCustomer: number;
    medianLtvCents: number;
    topCustomers: Array<{ label: string; orders: number; totalCents: number; firstOrder: string; lastOrder: string }>;
    cohorts: Array<{ month: string; customers: number; revenueCents: number }>;
  }> {
    const rows = await db
      .select({
        email: orders.customerEmail,
        orderCount: sql<number>`count(*)`,
        totalCents: sql<number>`coalesce(sum(${orders.amountPaid}), 0)`,
        firstOrder: sql<string>`to_char(min(${orders.createdAt}), 'YYYY-MM-DD')`,
        lastOrder: sql<string>`to_char(max(${orders.createdAt}), 'YYYY-MM-DD')`,
        firstMonth: sql<string>`to_char(min(${orders.createdAt}), 'YYYY-MM')`,
      })
      .from(orders)
      .where(eq(orders.status, "paid"))
      .groupBy(orders.customerEmail);

    const customers = rows.map((r) => ({
      email: r.email,
      orders: Number(r.orderCount),
      totalCents: Number(r.totalCents),
      firstOrder: r.firstOrder,
      lastOrder: r.lastOrder,
      firstMonth: r.firstMonth,
    }));

    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((c) => c.orders > 1).length;
    const totalSpend = customers.reduce((s, c) => s + c.totalCents, 0);
    const totalOrders = customers.reduce((s, c) => s + c.orders, 0);
    const avgLtvCents = totalCustomers ? Math.round(totalSpend / totalCustomers) : 0;
    const avgOrdersPerCustomer = totalCustomers ? Math.round((totalOrders / totalCustomers) * 100) / 100 : 0;
    const repeatRate = totalCustomers ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10 : 0;

    const sortedSpend = [...customers].map((c) => c.totalCents).sort((a, b) => a - b);
    const medianLtvCents = sortedSpend.length
      ? (sortedSpend.length % 2 === 1
          ? sortedSpend[(sortedSpend.length - 1) / 2]
          : Math.round((sortedSpend[sortedSpend.length / 2 - 1] + sortedSpend[sortedSpend.length / 2]) / 2))
      : 0;

    const mask = (email: string): string => {
      const [local, domain] = String(email || "").split("@");
      if (!domain) return "customer";
      const head = local.slice(0, 2);
      return `${head}${"*".repeat(Math.max(1, Math.min(4, local.length - 2)))}@${domain}`;
    };

    const topCustomers = [...customers]
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 10)
      .map((c) => ({ label: mask(c.email), orders: c.orders, totalCents: c.totalCents, firstOrder: c.firstOrder, lastOrder: c.lastOrder }));

    const cohortMap = new Map<string, { customers: number; revenueCents: number }>();
    for (const c of customers) {
      const key = c.firstMonth || "unknown";
      const entry = cohortMap.get(key) ?? { customers: 0, revenueCents: 0 };
      entry.customers += 1;
      entry.revenueCents += c.totalCents;
      cohortMap.set(key, entry);
    }
    const cohorts = Array.from(cohortMap.entries())
      .map(([month, v]) => ({ month, customers: v.customers, revenueCents: v.revenueCents }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    return {
      totalCustomers, repeatCustomers, repeatRate, avgLtvCents,
      avgOrdersPerCustomer, medianLtvCents, topCustomers, cohorts,
    };
  }

  // Booking intelligence: status mix, conversion of bookings → won deals,
  // and recent booking volume. Read-only.
  async getBookingIntelligence(): Promise<{
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    pending: number;
    confirmed: number;
    last30Days: number;
    bookedLeads: number;        // leads currently at 'booked' stage
    wonLeads: number;           // leads that reached 'won'
    bookingToWonRate: number;   // % of booked sessions that became won deals
  }> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const [statusRows, totalRow, recentRow, bookedRow, wonFromBookedRow] = await Promise.all([
      db.select({ status: bookings.status, c: count() }).from(bookings).groupBy(bookings.status),
      db.select({ c: count() }).from(bookings),
      db.select({ c: count() }).from(bookings).where(gte(bookings.createdAt, since)),
      db.select({ c: count() }).from(chatConversations).where(eq(chatConversations.pipelineStage, "booked")),
      db.select({ c: count() }).from(chatConversations).where(eq(chatConversations.pipelineStage, "won")),
    ]);

    const byStatus = statusRows.map((r) => ({ status: r.status ?? "unknown", count: Number(r.c) }));
    const total = Number(totalRow[0]?.c ?? 0);
    const pending = byStatus.find((s) => s.status === "pending")?.count ?? 0;
    const confirmed = byStatus.find((s) => s.status === "confirmed")?.count ?? 0;
    const bookedLeads = Number(bookedRow[0]?.c ?? 0);
    const wonLeads = Number(wonFromBookedRow[0]?.c ?? 0);
    // Conversion proxy: won deals relative to (booked + won) lead stages.
    const denom = bookedLeads + wonLeads;
    const bookingToWonRate = denom > 0 ? Math.round((wonLeads / denom) * 1000) / 10 : 0;

    return {
      total, byStatus, pending, confirmed,
      last30Days: Number(recentRow[0]?.c ?? 0),
      bookedLeads, wonLeads, bookingToWonRate,
    };
  }

  async createRevenueIntelReport(input: InsertRevenueIntelReport): Promise<RevenueIntelReport> {
    const [row] = await db.insert(revenueIntelReports).values(input).returning();
    return row;
  }

  async listRevenueIntelReports(periodType?: string, limit = 30): Promise<RevenueIntelReport[]> {
    const q = db.select().from(revenueIntelReports);
    const rows = periodType
      ? await q.where(eq(revenueIntelReports.periodType, periodType)).orderBy(desc(revenueIntelReports.createdAt)).limit(limit)
      : await q.orderBy(desc(revenueIntelReports.createdAt)).limit(limit);
    return rows;
  }

  async getRevenueIntelReport(id: number): Promise<RevenueIntelReport | undefined> {
    const [row] = await db.select().from(revenueIntelReports).where(eq(revenueIntelReports.id, id)).limit(1);
    return row;
  }

  async createRevenueInsight(input: InsertRevenueInsight): Promise<RevenueInsight> {
    const [row] = await db.insert(revenueInsights).values(input).returning();
    return row;
  }

  // Atomic regeneration: clears only open auto-derived insights (rules/forecast),
  // preserving open items from other sources, then inserts the fresh batch.
  async replaceRevenueInsights(items: InsertRevenueInsight[]): Promise<RevenueInsight[]> {
    return db.transaction(async (tx) => {
      await tx.delete(revenueInsights).where(
        and(
          eq(revenueInsights.status, "open"),
          inArray(revenueInsights.source, ["rules", "forecast"]),
        ),
      );
      if (items.length === 0) return [];
      return tx.insert(revenueInsights).values(items).returning();
    });
  }

  async listRevenueInsights(opts: { kind?: string; status?: string; limit?: number } = {}): Promise<RevenueInsight[]> {
    const conds: any[] = [];
    if (opts.kind) conds.push(eq(revenueInsights.kind, opts.kind));
    if (opts.status) conds.push(eq(revenueInsights.status, opts.status));
    const base = db.select().from(revenueInsights);
    const filtered = conds.length > 0 ? base.where(and(...conds)) : base;
    return filtered
      .orderBy(desc(revenueInsights.priority), desc(revenueInsights.createdAt))
      .limit(Math.max(1, Math.min(200, opts.limit ?? 100)));
  }

  async updateRevenueInsightStatus(id: number, status: string): Promise<RevenueInsight | undefined> {
    const [row] = await db.update(revenueInsights)
      .set({ status })
      .where(eq(revenueInsights.id, id))
      .returning();
    return row;
  }

  // ── Phase 66 — Growth Automation Engine ────────────────────────────────────

  // SEO/content discovery data: per-page traffic + published blog inventory.
  async getGrowthSeoData(): Promise<{
    pages: Array<{ page: string; views: number }>;
    totalViews: number;
    blogPosts: Array<{ title: string; slug: string; publishedAt: Date | null }>;
    blogCount: number;
    latestBlogAt: Date | null;
  }> {
    const [views, posts] = await Promise.all([
      this.getPageViews().catch(() => [] as Array<{ createdAt: Date; page: string }>),
      this.getBlogPosts(true).catch(() => [] as BlogPost[]),
    ]);
    const counts = new Map<string, number>();
    for (const v of views) counts.set(v.page, (counts.get(v.page) ?? 0) + 1);
    const pages = Array.from(counts.entries())
      .map(([page, vs]) => ({ page, views: vs }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 25);
    const blogPosts = posts
      .map((p) => ({ title: p.title, slug: p.slug, publishedAt: (p as any).publishedAt ?? p.createdAt ?? null }))
      .slice(0, 50);
    const latestBlogAt = blogPosts.reduce<Date | null>((acc, p) => {
      const d = p.publishedAt ? new Date(p.publishedAt) : null;
      return d && (!acc || d > acc) ? d : acc;
    }, null);
    return { pages, totalViews: views.length, blogPosts, blogCount: posts.length, latestBlogAt };
  }

  // Lead scoring distribution drawn from the dashboard summary + pipeline stages.
  async getLeadScoringData(): Promise<{
    total: number; emailCaptured: number; hot: number; qualified: number;
    bookedThisWeek: number; wonThisMonth: number; topIntent: string | null;
  }> {
    const summary = await this.getDashboardSummary().catch(() => null as any);
    return {
      total: summary?.leads?.total ?? 0,
      emailCaptured: summary?.leads?.emailCaptured ?? 0,
      hot: summary?.leads?.hot ?? 0,
      qualified: summary?.leads?.qualified ?? 0,
      bookedThisWeek: summary?.leads?.bookedThisWeek ?? 0,
      wonThisMonth: summary?.leads?.wonThisMonth ?? 0,
      topIntent: summary?.topIntent ?? null,
    };
  }

  async createGrowthAutoOpportunity(input: InsertGrowthAutoOpportunity): Promise<GrowthAutoOpportunity> {
    const [row] = await db.insert(growthAutoOpportunities).values(input).returning();
    return row;
  }

  // Atomic regeneration: clears only open auto-derived opportunities (rules/forecast),
  // preserving open items from other sources, then inserts the fresh batch.
  async replaceGrowthAutoOpportunities(items: InsertGrowthAutoOpportunity[]): Promise<GrowthAutoOpportunity[]> {
    return db.transaction(async (tx) => {
      await tx.delete(growthAutoOpportunities).where(
        and(
          eq(growthAutoOpportunities.status, "open"),
          inArray(growthAutoOpportunities.source, ["rules", "forecast"]),
        ),
      );
      if (items.length === 0) return [];
      return tx.insert(growthAutoOpportunities).values(items).returning();
    });
  }

  async listGrowthAutoOpportunities(opts: { kind?: string; status?: string; limit?: number } = {}): Promise<GrowthAutoOpportunity[]> {
    const conds: any[] = [];
    if (opts.kind) conds.push(eq(growthAutoOpportunities.kind, opts.kind));
    if (opts.status) conds.push(eq(growthAutoOpportunities.status, opts.status));
    const base = db.select().from(growthAutoOpportunities);
    const filtered = conds.length > 0 ? base.where(and(...conds)) : base;
    return filtered
      .orderBy(desc(growthAutoOpportunities.priority), desc(growthAutoOpportunities.createdAt))
      .limit(Math.max(1, Math.min(200, opts.limit ?? 100)));
  }

  async updateGrowthAutoOpportunityStatus(id: number, status: string): Promise<GrowthAutoOpportunity | undefined> {
    const [row] = await db.update(growthAutoOpportunities)
      .set({ status })
      .where(eq(growthAutoOpportunities.id, id))
      .returning();
    return row;
  }

  async createGrowthAutoCampaign(input: InsertGrowthAutoCampaign): Promise<GrowthAutoCampaign> {
    const [row] = await db.insert(growthAutoCampaigns).values(input).returning();
    return row;
  }

  async listGrowthAutoCampaigns(opts: { status?: string; channel?: string; limit?: number } = {}): Promise<GrowthAutoCampaign[]> {
    const conds: any[] = [];
    if (opts.status) conds.push(eq(growthAutoCampaigns.status, opts.status));
    if (opts.channel) conds.push(eq(growthAutoCampaigns.channel, opts.channel));
    const base = db.select().from(growthAutoCampaigns);
    const filtered = conds.length > 0 ? base.where(and(...conds)) : base;
    return filtered
      .orderBy(desc(growthAutoCampaigns.createdAt))
      .limit(Math.max(1, Math.min(200, opts.limit ?? 50)));
  }

  async getGrowthAutoCampaign(id: number): Promise<GrowthAutoCampaign | undefined> {
    const [row] = await db.select().from(growthAutoCampaigns).where(eq(growthAutoCampaigns.id, id)).limit(1);
    return row;
  }

  async updateGrowthAutoCampaign(id: number, patch: Partial<Pick<GrowthAutoCampaign, "status" | "approvalRequestId" | "resolvedAt">>): Promise<GrowthAutoCampaign | undefined> {
    const [row] = await db.update(growthAutoCampaigns)
      .set(patch)
      .where(eq(growthAutoCampaigns.id, id))
      .returning();
    return row;
  }

  // Atomic guarded transition: only succeeds if the campaign is currently in one
  // of `fromStatuses`. Returns the updated row, or null if the guard did not match
  // (already resolved / concurrent transition). Prevents double-approve races and
  // contradictory terminal states.
  async transitionGrowthAutoCampaign(
    id: number,
    fromStatuses: string[],
    patch: Partial<Pick<GrowthAutoCampaign, "status" | "approvalRequestId" | "resolvedAt">>,
  ): Promise<GrowthAutoCampaign | null> {
    const [row] = await db.update(growthAutoCampaigns)
      .set(patch)
      .where(and(eq(growthAutoCampaigns.id, id), inArray(growthAutoCampaigns.status, fromStatuses)))
      .returning();
    return row ?? null;
  }

  async createGrowthAutoReport(input: InsertGrowthAutoReport): Promise<GrowthAutoReport> {
    const [row] = await db.insert(growthAutoReports).values(input).returning();
    return row;
  }

  async listGrowthAutoReports(periodType?: string, limit = 30): Promise<GrowthAutoReport[]> {
    const q = db.select().from(growthAutoReports);
    const rows = periodType
      ? await q.where(eq(growthAutoReports.periodType, periodType)).orderBy(desc(growthAutoReports.createdAt)).limit(limit)
      : await q.orderBy(desc(growthAutoReports.createdAt)).limit(limit);
    return rows;
  }

  async getGrowthAutoReport(id: number): Promise<GrowthAutoReport | undefined> {
    const [row] = await db.select().from(growthAutoReports).where(eq(growthAutoReports.id, id)).limit(1);
    return row;
  }

  // ── Phase 67 — Cognitive Operating System ──────────────────────────────────

  async getCognitiveDecisions(opts: { kind?: string; status?: string; limit?: number } = {}): Promise<CognitiveDecision[]> {
    const conds: any[] = [];
    if (opts.kind) conds.push(eq(cognitiveDecisions.kind, opts.kind));
    if (opts.status) conds.push(eq(cognitiveDecisions.status, opts.status));
    const base = db.select().from(cognitiveDecisions);
    const filtered = conds.length > 0 ? base.where(and(...conds)) : base;
    return filtered
      .orderBy(desc(cognitiveDecisions.priority), desc(cognitiveDecisions.createdAt))
      .limit(Math.max(1, Math.min(200, opts.limit ?? 100)));
  }

  async createCognitiveDecision(input: InsertCognitiveDecision): Promise<CognitiveDecision> {
    const [row] = await db.insert(cognitiveDecisions).values(input).returning();
    return row;
  }

  // Atomic regeneration: clears open auto-derived decisions only (preserving
  // any open items from other sources), then inserts the fresh batch.
  async replaceCognitiveDecisions(items: InsertCognitiveDecision[]): Promise<CognitiveDecision[]> {
    return db.transaction(async (tx) => {
      await tx.delete(cognitiveDecisions).where(
        and(
          eq(cognitiveDecisions.status, "open"),
          inArray(cognitiveDecisions.source, ["rules", "deepseek"]),
        ),
      );
      if (items.length === 0) return [];
      return tx.insert(cognitiveDecisions).values(items).returning();
    });
  }

  async updateCognitiveDecisionStatus(id: number, status: string): Promise<CognitiveDecision | undefined> {
    const [row] = await db.update(cognitiveDecisions)
      .set({ status })
      .where(eq(cognitiveDecisions.id, id))
      .returning();
    return row;
  }

  async getCognitiveBriefings(periodType?: string, limit = 30): Promise<CognitiveBriefing[]> {
    const q = db.select().from(cognitiveBriefings);
    const rows = periodType
      ? await q.where(eq(cognitiveBriefings.periodType, periodType)).orderBy(desc(cognitiveBriefings.createdAt)).limit(limit)
      : await q.orderBy(desc(cognitiveBriefings.createdAt)).limit(limit);
    return rows;
  }

  async getCognitiveBriefing(id: number): Promise<CognitiveBriefing | undefined> {
    const [row] = await db.select().from(cognitiveBriefings).where(eq(cognitiveBriefings.id, id)).limit(1);
    return row;
  }

  async createCognitiveBriefing(input: InsertCognitiveBriefing): Promise<CognitiveBriefing> {
    const [row] = await db.insert(cognitiveBriefings).values(input).returning();
    return row;
  }

  async getCognitiveConflicts(opts: { status?: string; limit?: number } = {}): Promise<CognitiveConflict[]> {
    const base = db.select().from(cognitiveConflicts);
    const filtered = opts.status ? base.where(eq(cognitiveConflicts.status, opts.status)) : base;
    return filtered
      .orderBy(desc(cognitiveConflicts.severity), desc(cognitiveConflicts.createdAt))
      .limit(Math.max(1, Math.min(200, opts.limit ?? 100)));
  }

  async createCognitiveConflict(input: InsertCognitiveConflict): Promise<CognitiveConflict> {
    const [row] = await db.insert(cognitiveConflicts).values(input).returning();
    return row;
  }

  // Atomic regeneration mirroring replaceCognitiveDecisions.
  async replaceCognitiveConflicts(items: InsertCognitiveConflict[]): Promise<CognitiveConflict[]> {
    return db.transaction(async (tx) => {
      await tx.delete(cognitiveConflicts).where(
        and(
          eq(cognitiveConflicts.status, "open"),
          eq(cognitiveConflicts.source, "rules"),
        ),
      );
      if (items.length === 0) return [];
      return tx.insert(cognitiveConflicts).values(items).returning();
    });
  }

  async updateCognitiveConflictStatus(id: number, status: string): Promise<CognitiveConflict | undefined> {
    const [row] = await db.update(cognitiveConflicts)
      .set({ status })
      .where(eq(cognitiveConflicts.id, id))
      .returning();
    return row;
  }

  // Read-only unification: pulls every OPEN signal from the existing
  // intelligence engines into one normalized list. Never mutates anything.
  async getAllCognitiveSignals(): Promise<CognitiveSignal[]> {
    const [founder, revenue, growth] = await Promise.all([
      db.select().from(founderDecisionItems).where(eq(founderDecisionItems.status, "open"))
        .orderBy(desc(founderDecisionItems.priority), desc(founderDecisionItems.createdAt)).limit(120),
      db.select().from(revenueInsights).where(eq(revenueInsights.status, "open"))
        .orderBy(desc(revenueInsights.priority), desc(revenueInsights.createdAt)).limit(120),
      db.select().from(growthAutoOpportunities).where(eq(growthAutoOpportunities.status, "open"))
        .orderBy(desc(growthAutoOpportunities.priority), desc(growthAutoOpportunities.createdAt)).limit(120),
    ]);

    const signals: CognitiveSignal[] = [];
    for (const r of founder) {
      signals.push({
        system: "founder", kind: r.kind, area: r.area, title: r.title,
        detail: r.detail, priority: r.priority, confidence: r.confidence,
      });
    }
    for (const r of revenue) {
      signals.push({
        system: "revenue", kind: r.kind, area: r.area, title: r.title,
        detail: r.detail, priority: r.priority, confidence: r.confidence,
      });
    }
    for (const r of growth) {
      signals.push({
        system: "growth", kind: r.kind, area: r.area, title: r.title,
        detail: r.detail, priority: r.priority, confidence: r.confidence,
      });
    }
    return signals;
  }
}

export const storage = new DatabaseStorage();
