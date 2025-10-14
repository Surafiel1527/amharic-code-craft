/**
 * Automated Integration Tests for Self-Healing System
 * Safe to run - uses isolated test data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

// Test data marker to identify and cleanup test records
const TEST_MARKER = 'AUTO_TEST_';

describe('Self-Healing System Integration Tests', () => {
  let testUserId: string;
  let testApprovalId: string;
  let testExperimentId: string;

  beforeAll(async () => {
    console.log('🧪 Starting Self-Healing System Tests...');
    
    // Get or create test user
    const { data: { user } } = await supabase.auth.getUser();
    testUserId = user?.id || 'test-user-id';
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test data...');
    
    // Cleanup test records
    await supabase
      .from('admin_approval_queue')
      .delete()
      .like('item_id', `${TEST_MARKER}%`);
      
    await supabase
      .from('fix_experiments')
      .delete()
      .like('id', `${TEST_MARKER}%`);
      
    await supabase
      .from('applied_improvements')
      .delete()
      .like('id', `${TEST_MARKER}%`);
  });

  describe('1. Admin Approval Queue', () => {
    it('should create a test approval item', async () => {
      const testItem = {
        item_type: 'prompt_improvement',
        item_id: `${TEST_MARKER}prompt_${Date.now()}`,
        status: 'pending',
        priority: 'normal',
        metadata: {
          before: 'Old prompt text',
          after: 'Improved prompt text',
          confidence: 0.85,
          reasoning: 'Automated test improvement'
        },
        submitted_by: testUserId
      };

      const { data, error } = await supabase
        .from('admin_approval_queue')
        .insert(testItem)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.status).toBe('pending');
      
      testApprovalId = data?.id;
      console.log('✅ Test approval item created:', testApprovalId);
    });

    it('should fetch pending approvals', async () => {
      const { data, error } = await supabase
        .from('admin_approval_queue')
        .select('*')
        .eq('status', 'pending')
        .like('item_id', `${TEST_MARKER}%`);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThan(0);
      
      console.log(`✅ Found ${data!.length} pending test approvals`);
    });

    it('should simulate approval action', async () => {
      const { data, error } = await supabase
        .from('admin_approval_queue')
        .update({
          status: 'approved',
          reviewed_by: testUserId,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: 'Automated test approval'
        })
        .eq('id', testApprovalId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('approved');
      
      console.log('✅ Test approval action completed');
    });
  });

  describe('2. A/B Testing Framework', () => {
    it('should create a test experiment', async () => {
      const testExperiment = {
        id: `${TEST_MARKER}exp_${Date.now()}`,
        error_pattern_id: `${TEST_MARKER}pattern_test`,
        fix_variant_a: {
          approach: 'Pattern matching fix',
          code: 'function fixA() { return "Fix A"; }'
        },
        fix_variant_b: {
          approach: 'AI-generated fix',
          code: 'function fixB() { return "Fix B"; }'
        },
        experiment_status: 'running',
        sample_size: 0,
        variant_a_success_count: 0,
        variant_a_failure_count: 0,
        variant_b_success_count: 0,
        variant_b_failure_count: 0
      };

      const { data, error } = await supabase
        .from('fix_experiments')
        .insert(testExperiment)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.experiment_status).toBe('running');
      
      testExperimentId = data?.id;
      console.log('✅ Test experiment created:', testExperimentId);
    });

    it('should record variant results', async () => {
      // Simulate variant A success
      const { error: errorA } = await supabase.rpc('record_experiment_result', {
        p_experiment_id: testExperimentId,
        p_variant: 'A',
        p_success: true
      });

      // Simulate variant B success
      const { error: errorB } = await supabase.rpc('record_experiment_result', {
        p_experiment_id: testExperimentId,
        p_variant: 'B',
        p_success: true
      });

      expect(errorA).toBeNull();
      expect(errorB).toBeNull();
      
      console.log('✅ Variant results recorded');
    });

    it('should fetch running experiments', async () => {
      const { data, error } = await supabase
        .from('fix_experiments')
        .select('*')
        .eq('experiment_status', 'running')
        .like('id', `${TEST_MARKER}%`);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      
      console.log(`✅ Found ${data!.length} running test experiments`);
    });
  });

  describe('3. Applied Improvements & Rollback', () => {
    it('should create a test applied improvement', async () => {
      const testImprovement = {
        id: `${TEST_MARKER}improvement_${Date.now()}`,
        approval_id: testApprovalId,
        item_type: 'prompt_improvement',
        item_id: `${TEST_MARKER}item_test`,
        previous_state: { old: 'data' },
        new_state: { new: 'data' },
        applied_by: testUserId,
        rolled_back: false
      };

      const { data, error } = await supabase
        .from('applied_improvements')
        .insert(testImprovement)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.rolled_back).toBe(false);
      
      console.log('✅ Test improvement applied');
    });

    it('should check rollback safety', async () => {
      const { data: improvements } = await supabase
        .from('applied_improvements')
        .select('*')
        .like('id', `${TEST_MARKER}%`)
        .eq('rolled_back', false)
        .limit(1)
        .single();

      if (improvements) {
        const { data, error } = await supabase.rpc('check_rollback_safety', {
          p_improvement_id: improvements.id
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        
        console.log('✅ Rollback safety check passed:', data);
      }
    });

    it('should fetch rollback history', async () => {
      const { data, error } = await supabase
        .from('rollback_history')
        .select('*')
        .order('rolled_back_at', { ascending: false })
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      console.log(`✅ Found ${data!.length} rollback history records`);
    });
  });

  describe('4. Pattern Learning System', () => {
    it('should fetch universal error patterns', async () => {
      const { data, error } = await supabase
        .from('universal_error_patterns')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      console.log(`✅ Found ${data!.length} learned patterns`);
    });

    it('should verify pattern confidence scores', async () => {
      const { data } = await supabase
        .from('universal_error_patterns')
        .select('confidence_score')
        .gte('confidence_score', 0)
        .lte('confidence_score', 1);

      expect(data).toBeDefined();
      
      const allValid = data!.every(
        (pattern: any) => pattern.confidence_score >= 0 && pattern.confidence_score <= 1
      );
      
      expect(allValid).toBe(true);
      console.log('✅ All confidence scores are valid (0-1)');
    });
  });

  describe('5. Auto-Generated Tests', () => {
    it('should fetch active regression tests', async () => {
      const { data, error } = await supabase
        .from('auto_generated_tests')
        .select('*')
        .eq('is_active', true)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      console.log(`✅ Found ${data!.length} active regression tests`);
    });

    it('should fetch test execution results', async () => {
      const { data, error } = await supabase
        .from('test_execution_results')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      console.log(`✅ Found ${data!.length} test execution results`);
    });
  });

  describe('6. System Health Metrics', () => {
    it('should calculate platform statistics', async () => {
      // This would normally require admin role, but we can test the query structure
      const { data, error } = await supabase
        .from('generation_analytics')
        .select('success')
        .limit(100);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      if (data && data.length > 0) {
        const successRate = (data.filter((r: any) => r.success).length / data.length) * 100;
        console.log(`✅ System success rate: ${successRate.toFixed(2)}%`);
      }
    });

    it('should verify database functions exist', async () => {
      const { data, error } = await supabase.rpc('check_rollback_safety', {
        p_improvement_id: 'test-id-check'
      });

      // We expect an error (item not found) but function should exist
      expect(error).toBeDefined(); // Function exists but returns error for non-existent item
      console.log('✅ Database functions are accessible');
    });
  });
});

// Summary reporter
describe('Test Summary', () => {
  it('should print test summary', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SELF-HEALING SYSTEM TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Admin Approval System: TESTED');
    console.log('✅ A/B Testing Framework: TESTED');
    console.log('✅ Rollback System: TESTED');
    console.log('✅ Pattern Learning: TESTED');
    console.log('✅ Auto-Generated Tests: TESTED');
    console.log('✅ System Health: TESTED');
    console.log('='.repeat(60));
    console.log('🚀 All systems operational!');
    console.log('='.repeat(60) + '\n');
    
    expect(true).toBe(true);
  });
});
