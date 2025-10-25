#!/usr/bin/env python3
"""
Step 2 Validation Tests
Tests Pydantic schema validation and utility functions
"""
import sys
import copy
from models.game_data import GameData, SAMPLE_GAME_DATA
from utils.validation import (
    validate_game_data,
    validate_partial_game_data,
    get_validation_summary
)


def test_valid_sample_data():
    """Test 1: Validate sample game data"""
    print("🧪 Test 1: Validating sample game data...")
    
    is_valid, game_data, error = validate_game_data(SAMPLE_GAME_DATA)
    
    if not is_valid:
        print(f"❌ FAILED: Sample data validation failed")
        print(f"   Error: {error}")
        return False
    
    print(f"✅ PASSED: Sample data is valid")
    print(f"   Game ID: {game_data.game_id}")
    print(f"   OS Name: {game_data.story.os_name}")
    return True


def test_validation_summary():
    """Test 2: Get validation summary"""
    print("\n🧪 Test 2: Getting validation summary...")
    
    is_valid, game_data, _ = validate_game_data(SAMPLE_GAME_DATA)
    if not is_valid:
        print("❌ FAILED: Cannot get summary from invalid data")
        return False
    
    summary = get_validation_summary(game_data)
    
    expected_keys = [
        'game_id', 'os_name', 'stage_count', 'enemy_count',
        'pattern_count', 'weapon_count', 'pickup_count',
        'total_waves', 'total_boss_phases', 'glyph_bullets'
    ]
    
    for key in expected_keys:
        if key not in summary:
            print(f"❌ FAILED: Missing key '{key}' in summary")
            return False
    
    print(f"✅ PASSED: Summary generated successfully")
    print(f"   Stages: {summary['stage_count']}")
    print(f"   Enemies: {summary['enemy_count']}")
    print(f"   Patterns: {summary['pattern_count']}")
    print(f"   Total Waves: {summary['total_waves']}")
    return True


def test_invalid_palette():
    """Test 3: Reject invalid color palette"""
    print("\n🧪 Test 3: Testing invalid color palette...")
    
    invalid_data = copy.deepcopy(SAMPLE_GAME_DATA)
    invalid_data['story'] = {
        "os_name": "Test",
        "tagline": "Test",
        "palette": {
            "ansi_fg": "not-a-hex-color",  # Invalid
            "ansi_bg": "#06080A",
            "accent": "#8AE6FF"
        }
    }
    
    is_valid, _, error = validate_game_data(invalid_data)
    
    if is_valid:
        print("❌ FAILED: Invalid palette was accepted")
        return False
    
    if "ansi_fg" not in error:
        print(f"❌ FAILED: Error message doesn't mention ansi_fg")
        print(f"   Error: {error}")
        return False
    
    print(f"✅ PASSED: Invalid palette correctly rejected")
    print(f"   Error snippet: {error[:100]}...")
    return True


def test_invalid_wave_formation():
    """Test 4: Reject invalid wave formation"""
    print("\n🧪 Test 4: Testing invalid wave formation...")
    
    invalid_data = copy.deepcopy(SAMPLE_GAME_DATA)
    invalid_data['stages'][0]['waves'][0]['formation'] = 'invalid_formation'
    
    is_valid, _, error = validate_game_data(invalid_data)
    
    if is_valid:
        print("❌ FAILED: Invalid formation was accepted")
        return False
    
    if "formation" not in error.lower():
        print(f"❌ FAILED: Error message doesn't mention formation")
        return False
    
    print(f"✅ PASSED: Invalid formation correctly rejected")
    return True


def test_missing_required_field():
    """Test 5: Reject missing required fields"""
    print("\n🧪 Test 5: Testing missing required field...")
    
    invalid_data = copy.deepcopy(SAMPLE_GAME_DATA)
    del invalid_data['story']['os_name']  # Remove required field
    
    is_valid, _, error = validate_game_data(invalid_data)
    
    if is_valid:
        print("❌ FAILED: Missing required field was accepted")
        return False
    
    if "os_name" not in error:
        print(f"❌ FAILED: Error message doesn't mention os_name")
        return False
    
    print(f"✅ PASSED: Missing required field correctly rejected")
    return True


def test_range_validation():
    """Test 6: Test numeric range validation"""
    print("\n🧪 Test 6: Testing numeric range validation...")
    
    # Test HP out of range
    invalid_data = copy.deepcopy(SAMPLE_GAME_DATA)
    invalid_data['enemies'][0]['hp'] = 10000  # Max is 1000
    
    is_valid, _, error = validate_game_data(invalid_data)
    
    if is_valid:
        print("❌ FAILED: Out-of-range HP was accepted")
        return False
    
    print(f"✅ PASSED: Out-of-range value correctly rejected")
    return True


def test_unique_ids():
    """Test 7: Reject duplicate IDs"""
    print("\n🧪 Test 7: Testing unique ID validation...")
    
    # Duplicate enemy IDs
    invalid_data = copy.deepcopy(SAMPLE_GAME_DATA)
    invalid_data['enemies'].append(copy.deepcopy(invalid_data['enemies'][0]))
    
    is_valid, _, error = validate_game_data(invalid_data)
    
    if is_valid:
        print("❌ FAILED: Duplicate enemy IDs were accepted")
        return False
    
    if "unique" not in error.lower():
        print(f"❌ FAILED: Error message doesn't mention uniqueness")
        return False
    
    print(f"✅ PASSED: Duplicate IDs correctly rejected")
    return True


def test_partial_validation():
    """Test 8: Test partial field validation"""
    print("\n🧪 Test 8: Testing partial field validation...")
    
    enemy_data = {
        "id": "test_enemy",
        "name": "Test Enemy",
        "hp": 50,
        "speed": 1.5,
        "radius": 12,
        "sprite_prompt": "test enemy sprite prompt here"
    }
    
    is_valid, error = validate_partial_game_data(enemy_data, 'enemy')
    
    if not is_valid:
        print(f"❌ FAILED: Valid enemy data was rejected")
        print(f"   Error: {error}")
        return False
    
    print(f"✅ PASSED: Partial validation works correctly")
    return True


def test_direct_model_instantiation():
    """Test 9: Test direct Pydantic model instantiation"""
    print("\n🧪 Test 9: Testing direct model instantiation...")
    
    try:
        game_data = GameData(**SAMPLE_GAME_DATA)
        
        # Test model properties
        if game_data.story.os_name != "FantasyOS-Δ9":
            print("❌ FAILED: Model property mismatch")
            return False
        
        if len(game_data.enemies) != 2:
            print("❌ FAILED: Enemy count mismatch")
            return False
        
        # Test model_dump
        dumped = game_data.model_dump()
        if 'story' not in dumped:
            print("❌ FAILED: model_dump() missing fields")
            return False
        
        print(f"✅ PASSED: Direct model instantiation works")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Model instantiation raised exception: {e}")
        return False


def test_json_serialization():
    """Test 10: Test JSON serialization"""
    print("\n🧪 Test 10: Testing JSON serialization...")
    
    try:
        game_data = GameData(**SAMPLE_GAME_DATA)
        
        # Test model_dump_json
        json_str = game_data.model_dump_json(indent=2)
        
        if not json_str:
            print("❌ FAILED: JSON serialization produced empty string")
            return False
        
        if '"game_id"' not in json_str:
            print("❌ FAILED: JSON missing expected fields")
            return False
        
        # Test round-trip
        import json
        parsed = json.loads(json_str)
        game_data_2 = GameData(**parsed)
        
        if game_data.story.os_name != game_data_2.story.os_name:
            print("❌ FAILED: Round-trip data mismatch")
            return False
        
        print(f"✅ PASSED: JSON serialization works correctly")
        print(f"   JSON length: {len(json_str)} bytes")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: JSON serialization raised exception: {e}")
        return False


def run_all_tests():
    """Run all validation tests"""
    print("=" * 60)
    print("Fantasy OS SHMUP - Step 2 Validation Tests")
    print("=" * 60)
    
    tests = [
        test_valid_sample_data,
        test_validation_summary,
        test_invalid_palette,
        test_invalid_wave_formation,
        test_missing_required_field,
        test_range_validation,
        test_unique_ids,
        test_partial_validation,
        test_direct_model_instantiation,
        test_json_serialization
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ EXCEPTION: {test.__name__} raised {type(e).__name__}: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)
    
    if failed == 0:
        print("\n🎉 All tests passed! Step 2 validation complete.")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review errors above.")
        return 1


if __name__ == '__main__':
    sys.exit(run_all_tests())
