# Sistema de Reservas - Supabase + PayPal + Panel Web

Este paquete agrega la base operativa para Dominican Breeze:
- Base de datos de reservas, pagos y gastos.
- Webhooks y endpoints de PayPal en Supabase Functions.
- Panel web administrativo inicial.

Actualizado para Jac Tours & Transfer con:
- Flujo E2E de reserva con extras, impuestos, descuentos y deposito.
- Consulta de estado de reserva para cliente.
- Cancelacion/reprogramacion con reglas.
- Cupo por slot (fecha/hora) para evitar sobreventa.
- Modulos base de back office (reservas, calendario, finanzas/reportes).

## Estructura
- supabase/migrations/20260728_init.sql
- supabase/migrations/20260728_customer_accounts.sql
- supabase/migrations/20260731_reservas_e2e.sql
- supabase/migrations/20260804_staff_admin_setup.sql
- supabase/functions/create-reservation/index.ts
- supabase/functions/register-customer/index.ts
- supabase/functions/create-paypal-order/index.ts
- supabase/functions/capture-paypal-order/index.ts
- supabase/functions/paypal-webhook/index.ts
- supabase/functions/reservation-status/index.ts
- supabase/functions/manage-reservation/index.ts
- panelweb/index.html
- panelweb/cliente-registro.html
- panelweb/main.js
- panelweb/styles.css
- panelweb/reservas.html
- panelweb/calendario-operativo.html
- panelweb/ingresos-gastos-reportes.html
- panelweb/modules.js

## Paso 1: Crear proyecto Supabase
1. Crea un proyecto en Supabase.
2. Ejecuta la migracion SQL completa en SQL Editor:
   - supabase/migrations/20260728_init.sql
   - supabase/migrations/20260728_customer_accounts.sql
   - supabase/migrations/20260731_reservas_e2e.sql
   - supabase/migrations/20260804_staff_admin_setup.sql
3. Crea al menos un usuario admin en auth.users.
4. Asigna su rol de backoffice con la funcion helper.

Ejemplo:
select public.grant_staff_role_by_email(
  'admin@jactourspuntacana.com',
  'admin',
  'Administrador Jac Tours'
);

## Paso 2: Crear servicios iniciales
insert into public.services (slug, title, category, base_price, currency)
values
  ('traslado-aeropuerto-hoteles', 'Traslado Aeropuerto - Hotel', 'traslado', 35, 'USD'),
  ('isla-saona-vip', 'Isla Saona VIP', 'excursion', 95, 'USD'),
  ('yate-tiara-50', 'Yate Tiara 50', 'yate', 1200, 'USD');

## Paso 3: Configurar PayPal
1. Crea app de PayPal (sandbox inicialmente).
2. Copia CLIENT_ID y CLIENT_SECRET.
3. Crea webhook apuntando a:
   https://TU_PROYECTO.functions.supabase.co/paypal-webhook
4. Guarda PAYPAL_WEBHOOK_ID.

## Paso 4: Variables de entorno
Usa .env.example como referencia y carga variables en Supabase.

## Paso 5: Deploy de Functions
Sigue las instrucciones en supabase/functions/README.md

## Paso 6: Panel Web
1. Abre panelweb/index.html en un servidor estático local o hosting.
2. En panelweb/main.js reemplaza:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
3. Inicia sesión con usuario de Supabase Auth.
4. Si quieres registro manual de clientes, publica tambien panelweb/cliente-registro.html y ajusta SUPABASE_FUNCTIONS_BASE en panelweb/cliente-registro.js

## Paso 7: Integrar web pública con PayPal
Flujo recomendado:
1. El formulario público crea la reserva llamando a create-reservation.
   - create-reservation intenta crear automaticamente la cuenta del cliente con su email.
2. Se llama create-paypal-order con reservationId.
3. El cliente aprueba pago en PayPal.
4. Se llama capture-paypal-order al volver del checkout.
5. Webhook confirma el estado final.

## Pendientes recomendados para producción
- Validar inventario/cupos por fecha.
- Enviar correos/WhatsApp de confirmación.
- Agregar cancelación/reprogramación.
- Registrar costos automáticos por tipo de servicio.
- Agregar filtros y exportación CSV en panel.
