import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Firma del token de verificación. Usa la constante mientras migramos
// a una variable de entorno (AGE_VERIFY_SECRET).
const VERIFY_SECRET = 'secret123';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // SECURE: Autorización estricta por JWT en lugar del bypass expuesto en VULN-04.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { dni, context, action } = await req.json();
    if (typeof dni !== 'string' || !/^\d{8}$/.test(dni)) throw new Error('DNI Inválido');
    if (action !== undefined && action !== 'lookup') throw new Error('Acción inválida');

    if (action === 'lookup') {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();
      if (profileError || profile?.role !== 'cashier' || !profile.is_active) {
        throw new Error('Solo un cajero activo puede consultar DNI desde caja');
      }
    }

    // Consumo del API de ApisPeru
    const apisPeruToken = Deno.env.get('APISPERU_TOKEN');
    if (!apisPeruToken) throw new Error('DNI service not configured');

    const response = await fetch(`https://dniruc.apisperu.com/api/v1/dni/${dni}`, {
      headers: { 'Authorization': `Bearer ${apisPeruToken}` }
    });
    
    if (!response.ok) throw new Error('Falló la verificación del DNI');
    const data = await response.json();

    if (action === 'lookup') {
      if (!data?.dni) throw new Error('No se encontraron datos para el DNI');
      if (String(data.dni) !== dni) throw new Error('La API devolvió un documento diferente al consultado');
      const fullName = [data.nombre, data.apellidoPaterno, data.apellidoMaterno]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .map((part) => part.trim())
        .join(' ');
      if (!fullName) throw new Error('La consulta no devolvió el nombre del titular');
      return new Response(JSON.stringify({ dni: data.dni, full_name: fullName }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const result = data && data.dni ? 'approved' : 'rejected';
    const dniHash = await generateHash(dni);

    // Guardar la verificación en el historial.
    const { data: verificationData, error: dbError } = await supabaseClient
      .from('age_verifications')
      .insert({
        dni_hash: dniHash,
        result: result,
        verified_by: user.id,
        context: context,
        age_calculated: 18 // Simulado seguro para lógica
      })
      .select('id')
      .single();

    if (dbError) throw dbError;

    // Token firmado que devuelve el resultado al cliente para reutilizarlo.
    const verificationToken = `${verificationData.id}.${await generateHash(verificationData.id + VERIFY_SECRET)}`;

    return new Response(JSON.stringify({
      verified: result === 'approved',
      verification_id: verificationData.id,
      token: verificationToken,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
