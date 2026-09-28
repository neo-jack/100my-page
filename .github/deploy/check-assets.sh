#!/bin/sh
# Runs inside the newly started Nginx container before the previous one is removed.
set -eu
for retired_path in \
    /textures/doors/door_left_sketch.webp \
    /textures/about/reactduzybalon.webp \
    /textures/clouds/254b8ec8-d6f7-4275-956f-7bab65b2ce2d.webp \
    /sounds/szumwiatru.mp3 \
    /fonts/TikTokSans.ttf \
    /bgm.mp3 \
    /icon.svg; do
    # BusyBox wget exits on 404 before reading Cache-Control. curl dumps the
    # complete response headers; do not use --fail for an expected HTTP error.
    if ! headers=$(curl --silent --show-error --noproxy '*' --connect-timeout 2 --max-time 5 \
        --dump-header - --output /dev/null "http://127.0.0.1${retired_path}"); then
        echo "Unable to check retired asset: ${retired_path}" >&2
        exit 1
    fi
    status=$(printf '%s\n' "$headers" | awk '
        $1 ~ /^HTTP\/[0-9.]+$/ && $2 ~ /^[0-9][0-9][0-9]$/ {code=$2}
        END {print code}
    ')
    no_store=$(printf '%s\n' "$headers" | awk '
        $1 ~ /^HTTP\/[0-9.]+$/ && $2 ~ /^[0-9][0-9][0-9]$/ {found=0; next}
        tolower($0) ~ /^cache-control[[:space:]]*:/ {
            sub(/^[^:]*:[[:space:]]*/, "")
            count=split(tolower($0), directives, ",")
            for (i=1; i<=count; i++) {
                if (directives[i] ~ /^[[:space:]]*no-store[[:space:]]*$/) found=1
            }
        }
        END {print found ? "yes" : "no"}
    ')
    if [ "$status" != 404 ] || [ "$no_store" != yes ]; then
        echo "Retired asset is not blocked without caching: ${retired_path} (HTTP ${status:-unknown}; Cache-Control no-store: ${no_store})" >&2
        exit 1
    fi
done
printf '%s\n' 'Retired media routes return 404/no-store.'
