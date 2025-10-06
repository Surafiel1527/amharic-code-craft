# Edge Function Consolidation Strategy

## Current Problem
- **130+ edge functions** across the project
- Difficult to maintain, update, and debug
- High deployment overhead
- Duplicate code and logic

## Target: Reduce to ~15 Unified Functions

### Consolidation Groups

#### 1. **unified-ai-hub** (Replaces 25+ functions)
Consolidates:
- ai-assistant, ai-code-builder, ai-code-reviewer, ai-debugger
- ai-dependency-resolver, ai-deployment-advisor
- ai-package-suggester, ai-package-updater, ai-package-auto-installer
- intelligent-conversation, intelligent-language-detector
- model-selector, advanced-reasoning-engine

**Route by:** `{ action: 'build' | 'review' | 'debug' | 'suggest' | ... }`

#### 2. **unified-code-operations** (Replaces 20+ functions)
Consolidates:
- analyze-code, code-quality-analyzer, real-code-analysis
- optimize-code, contextual-auto-optimizer, performance-optimizer
- refactor-code, intelligent-refactor, suggest-refactoring
- generate-tests, automated-test-generator, ai-test-generator
- real-test-execution, automated-test-runner

**Route by:** `{ operation: 'analyze' | 'optimize' | 'refactor' | 'test' }`

#### 3. **unified-learning-engine** (Replaces 15+ functions)
Consolidates:
- learn-pattern, learn-from-conversation, learn-user-preferences
- pattern-recognizer, feedback-processor
- self-learning-engine, knowledge-ingest, multi-project-learn
- ai-reflect, self-reflection, meta-improve

**Route by:** `{ learningType: 'pattern' | 'conversation' | 'feedback' | ... }`

#### 4. **unified-deployment-manager** (Replaces 15+ functions)
Consolidates:
- deployment-orchestrator, auto-deployer, ci-cd-webhook
- deployment-health-monitor, deployment-fix-teacher
- predict-failure, predictive-alert-engine
- auto-rollback functions, build-quality-gate, physical-build-blocker

**Route by:** `{ phase: 'deploy' | 'monitor' | 'rollback' | 'healthcheck' }`

#### 5. **unified-monitoring-hub** (Replaces 12+ functions)
Consolidates:
- proactive-monitor, proactive-health-monitor, proactive-intelligence
- analytics-aggregator, predictive-analysis
- report-error, apply-fix, auto-fix-engine
- check-database-health, analyze-database-error

**Route by:** `{ service: 'health' | 'analytics' | 'errors' | 'database' }`

#### 6. **unified-healing-system** (Replaces 10+ functions)
Consolidates:
- self-heal, autonomous-healing-engine, mega-mind-self-healer
- auto-fix-engine, apply-fix, fix-stuck-job
- intelligent-retry-connection, optimize-connection-cost

**Route by:** `{ healType: 'auto' | 'manual' | 'retry' | 'optimize' }`

#### 7. **unified-generation-engine** (Replaces 10+ functions)
Consolidates:
- chat-generate, api-generate, react-component-generator
- multi-file-generate, generate-with-plan
- design-to-code, multi-modal-generator
- python-project-generator, dockerfile-agent

**Route by:** `{ generateType: 'component' | 'api' | 'chat' | 'project' }`

#### 8. **unified-security-hub** (Already done ✅)
Consolidates:
- security-scan, security-vulnerability-scanner, plugin-security-scanner
- get-security-audit-logs, get-security-metrics
- ai-package-security-scanner

**Route by:** `{ scanType: 'vulnerability' | 'plugin' | 'package' | 'audit' }`

#### 9. **unified-database-manager** (Replaces 8+ functions)
Consolidates:
- save-database-credentials, delete-database-credentials
- list-database-credentials, check-database-health
- learn-connection-knowledge, intelligent-retry-connection
- optimize-connection-cost

**Route by:** `{ dbAction: 'credentials' | 'health' | 'optimize' }`

#### 10. **unified-package-manager** (Replaces 8+ functions)
Consolidates:
- package-complete-project, generate-package-json
- auto-install-dependency, real-package-installer
- intelligent-package-installer, package-auto-monitor
- audit-dependencies

**Route by:** `{ packageOp: 'install' | 'audit' | 'monitor' | 'generate' }`

#### 11. **unified-improvement-orchestrator** (Replaces 8+ functions)
Consolidates:
- meta-self-improvement, meta-improve, scheduled-improvement
- auto-performance-optimizer, smart-build-optimizer
- component-awareness, accessibility-check

**Route by:** `{ improvementType: 'performance' | 'build' | 'accessibility' }`

#### 12. **unified-docs-manager** (Already done ✅)
Consolidates:
- generate-docs, fetch-documentation, fetch-provider-docs

**Route by:** `{ docAction: 'generate' | 'fetch' | 'search' }`

#### 13. **unified-admin-tools** (Replaces 8+ functions)
Consolidates:
- admin-self-modify, create-modification, rollback-customization
- manage-preferences, marketplace-publish, process-plugin-purchase

**Route by:** `{ adminAction: 'modify' | 'preferences' | 'marketplace' }`

#### 14. **unified-snapshot-manager** (Replaces 2 functions)
Consolidates:
- save-snapshot, restore-snapshot

**Route by:** `{ snapshotOp: 'save' | 'restore' | 'list' }`

#### 15. **unified-image-generator** (Already done ✅)
Consolidates:
- generate-image, generate-ai-image

**Route by:** `{ imageType: 'standard' | 'ai' }`

---

## Implementation Strategy

### Week 1: Core Consolidations (5 functions)
1. ✅ unified-security-scanner
2. ✅ unified-docs-manager  
3. ✅ unified-image-generator
4. **unified-ai-hub** (highest priority - 25+ functions)
5. **unified-code-operations** (20+ functions)

### Week 2: Intelligence & Monitoring (4 functions)
6. **unified-learning-engine**
7. **unified-monitoring-hub**
8. **unified-healing-system**
9. **unified-deployment-manager**

### Week 3: Supporting Systems (6 functions)
10. **unified-generation-engine**
11. **unified-database-manager**
12. **unified-package-manager**
13. **unified-improvement-orchestrator**
14. **unified-admin-tools**
15. **unified-snapshot-manager**

---

## Benefits

### Maintenance
- **92% reduction** in function count (130 → 15)
- Single file to update for related functionality
- Consistent error handling and logging
- Easier to test and debug

### Performance
- Reduced cold start overhead
- Better code sharing and reuse
- Optimized bundle sizes

### Development
- Clear architectural boundaries
- Easier to understand system
- Faster feature development
- Better documentation

### Cost
- Lower deployment costs
- Reduced monitoring complexity
- Fewer function instances to maintain

---

## Migration Plan

1. **Create new unified function**
2. **Test thoroughly** with existing use cases
3. **Update client code** to use new function
4. **Monitor for 1 week** in production
5. **Deprecate old functions** (mark in config)
6. **Delete old functions** after 2 weeks

---

## Example: Unified Function Structure

```typescript
// unified-ai-hub/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const handlers = {
  build: handleCodeBuild,
  review: handleCodeReview,
  debug: handleDebug,
  suggest: handleSuggestions,
  // ... more handlers
};

serve(async (req) => {
  const { action, ...params } = await req.json();
  
  const handler = handlers[action];
  if (!handler) {
    return new Response(
      JSON.stringify({ error: 'Unknown action' }), 
      { status: 400 }
    );
  }
  
  return handler(params);
});
```

---

## Rollout Status

- **Phase 1** (Week 1): 3/5 complete ✅
- **Phase 2** (Week 2): Not started
- **Phase 3** (Week 3): Not started

**Next Steps:** Implement unified-ai-hub and unified-code-operations
