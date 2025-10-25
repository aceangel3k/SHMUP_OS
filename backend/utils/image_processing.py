"""
Image processing utilities for sprite transparency
"""
from PIL import Image
from io import BytesIO
import numpy as np
import base64


def remove_solid_background(base64_image: str, tolerance: int = 35) -> str:
    """
    Remove green screen (#00FF00) from sprites and make it transparent.
    Targets the specific green color globally, including within the sprite.
    
    Args:
        base64_image: Base64 encoded image string (with or without data URL prefix)
        tolerance: Color difference tolerance for green detection (0-255)
        
    Returns:
        Base64 encoded PNG with transparent background
    """
    try:
        # Decode base64 to image
        if base64_image.startswith('data:'):
            base64_data = base64_image.split(',', 1)[1]
        else:
            base64_data = base64_image
        
        image_bytes = base64.b64decode(base64_data)
        img = Image.open(BytesIO(image_bytes))
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Get image data as numpy array
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Sample background color from edges (top, bottom, left, right)
        # Take multiple samples and find the most common greenish color
        edge_samples = []
        
        # Top edge
        edge_samples.extend(data[0, :, :3])
        # Bottom edge
        edge_samples.extend(data[height-1, :, :3])
        # Left edge
        edge_samples.extend(data[:, 0, :3])
        # Right edge
        edge_samples.extend(data[:, width-1, :3])
        
        edge_samples = np.array(edge_samples)
        
        # Filter for greenish pixels (G channel > 150 and G > R and G > B)
        greenish_mask = (edge_samples[:, 1] > 150) & \
                       (edge_samples[:, 1] > edge_samples[:, 0]) & \
                       (edge_samples[:, 1] > edge_samples[:, 2])
        
        greenish_pixels = edge_samples[greenish_mask]
        
        if len(greenish_pixels) > 0:
            # Use the median of greenish pixels as the background color
            bg_color = np.median(greenish_pixels, axis=0).astype(int)
            print(f"  → Detected background color from {len(greenish_pixels)} edge samples: RGB({bg_color[0]}, {bg_color[1]}, {bg_color[2]})")
        else:
            # Fallback to most common edge color
            bg_color = np.median(edge_samples, axis=0).astype(int)
            print(f"  → No strong green detected, using median edge color: RGB({bg_color[0]}, {bg_color[1]}, {bg_color[2]})")
        
        # Calculate color distance from background color for each pixel
        # Using Euclidean distance in RGB space
        r_diff = data[:, :, 0].astype(int) - int(bg_color[0])
        g_diff = data[:, :, 1].astype(int) - int(bg_color[1])
        b_diff = data[:, :, 2].astype(int) - int(bg_color[2])
        
        color_distance = np.sqrt(r_diff**2 + g_diff**2 + b_diff**2)
        
        # Create mask for pixels close to background color
        green_mask = color_distance <= tolerance
        
        # Debug: Count green pixels
        green_pixel_count = np.sum(green_mask)
        total_pixels = green_mask.size
        print(f"  → Found {green_pixel_count} green pixels out of {total_pixels} ({green_pixel_count/total_pixels*100:.1f}%)")
        
        # Make all green pixels transparent
        data[green_mask, 3] = 0  # Set alpha to 0 for all green pixels
        
        # Optional: Feather edges slightly for smoother transparency
        # For pixels just outside tolerance, apply partial transparency
        feather_tolerance = tolerance + 10
        feather_mask = (color_distance > tolerance) & (color_distance <= feather_tolerance)
        if np.any(feather_mask):
            # Gradual transparency based on distance
            feather_alpha = ((color_distance[feather_mask] - tolerance) / 10 * 255).astype(np.uint8)
            data[feather_mask, 3] = np.minimum(data[feather_mask, 3], feather_alpha)
        
        # Create new image with transparency
        result_img = Image.fromarray(data, 'RGBA')
        
        # Convert back to base64
        buffer = BytesIO()
        result_img.save(buffer, format='PNG')
        result_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/png;base64,{result_base64}"
        
    except Exception as e:
        print(f"Error removing background: {e}")
        # Return original image if processing fails
        return base64_image
