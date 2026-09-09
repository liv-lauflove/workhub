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
console.log('   - Teams: 2 (Aegis, Sentinel)')
console.log('   - Profiles: 2 (Kak Rani [leader], Bima [member])')
console.log('   - Milestones: 1 (Q1 2026 Core Platform Delivery)')
console.log('   - Projects: 2 (Workhub Web App MVP, API & Analytics)')
console.log('   - Kanban Columns: 8 (4 columns per project)')
console.log('   - Tasks: 10 (Varied: To Do, In Progress, Done)')
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
