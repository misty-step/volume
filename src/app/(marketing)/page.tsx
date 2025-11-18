import { PageAnalyticsTracker } from "@/components/marketing";
import { UnauthenticatedLanding } from "@/components/landing/UnauthenticatedLanding";

export default function MarketingHome() {
  return (
    <>
      <PageAnalyticsTracker />
      <UnauthenticatedLanding />
    </>
  );
}
