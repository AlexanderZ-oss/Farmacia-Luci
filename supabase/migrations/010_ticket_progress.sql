-- Flujo de tickets en 3 estados para la barra de progreso del admin:
--   Inicio (open) -> En proceso (in_progress) -> Finalizado (resolved)
-- Solo el admin gestiona el estado; cada usuario (cliente, cajero, inventario)
-- crea tickets y ve los suyos.

-- 1) Migrar el CHECK de estados a los 3 soportados.
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_status_check;

-- 2) Mapear estados heredados al nuevo flujo.
UPDATE public.support_tickets SET status = 'resolved' WHERE status = 'closed';
UPDATE public.support_tickets SET status = 'open' WHERE status NOT IN ('open', 'in_progress', 'resolved');

-- 3) Nueva restricción.
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'in_progress', 'resolved'));

-- 4) El estado por defecto es 'open' (Inicio).
ALTER TABLE public.support_tickets
  ALTER COLUMN status SET DEFAULT 'open';

-- 5) Fecha de resolución (se completa cuando pasa a Finalizado).
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
