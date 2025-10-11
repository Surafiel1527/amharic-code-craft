import { useGenerationMonitor } from "@/hooks/useGenerationMonitor";
import { AIThinkingPanel } from "./AIThinkingPanel";
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

  // Show thinking panel when executing
  const shouldShowThinking = isExecuting || executionStatus === 'running';

  // Show correction indicator when correction happens
  const shouldShowCorrection = currentCorrection !== null;

  return (
    <>
      {/* AI Thinking Panel */}
      {currentDecision && shouldShowThinking && (
        <AIThinkingPanel
          isVisible={true}
          currentStep={
            executionStatus === 'running' 
              ? "Executing generation plan..." 
              : executionStatus === 'correcting'
              ? "Applying auto-correction..."
              : "Analyzing request..."
          }
          confidence={currentDecision.confidence || 0.5}
          reasoning={currentDecision.reasoning || "Processing request..."}
          classificationResult={{
            type: currentDecision.type || currentDecision.classified_as || "unknown",
            intent: currentDecision.intent || "analyze",
            complexity: currentDecision.confidence > 0.7 ? "simple" : currentDecision.confidence > 0.4 ? "moderate" : "complex"
          }}
          steps={[
            { 
              step: "Analyze user intent", 
              status: "complete", 
              confidence: currentDecision.confidence,
              timestamp: new Date() 
            },
            { 
              step: "Execute generation", 
              status: executionStatus === 'running' ? "active" : executionStatus === 'success' ? "complete" : "pending",
              timestamp: new Date() 
            }
          ]}
        />
      )}

      {/* Correction Indicator */}
      {shouldShowCorrection && currentCorrection && (
        <CorrectionIndicator
          isVisible={true}
          status="corrected"
          correction={{
            issue: `Original: ${currentCorrection.from?.type || currentCorrection.from || 'unknown'}`,
            fix: `Corrected to: ${currentCorrection.to?.type || currentCorrection.to || 'unknown'}`,
            confidence: currentCorrection.to?.confidence || 0.8,
            from: currentCorrection.from?.type || currentCorrection.from,
            to: currentCorrection.to?.type || currentCorrection.to,
            reasoning: currentCorrection.to?.reasoning || "Auto-correction applied based on validation"
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
            concerns: [
              "Confidence is below threshold",
              "Need more information to proceed accurately"
            ]
          }}
        />
      )}
    </>
  );
}
