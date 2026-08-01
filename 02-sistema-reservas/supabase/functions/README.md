# Supabase Edge Functions (PayPal)

Funciones incluidas:
- create-reservation: crea una reserva desde la web publica.
- register-customer: registro manual de cliente por email y contrasena.
- create-paypal-order: crea una orden en PayPal a partir de una reserva.
- capture-paypal-order: captura el pago de una orden de PayPal.
- paypal-webhook: procesa eventos de PayPal y actualiza pagos/reservas.
- reservation-status: consulta estado de reserva por codigo+email o token cliente.
- manage-reservation: cancelacion/reprogramacion con reglas de tiempo y cupo.

Nota:
- create-reservation intenta crear automaticamente la cuenta del cliente en Auth usando el email de la reserva.
- La reserva queda vinculada por customer_auth_user_id cuando la cuenta se crea correctamente.
- create-reservation ahora soporta extras, impuestos, comision, descuento y deposito.
- create-paypal-order permite pago parcial (deposito o monto custom) y pago total.

## Variables requeridas
Configura estas variables en Supabase:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- PAYPAL_ENV (sandbox|live)
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- PAYPAL_WEBHOOK_ID

## Despliegue (CLI)
1. supabase login
2. supabase link --project-ref TU_PROJECT_REF
3. supabase functions deploy create-reservation --no-verify-jwt
4. supabase functions deploy register-customer --no-verify-jwt
5. supabase functions deploy create-paypal-order --no-verify-jwt
6. supabase functions deploy capture-paypal-order --no-verify-jwt
7. supabase functions deploy paypal-webhook --no-verify-jwt
8. supabase functions deploy reservation-status --no-verify-jwt
9. supabase functions deploy manage-reservation --no-verify-jwt

## Flujo E2E recomendado
1. Checkout publica llama create-reservation.
2. Front llama create-paypal-order para deposito o total.
3. Cliente aprueba pago en PayPal.
4. Front llama capture-paypal-order al retorno.
5. Webhook paypal-webhook confirma estados finales.
6. Cliente consulta estado en reservation-status y puede cancelar/reprogramar con manage-reservation.

## Seguridad recomendada
- Restringe CORS a tu dominio final.
- Protege create-paypal-order y capture-paypal-order con JWT de sesión o token firmado.
- Usa PAYPAL_ENV=live solo en producción.
