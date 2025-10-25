# Image Cache Directory

This directory stores generated images for preview and persistent caching.

## Structure

```
cache/images/
├── parallax/      # Parallax background layers (2048×512)
├── enemy/         # Enemy sprites (1024×1024)
├── boss/          # Boss sprites (1024×1024)
├── tui_frame/     # TUI frame elements (1024×1024)
└── image/         # Other images
```

## File Naming

Images are cached with SHA256 hash filenames:
- Format: `{hash}.png`
- Hash: SHA256 of `{prompt}|{size}|{model}`

## Cache Benefits

1. **Preview**: View generated images directly in filesystem
2. **Persistence**: Cache survives server restarts
3. **Performance**: Avoid regenerating identical images
4. **Debugging**: Inspect actual generated images

## Cache Management

**View cache stats:**
```python
from services import get_cache_stats
stats = get_cache_stats()
print(stats)
```

**Clear cache:**
```python
from services import clear_cache

# Clear memory cache only
clear_cache()

# Clear both memory and filesystem cache
clear_cache(clear_filesystem=True)
```

## Example

When generating a parallax layer:
1. Check `cache/images/parallax/{hash}.png`
2. If found, load from disk
3. If not found, generate via API and save to disk
4. Return base64 data URI to client

## Notes

- Cache directory is created automatically on service import
- Images are stored as PNG files
- No automatic expiration (manual cleanup required)
- Gitignored to avoid committing large binary files
