"use client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PricingContent } from "./PricingContent";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
