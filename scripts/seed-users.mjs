/**
 * seed-users.mjs
 * Crea los usuarios de prueba (admin, cajero, inventario) en Supabase
 * y asigna sus roles en la tabla `profiles`.
 *
 * Uso:
 *   node scripts/seed-users.mjs <SERVICE_ROLE_KEY>
 */

const SUPABASE_URL = 'https://uiedqhteoduvtnluvmbs.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('❌  Falta la Service Role Key.');
  console.error('   Uso: node scripts/seed-users.mjs <SERVICE_ROLE_KEY>');
  console.error('   Encuéntrala en: https://supabase.com/dashboard → Settings → API → service_role');
  process.exit(1);
}

const USERS = [
  {
    email: 'admin@gmail.com',
    password: 'Admin1234!',
    full_name: 'Administrador',
    role: 'admin',
  },
  {
    email: 'cajero@gmail.com',
    password: 'Cajero1234!',
    full_name: 'Cajero Principal',
    role: 'cashier',
  },
  {
    email: 'inventario@gmail.com',
    password: 'Inventario1234!',
    full_name: 'Encargado de Inventario',
    role: 'stocker',
  },
];

async function createUser(user) {
  const label = `${user.email} (${user.role})`;

  // 1. Crear el usuario en auth.users
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,      // confirmar el email automáticamente
      user_metadata: { full_name: user.full_name },
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    // Si el usuario ya existe, intentamos obtener su ID
    if (createData.msg?.includes('already been registered') || createData.code === 'email_exists') {
      console.log(`⚠️  ${label} ya existe — actualizando perfil...`);
      // Buscar el usuario existente
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(user.email)}`, {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const listData = await listRes.json();
      const existingUser = listData.users?.find(u => u.email === user.email);
      if (existingUser) {
        await upsertProfile(existingUser.id, user);
        console.log(`✅  ${label} — perfil actualizado.`);
      }
      return;
    }
    console.error(`❌  Error creando ${label}:`, JSON.stringify(createData));
    return;
  }

  const userId = createData.id;
  console.log(`✅  Usuario creado: ${label} — ID: ${userId}`);

  // 2. Insertar / actualizar el perfil con el rol correcto
  await upsertProfile(userId, user);
}

async function upsertProfile(userId, user) {
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: userId,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: true,
    }),
  });

  if (!profileRes.ok) {
    const err = await profileRes.json();
    console.error(`   ❌ Error en perfil de ${user.email}:`, JSON.stringify(err));
  } else {
    console.log(`   ✅ Perfil de ${user.email} → rol: ${user.role}`);
  }
}

console.log('🚀 Iniciando creación de usuarios de prueba...\n');
for (const user of USERS) {
  await createUser(user);
}

console.log('\n🎉 Listo! Credenciales de prueba:');
console.log('─────────────────────────────────────────');
console.log('👑 Admin      → admin@gmail.com       / Admin1234!');
console.log('💰 Cajero     → cajero@gmail.com      / Cajero1234!');
console.log('📦 Inventario → inventario@gmail.com  / Inventario1234!');
console.log('─────────────────────────────────────────');
