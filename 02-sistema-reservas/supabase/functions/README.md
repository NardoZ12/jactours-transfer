# Supabase Edge Functions (PayPal)

Funciones incluidas:
- create-reservation: crea una reserva desde la web publica.
- register-customer: registro manual de cliente por email y contrasena.
- create-paypal-order: crea una orden en PayPal a partir de una reserva.
- capture-paypal-order: captura el pago de una orden de PayPal.
- paypal-webhook: procesa eventos de PayPal y actualiza pagos/reservas.

Nota:
- create-reservation intenta crear automaticamente la cuenta del cliente en Auth usando el email de la reserva.
- La reserva queda vinculada por customer_auth_user_id cuando la cuenta se crea correctamente.

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

## Seguridad recomendada
- Restringe CORS a tu dominio final.
- Protege create-paypal-order y capture-paypal-order con JWT de sesión o token firmado.
- Usa PAYPAL_ENV=live solo en producción.
