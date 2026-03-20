#!/bin/bash
set -e

echo "Starting initialization..."

echo "Waiting for MongoDB to be ready..."
until docker exec nodejs-rag-mongo mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; do
    echo "MongoDB not available yet, retrying..."
    sleep 2
done
echo "MongoDB is ready"

echo "Creating MongoDB collections and indexes..."

docker exec -i nodejs-rag-mongo mongosh --quiet << 'EOF'
const db = db.getSiblingDB('nodejs_rag');

const collections = [
    'sessions',
    'interactions',
    'documents',
    'humidityEvents',
    'temperatureEvents'
];

collections.forEach(name => {
    if (!db.getCollectionNames().includes(name)) {
        db.createCollection(name);
        print('Created collection: ' + name);
    }
});

['humidityEvents', 'temperatureEvents'].forEach(name => {
    db[name].createIndex({ receivedAt: -1 });
    print('Created index receivedAt on ' + name);
});

db.interactions.createIndex({ sessionId: 1 });
print('Created index sessionId on interactions');

print('MongoDB initialization completed');
EOF

if [ $? -eq 0 ]; then
    echo "MongoDB collections and indexes created successfully"
else
    echo "Warning: MongoDB initialization may have failed, continuing..."
fi

echo "Waiting for Ollama container to be ready..."
until docker exec nodejs-rag-ollama ollama list > /dev/null 2>&1; do
    echo "Ollama not available yet, retrying..."
    sleep 2
done
echo "Ollama is ready"

MODELS=("mxbai-embed-large" "phi4-mini:3.8b")

for MODEL in "${MODELS[@]}"; do
    echo "Pulling model: $MODEL"
    until docker exec nodejs-rag-ollama ollama pull "$MODEL"; do
        echo "Error pulling model $MODEL, retrying in 5 seconds..."
        sleep 5
    done
    echo "Model $MODEL downloaded successfully"
done

echo "============================================"
echo "Initialization completed successfully!"
echo "MongoDB collections and indexes created"
echo "Ollama models downloaded"
echo "============================================"
