import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local if available
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath)
  } catch {
    // Ignore error if env file fails to parse
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const migrationPath = path.resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20261005180000_task_activity_log_trigger.sql'
)

console.log('🔍 Workhub Task Activity Log Trigger Verifier')
console.log('==============================================')

// 1. Static Migration File Verification
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file 20261005180000_task_activity_log_trigger.sql not found!')
  process.exit(1)
}

const migrationSql = fs.readFileSync(migrationPath, 'utf8')
console.log(`📄 Loaded migration file (${migrationSql.length} bytes)`)

const requiredPatterns = [
  { name: 'Function public.log_task_activity()', regex: /create or replace function public\.log_task_activity\(\)/i },
  { name: 'Security definer configuration', regex: /security definer/i },
  { name: 'Safe search_path configuration', regex: /set search_path = public/i },
  { name: 'AFTER UPDATE trigger definition', regex: /after update on public\.tasks/i },
  { name: 'Trigger execution hook', regex: /execute function public\.log_task_activity\(\)/i },
  { name: 'Field: column_id tracking', regex: /old\.column_id is distinct from new\.column_id/i },
  { name: 'Field: priority tracking', regex: /old\.priority is distinct from new\.priority/i },
  { name: 'Field: assignee_id tracking', regex: /old\.assignee_id is distinct from new\.assignee_id/i },
  { name: 'Field: due_date tracking', regex: /old\.due_date is distinct from new\.due_date/i },
  { name: 'Field: title tracking', regex: /old\.title is distinct from new\.title/i },
  { name: 'Field: description tracking', regex: /old\.description is distinct from new\.description/i },
  { name: 'Field: project_id tracking', regex: /old\.project_id is distinct from new\.project_id/i },
  { name: 'Field: github_branch tracking', regex: /old\.github_branch is distinct from new\.github_branch/i },
]

let allPassed = true
for (const pattern of requiredPatterns) {
  if (pattern.regex.test(migrationSql)) {
    console.log(`  ✅ ${pattern.name}`)
  } else {
    console.error(`  ❌ Missing pattern: ${pattern.name}`)
    allPassed = false
  }
}

if (!allPassed) {
  console.error('❌ Migration SQL validation failed!')
  process.exit(1)
}

console.log('\n📊 Migration SQL schema inspection passed successfully!')

// 2. Supabase Cloud Connection & Activity Log Check
const keyToUse = serviceRoleKey || anonKey
if (supabaseUrl && keyToUse) {
  console.log(`\n🔗 Connecting to Supabase: ${supabaseUrl}`)
  const supabase = createClient(supabaseUrl, keyToUse)

  try {
    const { count, error } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.warn('⚠️  Could not query activity_log table:', error.message)
    } else {
      console.log(`✅ Table activity_log accessible. Current total entries: ${count ?? 0}`)
    }
  } catch (err) {
    console.warn('⚠️  Connection check notice:', err.message)
  }
}

console.log('\n💡 SQL Verification Steps in Supabase Dashboard:')
console.log('1. Run the migration SQL in Supabase SQL Editor.')
console.log('2. Execute a test update on a task:')
console.log("   UPDATE public.tasks SET priority = 'critical' WHERE id = (SELECT id FROM public.tasks LIMIT 1);")
console.log('3. Verify the generated audit row:')
console.log("   SELECT * FROM public.activity_log WHERE field_name = 'priority' ORDER BY created_at DESC LIMIT 1;")
console.log('==============================================\n')
