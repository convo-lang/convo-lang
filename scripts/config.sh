set -o allexport

if [ -f "../.env.cdk" ]; then
    source ../.env.cdk
fi

if [ -f "../.env" ]; then
    source ../.env
fi

if [ "$NO_LOCAL" != "1" ]; then
    if [ -f "../.env.local" ]; then
        source ../.env.local
    fi
fi

set +o allexport
