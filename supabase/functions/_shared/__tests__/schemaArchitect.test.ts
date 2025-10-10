/**
 * Tests for Schema Architect
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/testing/asserts.ts';
import { SchemaArchitect } from '../schemaArchitect.ts';

// Mock Supabase client
const mockSupabase = {
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
};

Deno.test('SchemaArchitect - generates basic table structure', async () => {
  const architect = new SchemaArchitect(mockSupabase as any);
  
  const features = [
    {
      id: 'videoUpload',
      databaseTables: ['videos'],
    },
  ];

  const schema = await architect.generateFullSchema(features);
  
  assertExists(schema);
  assertEquals(schema.tables.length > 0, true);
  assertEquals(schema.sql.includes('CREATE TABLE'), true);
  assertEquals(schema.sql.includes('ENABLE ROW LEVEL SECURITY'), true);
});

Deno.test('SchemaArchitect - includes standard columns', async () => {
  const architect = new SchemaArchitect(mockSupabase as any);
  
  const features = [
    {
      id: 'comments',
      databaseTables: ['comments'],
    },
  ];

  const schema = await architect.generateFullSchema(features);
  const commentsTable = schema.tables.find(t => t.name === 'comments');
  
  assertExists(commentsTable);
  
  // Should have standard columns
  const columnNames = commentsTable!.columns.map(c => c.name);
  assertEquals(columnNames.includes('id'), true);
  assertEquals(columnNames.includes('created_at'), true);
  assertEquals(columnNames.includes('updated_at'), true);
  assertEquals(columnNames.includes('user_id'), true);
});

Deno.test('SchemaArchitect - generates foreign keys', async () => {
  const architect = new SchemaArchitect(mockSupabase as any);
  
  const features = [
    {
      id: 'comments',
      databaseTables: ['comments'],
    },
  ];

  const schema = await architect.generateFullSchema(features);
  const commentsTable = schema.tables.find(t => t.name === 'comments');
  
  assertExists(commentsTable);
  
  const foreignKeys = commentsTable!.columns.filter(c => c.isForeignKey);
  assertEquals(foreignKeys.length > 0, true, 'Should have foreign keys');
});

Deno.test('SchemaArchitect - generates RLS policies', async () => {
  const architect = new SchemaArchitect(mockSupabase as any);
  
  const features = [
    {
      id: 'videos',
      databaseTables: ['videos'],
    },
  ];

  const schema = await architect.generateFullSchema(features);
  const videosTable = schema.tables.find(t => t.name === 'videos');
  
  assertExists(videosTable);
  assertEquals(videosTable!.rlsPolicies.length >= 4, true, 'Should have CRUD policies');
  
  const policyCommands = videosTable!.rlsPolicies.map(p => p.command);
  assertEquals(policyCommands.includes('select'), true);
  assertEquals(policyCommands.includes('insert'), true);
  assertEquals(policyCommands.includes('update'), true);
  assertEquals(policyCommands.includes('delete'), true);
});

Deno.test('SchemaArchitect - generates indexes', async () => {
  const architect = new SchemaArchitect(mockSupabase as any);
  
  const features = [
    {
      id: 'likes',
      databaseTables: ['likes'],
    },
  ];

  const schema = await architect.generateFullSchema(features);
  const likesTable = schema.tables.find(t => t.name === 'likes');
  
  assertExists(likesTable);
  assertEquals(likesTable!.indexes.length > 0, true, 'Should have indexes');
});

Deno.test('SchemaArchitect - generates triggers', async () => {
  const architect = new SchemaArchitect(mockSupabase as any);
  
  const features = [
    {
      id: 'notifications',
      databaseTables: ['notifications'],
    },
  ];

  const schema = await architect.generateFullSchema(features);
  const notificationsTable = schema.tables.find(t => t.name === 'notifications');
  
  assertExists(notificationsTable);
  assertEquals(notificationsTable!.triggers.length > 0, true, 'Should have triggers');
  
  const triggerNames = notificationsTable!.triggers.map(t => t.name);
  assertEquals(
    triggerNames.some(name => name.includes('updated_at')),
    true,
    'Should have updated_at trigger'
  );
});

console.log('✅ All Schema Architect tests passed');
