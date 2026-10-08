import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'cashier') throw new Error('Forbidden: solo cajeros');

    const { items, payment_method, age_verification_id } = await req.json();
    if (!items || items.length === 0) throw new Error('No hay ítems en la venta');

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let totalAmount = 0;
    const saleItems: any[] = [];

    for (const item of items) {
      const { data: product, error } = await serviceClient
        .from('products').select('id, price, stock, name').eq('id', item.product_id).single();
      if (error || !product) throw new Error(`Producto ${item.product_id} no encontrado`);
      if (product.stock < item.quantity) throw new Error(`Stock insuficiente para ${product.name}`);

      saleItems.push({ product_id: product.id, quantity: item.quantity, unit_price: product.price });
      totalAmount += product.price * item.quantity;
    }

    const { data: rpcRes, error: rpcError } = await serviceClient.rpc('create_sale_transaction', {
      p_cashier_id: user.id,
      p_total_amount: totalAmount,
      p_payment_method: payment_method,
      p_age_verification_id: age_verification_id || null,
      p_items: saleItems,
    });
    if (rpcError) throw rpcError;

    return new Response(JSON.stringify({ success: true, sale_id: rpcRes.sale_id, total: totalAmount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
