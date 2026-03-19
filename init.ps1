Write-Host "Starting initialization..."

Write-Host "Waiting for MongoDB to be ready..."
$mongoReady = $false
while (-not $mongoReady) {
    docker exec nodejs-rag-mongo mongosh --eval "db.adminCommand('ping')" --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $mongoReady = $true
        Write-Host "MongoDB is ready"
    }
    else {
        Write-Host "MongoDB not available yet, retrying..."
        Start-Sleep -Seconds 2
    }
}

Write-Host "Creating MongoDB collections and indexes..."

$mongoScript = @"
const db = db.getSiblingDB('nodejs_rag');

// Collections
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

// Indexes on receivedAt for sorting
['humidityEvents', 'temperatureEvents'].forEach(name => {
    db[name].createIndex({ receivedAt: -1 });
    print('Created index receivedAt on ' + name);
});

// Index on sessionId for interactions
db.interactions.createIndex({ sessionId: 1 });
print('Created index sessionId on interactions');

print('MongoDB initialization completed');
"@

$mongoScript | docker exec -i nodejs-rag-mongo mongosh --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "MongoDB collections and indexes created successfully"
}
else {
    Write-Host "Warning: MongoDB initialization may have failed, continuing..."
}

Write-Host "Waiting for Ollama container to be ready..."
$ollamaReady = $false
while (-not $ollamaReady) {
    docker exec nodejs-rag-ollama ollama list 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        $ollamaReady = $true
        Write-Host "Ollama is ready"
    }
    else {
        Write-Host "Ollama not available yet, retrying..."
        Start-Sleep -Seconds 2
    }
}

$MODELS = @("qwen2.5:1.5b", "qwen3.5:0.8b", "nomic-embed-text:v1.5", "phi4-mini:3.8b")

foreach ($MODEL in $MODELS) {
    Write-Host "Pulling model: $MODEL"
    $modelPulled = $false
    while (-not $modelPulled) {
        docker exec nodejs-rag-ollama ollama pull $MODEL
                
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Model $MODEL downloaded successfully"
            $modelPulled = $true
        }
        else {
            Write-Host "Error pulling model $MODEL, retrying in 5 seconds..."
            Start-Sleep -Seconds 5
        }
    }
}

Write-Host "============================================"
Write-Host "Initialization completed successfully!"
Write-Host "MongoDB collections and indexes created"
Write-Host "Ollama models downloaded"
Write-Host "============================================"