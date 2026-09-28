FROM nginx:stable-alpine

# The official Alpine image includes curl; fail the build if that changes.
RUN curl --version > /dev/null

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/
COPY check-assets.sh /usr/local/bin/check-assets.sh

EXPOSE 80

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

# Configuration is complete at build time. The upstream entrypoint invokes
# apk manifest during startup, which can block on package mirrors on this host.
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
