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
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const seedSqlPath = path.resolve(process.cwd(), 'supabase', 'seed.sql')

console.log('🌱 Workhub Database Seeder')
console.log('====================================')

if (!fs.existsSync(seedSqlPath)) {
  console.error('❌ File supabase/seed.sql not found!')
  process.exit(1)
}

const seedSql = fs.readFileSync(seedSqlPath, 'utf8')
console.log(`📄 Loaded supabase/seed.sql (${seedSql.length} bytes)`)

console.log('📊 Seed Data Plan:')
console.log('   - Teams: 3 (Aegis, Sentinel, Management)')
console.log('   - Profiles: 15 (BSA Tech Division)')
console.log('     • Management: 1 (Yoga Segara [leader])')
console.log('     • Aegis: 9 (2 leaders + 7 members)')
console.log('     • Sentinel: 5 (2 leaders + 3 members)')
console.log('   - Auth: 15 users (email @bsa.id, password: Password123!)')
console.log('   - Milestones: 3 (Q4 2026 Platform, Q4 2026 Cloud Resilience, Q1 2027 Automation)')
console.log('   - Projects: 5 (Across Aegis & Sentinel)')
console.log('   - Board Columns: 20 (4 columns per project)')
console.log('   - Tasks: 31 (All future due dates: Oct - Dec 2026)')
console.log('   - Task Comments, Dependencies & Activity Logs included')
console.log('====================================')

// If Supabase credentials exist, verify connection and test query
if (supabaseUrl && supabaseKey) {
  console.log(`🔗 Connecting to Supabase: ${supabaseUrl}`)
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { error } = await supabase.from('teams').select('*', { count: 'exact', head: true })
    if (error) {
      console.warn('⚠️  Could not query teams table:', error.message)
    } else {
      console.log('✅ Supabase connection verified successfully!')
    }
  } catch (err) {
    console.warn('⚠️  Connection check notice:', err.message)
  }
}

console.log('\n💡 Cara Menjalankan Seed:')
console.log('1. [Supabase Cloud]: Buka Dashboard > SQL Editor > Paste isi file `supabase/seed.sql` > Run.')
console.log('2. [Supabase CLI]: Jalankan `pnpm dlx supabase db reset` untuk migrasi ulang + auto-seed.')
console.log('====================================\n')
