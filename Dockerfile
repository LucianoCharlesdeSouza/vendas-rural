################################################################################
# Vendas Rural - Node Development Image
# Node Development Image (Vite / Vue 3)
################################################################################

FROM node:24-bookworm

LABEL org.opencontainers.image.title="Vendas Rural - Node Development Image"
LABEL org.opencontainers.image.description="Node Development Image"
LABEL org.opencontainers.image.vendor="Vendas Rural - Node Development Image"
LABEL org.opencontainers.image.licenses="MIT"

ARG UID=1000
ARG GID=1000
ARG USER_NAME=app

WORKDIR /app

RUN if getent passwd "${UID}" > /dev/null; then \
    userdel -r "$(getent passwd "${UID}" | cut -d: -f1)" 2>/dev/null || true; \
    fi \
    && if getent group "${GID}" > /dev/null; then \
    groupdel "$(getent group "${GID}" | cut -d: -f1)" 2>/dev/null || true; \
    fi \
    && groupadd --gid "${GID}" "${USER_NAME}" \
    && useradd \
    --uid "${UID}" \
    --gid "${GID}" \
    --create-home \
    --shell /bin/bash \
    "${USER_NAME}" \
    && mkdir -p /app \
    && chown -R "${USER_NAME}:${USER_NAME}" /app

USER ${USER_NAME}

EXPOSE 5173

