-- Product image gallery with public reads and inventory-only writes.

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_sort_idx
  ON public.product_images (product_id, sort_order, created_at);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;

DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
CREATE POLICY "Anyone can view product images"
  ON public.product_images
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Inventory can add product images" ON public.product_images;
CREATE POLICY "Inventory can add product images"
  ON public.product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.current_user_role()) IN ('admin', 'stocker')
  );

DROP POLICY IF EXISTS "Inventory can update product images" ON public.product_images;
CREATE POLICY "Inventory can update product images"
  ON public.product_images
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.current_user_role()) IN ('admin', 'stocker'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'stocker'));

DROP POLICY IF EXISTS "Inventory can delete product images" ON public.product_images;
CREATE POLICY "Inventory can delete product images"
  ON public.product_images
  FOR DELETE
  TO authenticated
  USING ((SELECT public.current_user_role()) IN ('admin', 'stocker'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pharmacy-product-images',
  'pharmacy-product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view pharmacy product images" ON storage.objects;
CREATE POLICY "Public can view pharmacy product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pharmacy-product-images');

DROP POLICY IF EXISTS "Inventory can upload pharmacy product images" ON storage.objects;
CREATE POLICY "Inventory can upload pharmacy product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pharmacy-product-images'
    AND (SELECT public.current_user_role()) IN ('admin', 'stocker')
  );

DROP POLICY IF EXISTS "Inventory can update pharmacy product images" ON storage.objects;
CREATE POLICY "Inventory can update pharmacy product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pharmacy-product-images'
    AND (SELECT public.current_user_role()) IN ('admin', 'stocker')
  )
  WITH CHECK (
    bucket_id = 'pharmacy-product-images'
    AND (SELECT public.current_user_role()) IN ('admin', 'stocker')
  );

DROP POLICY IF EXISTS "Inventory can delete pharmacy product images" ON storage.objects;
CREATE POLICY "Inventory can delete pharmacy product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pharmacy-product-images'
    AND (SELECT public.current_user_role()) IN ('admin', 'stocker')
  );

-- Preserve legacy product images as the first item in the gallery.
INSERT INTO public.product_images (product_id, image_url, sort_order)
SELECT id, image_url, 0
FROM public.products
WHERE image_url IS NOT NULL
  AND btrim(image_url) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_images AS existing
    WHERE existing.product_id = products.id
      AND existing.image_url = products.image_url
  );
