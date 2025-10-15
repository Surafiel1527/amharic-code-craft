import { useGenerationMonitor } from "@/hooks/useGenerationMonitor";
import { CorrectionIndicator } from "./CorrectionIndicator";
import { ConfidenceDialog } from "./ConfidenceDialog";
import { useState } from "react";

interface GenerationMonitorOverlayProps {
  projectId?: string;
  onClarificationSubmit?: (clarification: string) => void;
}

export function GenerationMonitorOverlay({ 
  projectId,
  onClarificationSubmit 
}: GenerationMonitorOverlayProps) {
  const {
    currentDecision,
    currentCorrection,
    needsClarification,
    clarificationQuestions,
    isExecuting,
    executionStatus
  } = useGenerationMonitor(projectId);

  const [showClarificationDialog, setShowClarificationDialog] = useState(true);

  // Show correction indicator when correction happens
  const shouldShowCorrection = currentCorrection !== null;

  return (
    <>
      {/* AI Thinking now handled by AIProcessChat and AIThinkingPanel in Workspace */}
      
      {/* Correction Indicator */}
      {shouldShowCorrection && currentCorrection && (
        <CorrectionIndicator
          isVisible={true}
          status={executionStatus === 'failed' ? "failed" : "corrected"}
          correction={{
            issue: `Original classification: ${currentCorrection.from || 'unknown'}`,
            fix: `Corrected to: ${currentCorrection.to || 'unknown'}`,
            confidence: currentCorrection.confidence || 0.8,
            from: currentCorrection.from,
            to: currentCorrection.to,
            reasoning: currentCorrection.reasoning || "Auto-correction applied based on AGI self-reflection"
          }}
        />
      )}

      {/* Confidence Dialog */}
      {needsClarification && showClarificationDialog && (
        <ConfidenceDialog
          isOpen={true}
          onClose={() => setShowClarificationDialog(false)}
          confidence={currentDecision?.confidence || 0}
          questions={clarificationQuestions}
          onSubmitClarification={(clarification) => {
            setShowClarificationDialog(false);
            onClarificationSubmit?.(clarification);
          }}
          context={{
            userRequest: currentDecision?.userRequest || "",
            classifiedAs: currentDecision?.type || currentDecision?.classified_as || "",
            concerns: currentDecision?.concerns || [
              "Confidence is below threshold",
              "Need more information to proceed accurately"
            ]
          }}
        />
      )}
    </>
  );
}
