set -o allexport

if [ -f "../.env.local-secrets" ]; then
    source ../.env.local-secrets
fi

set +o allexport
