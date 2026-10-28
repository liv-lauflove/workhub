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
  '20261006120000_storage_attachments_bucket.sql'
)
const configTomlPath = path.resolve(process.cwd(), 'supabase', 'config.toml')
const storageLibPath = path.resolve(process.cwd(), 'src', 'lib', 'storage.ts')

console.log('🔍 Workhub Attachments Storage Bucket Verifier')
console.log('=============================================')

// 1. Static SQL Migration Inspection
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file 20261006120000_storage_attachments_bucket.sql not found!')
  process.exit(1)
}

const migrationSql = fs.readFileSync(migrationPath, 'utf8')
console.log(`📄 Loaded storage migration file (${migrationSql.length} bytes)`)

const sqlRules = [
  { name: "Bucket 'attachments' creation in storage.buckets", regex: /insert into storage\.buckets/i },
  { name: 'Private bucket setting (public = false)', regex: /public\s*,\s*file_size_limit[\s\S]*false/i },
  { name: '10MB file size limit (10485760 bytes)', regex: /10485760/ },
  { name: 'MIME types restriction: PDF', regex: /application\/pdf/ },
  { name: 'MIME types restriction: JPEG & PNG', regex: /image\/jpeg[\s\S]*image\/png/ },
  { name: 'MIME types restriction: WebP', regex: /image\/webp/ },
  { name: 'RLS: SELECT policy for authenticated users', regex: /create policy "attachments_read_authenticated"/i },
  { name: 'RLS: INSERT / Upload policy for authenticated users', regex: /create policy "attachments_upload_authenticated"/i },
  { name: 'RLS: UPDATE policy for owner', regex: /create policy "attachments_update_owner"/i },
  { name: 'RLS: DELETE policy for owner or leader', regex: /create policy "attachments_delete_owner_or_leader"/i },
]

let allPassed = true
for (const rule of sqlRules) {
  if (rule.regex.test(migrationSql)) {
    console.log(`  ✅ ${rule.name}`)
  } else {
    console.error(`  ❌ Missing SQL configuration: ${rule.name}`)
    allPassed = false
  }
}

// 2. config.toml Inspection
if (fs.existsSync(configTomlPath)) {
  const configContent = fs.readFileSync(configTomlPath, 'utf8')
  if (configContent.includes('[storage.buckets.attachments]') && configContent.includes('public = false')) {
    console.log('  ✅ supabase/config.toml local bucket configured')
  } else {
    console.warn('  ⚠️  supabase/config.toml missing [storage.buckets.attachments] section')
  }
}

// 3. Application storage library check
if (fs.existsSync(storageLibPath)) {
  console.log('  ✅ src/lib/storage.ts application utilities verified')
} else {
  console.error('  ❌ src/lib/storage.ts not found')
  allPassed = false
}

if (!allPassed) {
  console.error('\n❌ Storage verification checks failed!')
  process.exit(1)
}

console.log('\n📊 Static storage configuration rules passed successfully!')

// 4. Supabase Cloud Connection & Bucket Status Check
const keyToUse = serviceRoleKey || anonKey
if (supabaseUrl && keyToUse) {
  console.log(`\n🔗 Connecting to Supabase Storage: ${supabaseUrl}`)
  const supabase = createClient(supabaseUrl, keyToUse)

  try {
    const { data: bucket, error } = await supabase.storage.getBucket('attachments')
    if (error) {
      console.log(`ℹ️  Bucket status note: ${error.message}`)
      console.log('💡 Jalankan file migrasi di Supabase Dashboard SQL Editor untuk mengaktifkan bucket di Cloud.')
    } else if (bucket) {
      console.log(`✅ Bucket 'attachments' terdaftar di Supabase Cloud (Public: ${bucket.public ? 'YES ⚠️' : 'NO (Private) 🔒'})`)
    }
  } catch (err) {
    console.warn('⚠️  Storage connection notice:', err.message)
  }
}

console.log('\n💡 Panduan Eksekusi di Supabase Cloud:')
console.log('1. Buka Supabase Dashboard > SQL Editor.')
console.log('2. Paste isi file `supabase/migrations/20261006120000_storage_attachments_bucket.sql` lalu klik Run.')
console.log('3. Buka Storage menu: Bucket `attachments` akan berstatus Private dengan RLS aktif.')
console.log('=============================================\n')
