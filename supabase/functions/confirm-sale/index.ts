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

    const { data: profile } = await supabaseClient.from('profiles').select('role, is_active').eq('id', user.id).single();
    if (!profile || profile.role !== 'cashier' || !profile.is_active) throw new Error('Forbidden: solo cajeros activos');

    const {
      items,
      payment_method,
      age_verification_id,
      customer_dni,
      customer_name,
      prescription_number,
    } = await req.json();
    if (!items || items.length === 0) throw new Error('No hay ítems en la venta');

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ¿El carrito incluye algún producto que requiere receta?
    const productIds = Array.from(new Set(items.map((item: any) => item.product_id)));
    const { data: rxProducts, error: rxError } = await serviceClient
      .from('products')
      .select('id, requires_prescription')
      .in('id', productIds);
    if (rxError) throw new Error('No se pudieron validar los productos de la venta');
    const requiresPrescription = (rxProducts ?? []).some((p: any) => p.requires_prescription === true);

    const hasCustomerDni = typeof customer_dni === 'string' && customer_dni.length > 0;
    const hasCustomerName = typeof customer_name === 'string' && customer_name.trim().length > 0;
    const hasPrescription = typeof prescription_number === 'string' && prescription_number.trim().length > 0;

    if (requiresPrescription) {
      // Venta con receta: DNI verificado + nombre + número de receta.
      if (!hasCustomerDni || !hasCustomerName) {
        throw new Error('Este producto requiere receta: registra el DNI y el nombre del cliente');
      }
      if (!/^\d{8}$/.test(customer_dni) || customer_name.trim().length < 3) {
        throw new Error('Consulta el DNI y verifica el nombre antes de emitir la boleta');
      }
      if (!hasPrescription || prescription_number.trim().length < 4) {
        throw new Error('Ingresa el número de receta médica para esta venta');
      }
    } else {
      // Venta simple: solo nombre opcional, sin DNI ni receta.
      if (hasCustomerDni) throw new Error('La venta sin receta no requiere DNI, solo el nombre del cliente');
      if (hasPrescription) throw new Error('La venta no contiene productos que requieran receta');
      if (hasCustomerName && customer_name.trim().length < 3) {
        throw new Error('El nombre del cliente es demasiado corto');
      }
    }

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
      p_items: {
        items: saleItems,
        customer_dni: hasCustomerDni ? customer_dni : null,
        customer_name: hasCustomerName ? customer_name.trim() : null,
        prescription_number: hasPrescription ? prescription_number.trim() : null,
      },
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
