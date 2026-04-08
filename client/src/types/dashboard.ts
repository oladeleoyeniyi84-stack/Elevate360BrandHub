export type DashboardSummary = {
  leads: {
    total: number;
    emailCaptured: number;
    hot: number;
    qualified: number;
    bookedThisWeek: number;
    wonThisMonth: number;
  };
  revenue: {
    totalPaid: number;
    paidOrders: number;
    avgOrderValue: number;
    abandoned: number;
  };
  engagement: {
    newsletterSubscribers: number;
    contactForms: number;
    unrepliedContacts: number;
    pendingBookings: number;
  };
  topIntent: string | null;
  topRecommendedOffer: string | null;
  generatedAt: string;
};
