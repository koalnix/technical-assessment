#!/bin/sh
set -e

npx hardhat node --hostname 0.0.0.0 &
NODE_PID=$!

echo "Waiting for the local Hardhat chain to accept connections..."
until node -e "require('net').createConnection(8545,'127.0.0.1').on('connect',function(){process.exit(0)}).on('error',function(){process.exit(1)})" 2>/dev/null; do
  sleep 1
done

echo "Deploying CertificateRegistry to the local chain..."
npx hardhat run scripts/deploy.js --network localhost

wait "$NODE_PID"
