#!/bin/bash
# Step 1 Validation Script
# Tests health and version endpoints

echo "🧪 Testing Fantasy OS SHMUP Backend - Step 1"
echo "=============================================="
echo ""

# Check if server is running
echo "📡 Testing /health endpoint..."
HEALTH=$(curl -s http://localhost:5006/health)
echo "Response: $HEALTH"

if echo "$HEALTH" | grep -q '"ok": true'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

echo ""
echo "📋 Testing /api/version endpoint..."
VERSION=$(curl -s http://localhost:5006/api/version)
echo "Response: $VERSION"

if echo "$VERSION" | grep -q '"service": "fantasy-os-shmup"'; then
    echo "✅ Version check passed"
else
    echo "❌ Version check failed"
    exit 1
fi

echo ""
echo "🎉 All Step 1 validations passed!"
echo ""
echo "Next steps:"
echo "1. Verify the output above matches expected responses"
echo "2. Check that CORS headers are present (use browser DevTools)"
echo "3. Proceed to Step 2 (JSON Schema & Validation)"
