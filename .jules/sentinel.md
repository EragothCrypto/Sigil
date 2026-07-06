## 2024-05-18 - [Security headers added to express]
**Vulnerability:** Missing standard security headers on express instance.
**Learning:** Adding helmet package is essential to express based setups as they will apply a group of standard headers for application security, like the X-Frame-Options or Content-Security-Policy headers which helps mitigate common web vulnerabilities.
**Prevention:** Make sure helmet is added to new express instances upon setup.

## 2024-05-18 - [Fix rate limit bypass via spoofed X-Forwarded-For]
**Vulnerability:** The API server's rate limiter used a custom `clientKey` function that manually parsed the `x-forwarded-for` header to get the client IP. An attacker could spoof this header, sending a different fake IP on every request, completely bypassing the rate limit.
**Learning:** When using Express behind a reverse proxy, you should set `app.set("trust proxy", 1)` and then rely on Express's built-in `req.ip` to securely get the true client IP. Express handles parsing the `X-Forwarded-For` header correctly based on the trusted proxy configuration, stripping spoofed IPs added by the client.
**Prevention:** Never manually parse `x-forwarded-for` for security controls like rate limiting or IP allowlisting. Always configure the framework's proxy trust settings (e.g. `trust proxy` in Express) and use the framework-provided `req.ip` property.
