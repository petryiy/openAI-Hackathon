"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  Component,
  createContext,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BootSequence } from "@/components/onboarding/boot-sequence";
import { CustomCursor } from "@/components/onboarding/custom-cursor";

export type OnboardingPhase = "idle" | "entering" | "create";

type OnboardingContextValue = {
  phase: OnboardingPhase;
  reducedMotion: boolean;
  startJourney: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);
const KnowledgePortal = dynamic(
  () => import("@/components/onboarding/knowledge-portal").then((module) => module.KnowledgePortal),
  { ssr: false },
);

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingShell.");
  return value;
}

class PortalBoundary extends Component<{
  children: ReactNode;
  onFailure?: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Knowledge Portal fell back to its static rendering.", error, info);
    this.props.onFailure?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function OnboardingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<OnboardingPhase>(pathname === "/create" ? "create" : "idle");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);
  const [portalReady, setPortalReady] = useState(pathname === "/create");

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = window.matchMedia("(max-width: 760px)");
    const sync = () => {
      setReducedMotion(motionQuery.matches);
      setCompact(compactQuery.matches);
    };
    sync();
    motionQuery.addEventListener("change", sync);
    compactQuery.addEventListener("change", sync);
    return () => {
      motionQuery.removeEventListener("change", sync);
      compactQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (pathname === "/create") setPhase("create");
      if (pathname === "/") setPhase("idle");
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const startJourney = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("entering");
    timerRef.current = setTimeout(() => router.push("/create"), reducedMotion ? 160 : 1050);
  }, [phase, reducedMotion, router]);

  const value = useMemo(
    () => ({ phase, reducedMotion, startJourney }),
    [phase, reducedMotion, startJourney],
  );

  return (
    <OnboardingContext.Provider value={value}>
      <div className="onboarding-shell" data-phase={phase}>
        {pathname === "/" ? (
          <BootSequence ready={portalReady} reducedMotion={reducedMotion} />
        ) : null}
        <div className="onboarding-atmosphere" aria-hidden="true">
          <div className="onboarding-atmosphere__aurora" />
          <div className="onboarding-atmosphere__grid" />
          <div className="onboarding-atmosphere__scan" />
          <div className="portal-static">
            <span className="portal-static__ring portal-static__ring--one" />
            <span className="portal-static__ring portal-static__ring--two" />
            <span className="portal-static__core" />
          </div>
        </div>
        <PortalBoundary onFailure={() => setPortalReady(true)}>
          <KnowledgePortal
            phase={phase}
            reducedMotion={reducedMotion}
            compact={compact}
            onReady={() => setPortalReady(true)}
          />
        </PortalBoundary>
        <div className="onboarding-grain" aria-hidden="true" />
        <div className="onboarding-content">{children}</div>
        {pathname === "/" ? <CustomCursor /> : null}
      </div>
    </OnboardingContext.Provider>
  );
}
