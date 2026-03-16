Write-Host "Waiting for Ollama container to be ready..."

while ($true) {
    try {
        docker exec nodejs-rag-ollama ollama list | Out-Null
        Write-Host "Ollama is ready"
        break
    }
    catch {
        Write-Host "Ollama not available yet, retrying..."
        Start-Sleep -Seconds 2
    }
}

$MODELS = @("qwen3.5:0.8b", "nomic-embed-text:v1.5")

foreach ($MODEL in $MODELS) {
    Write-Host "Pulling model: $MODEL"
    while ($true) {
        try {
            docker exec nodejs-rag-ollama ollama pull $MODEL
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Model $MODEL downloaded successfully"
                break
            }
            else {
                Write-Host "Error pulling model $MODEL, retrying..."
                Start-Sleep -Seconds 5
            }
        }
        catch {
            Write-Host "Error pulling model $MODEL, retrying..."
            Start-Sleep -Seconds 5
        }
    }
}

Write-Host "Initialization completed"
