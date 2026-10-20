FROM node:24-alpine AS build
WORKDIR /src
COPY server/webops/networkGuard.ts server/webops/phase3GatewayPolicy.ts server/webops/pinnedHttpsTransport.ts server/webops/
COPY infra/webops/runtime/build.mjs infra/webops/runtime/build.mjs
RUN node infra/webops/runtime/build.mjs

FROM node:24-alpine
RUN apk add --no-cache curl ca-certificates
WORKDIR /app
COPY --from=build /src/infra/webops/runtime/generated ./generated
COPY infra/webops/runtime/gateway.mjs infra/webops/runtime/check.mjs ./
COPY infra/webops/runtime/monitor.mjs infra/webops/runtime/gateway-client.mjs infra/webops/runtime/monitor-cli.mjs ./
RUN printf '#!/bin/sh\nexec node /app/check.mjs "$@"\n' > /app/webops-gateway-check && chmod 755 /app/webops-gateway-check
USER 1000:1000
CMD ["node", "/app/gateway.mjs"]

