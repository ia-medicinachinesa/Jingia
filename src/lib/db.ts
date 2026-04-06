// TODO: Implement actual DB connection (e.g. pg, Prisma, or Drizzle)
// This is a placeholder mock so the frontend UI can be built and tested.
export interface MockSubscriptionRow {
  subscription_status: string;
  plan_id: string | null;
  monthly_message_count: number;
  subscription_expires_at: Date | null;
}

export const db = {
  query: async (sql: string, params: any[]) => {
    // Mock user behavior - everyone is active "profissional" for now
    return {
      rows: [
        {
          subscription_status: 'active',
          plan_id: 'profissional',
          monthly_message_count: 5,
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        } as MockSubscriptionRow,
      ],
    };
  },
};
