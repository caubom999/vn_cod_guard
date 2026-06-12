export const CURRENT_APP_SUBSCRIPTIONS = `#graphql
  query CurrentVnCodGuardSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        trialDays
        createdAt
        currentPeriodEnd
      }
    }
  }
`;
