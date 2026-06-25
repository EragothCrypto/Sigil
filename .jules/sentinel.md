## 2024-05-18 - [Security headers added to express]
**Vulnerability:** Missing standard security headers on express instance.
**Learning:** Adding helmet package is essential to express based setups as they will apply a group of standard headers for application security, like the X-Frame-Options or Content-Security-Policy headers which helps mitigate common web vulnerabilities.
**Prevention:** Make sure helmet is added to new express instances upon setup.
