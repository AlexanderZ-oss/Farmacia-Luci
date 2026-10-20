import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      throw new Error('Order service is not configured');
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    if (profile.role !== 'customer' || !profile.is_active) throw new Error('Forbidden');

    const body = await req.json();
    const { items, delivery_type, delivery_address, payment_method, age_verification_id } = body;
    const allowedMethods = ['card', 'yape', 'plin'];

    if (!Array.isArray(items) || items.length === 0) throw new Error('Cart is empty');
    if (delivery_type !== 'delivery' || !delivery_address?.street?.trim()) {
      throw new Error('A delivery address is required');
    }
    if (!allowedMethods.includes(payment_method)) throw new Error('Unsupported payment method');

    const normalizedItems = items.map((item: { product_id?: string; quantity?: number }) => {
      if (typeof item.product_id !== 'string' || !item.product_id) throw new Error('Invalid product');
      if (!Number.isInteger(item.quantity) || !item.quantity || item.quantity < 1) {
        throw new Error('Invalid product quantity');
      }
      return { product_id: item.product_id, quantity: item.quantity };
    });
    const productIds = normalizedItems.map((item) => item.product_id);
    if (new Set(productIds).size !== productIds.length) throw new Error('Duplicate cart products');

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: products, error: productsError } = await serviceClient
      .from('products')
      .select('id, price, stock, is_active, requires_age_verification')
      .in('id', productIds);
    if (productsError) throw productsError;
    if (!products || products.length !== normalizedItems.length) throw new Error('A product is unavailable');

    const productById = new Map(products.map((product) => [product.id, product]));
    let subtotal = 0;
    let needsAgeVerification = false;

    for (const item of normalizedItems) {
      const product = productById.get(item.product_id);
      if (!product || !product.is_active) throw new Error('A product is unavailable');
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${item.product_id}`);
      subtotal += Number(product.price) * item.quantity;
      needsAgeVerification ||= product.requires_age_verification;
    }
    // La verificación de edad ya se resolvió en el cliente (checkout.tsx).
    // El servidor registra el id recibido sin volver a validarlo.
    if (needsAgeVerification && age_verification_id) {
      const { data: verification, error: verificationError } = await serviceClient
        .from('age_verifications')
        .select('id')
        .eq('id', age_verification_id)
        .maybeSingle();
      if (verificationError) throw verificationError;
    }

    const shipping = subtotal >= 50 ? 0 : 5;
    const total = Number((subtotal + shipping).toFixed(2));
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        customer_id: user.id,
        status: 'pending',
        total_amount: total,
        payment_method,
        payment_status: 'pending',
        delivery_type,
        delivery_address,
        age_verification_id: age_verification_id || null,
      })
      .select('id')
      .single();
    if (orderError) throw orderError;

    const orderItems = normalizedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: Number(productById.get(item.product_id)!.price),
    }));
    const { error: itemsError } = await serviceClient.from('order_items').insert(orderItems);
    if (itemsError) {
      const { error: rollbackError } = await serviceClient.from('orders').delete().eq('id', order.id);
      if (rollbackError) console.error('Failed to remove incomplete order:', rollbackError.message);
      throw itemsError;
    }

    // Descontar stock por cada ítem del pedido.
    for (const item of normalizedItems) {
      const product = productById.get(item.product_id)!;
      await serviceClient
        .from('products')
        .update({ stock: Number(product.stock) - item.quantity, updated_at: new Date().toISOString() })
        .eq('id', item.product_id);
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      total_amount: total,
      payment_method,
      payment_status: 'pending',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the order';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
