#!/usr/bin/env python3
"""Downgrade all 4 mobile apps from Expo SDK 52 to SDK 51 (stable)."""
import json
from pathlib import Path

ROOT = Path("/home/z/my-project")
APPS = ["mobile-bendahara", "mobile-guru", "mobile-kepala", "mobile-wali"]

# SDK 51 versions (stable, no components.release bug)
SDK51 = {
    "expo": "~51.0.39",
    "expo-dev-client": "~4.0.29",
    "expo-secure-store": "~13.0.2",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@supabase/supabase-js": "^2.118.0",
    "@expo/vector-icons": "^14.0.0",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "~3.31.1",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-reanimated": "~3.10.1",
    "jose": "^5.9.6",
}

# Optional packages — only set if already present
OPTIONAL = ["expo-status-bar", "react-native-gesture-handler", "react-native-reanimated"]

for app_name in APPS:
    pkg_path = ROOT / "apps" / app_name / "package.json"
    with open(pkg_path) as f:
        d = json.load(f)
    deps = d.get("dependencies", {})

    new_deps = {}
    # Preserve existing key order, update versions
    for k, v in deps.items():
        if k in SDK51:
            new_deps[k] = SDK51[k]
        else:
            new_deps[k] = v
    # Make sure all SDK51 packages are present (in case some are missing)
    for k, v in SDK51.items():
        if k not in new_deps and k not in OPTIONAL:
            new_deps[k] = v
    # Add optional ones only if they were already there
    for k in OPTIONAL:
        if k in deps and k not in new_deps:
            new_deps[k] = SDK51[k]

    d["dependencies"] = new_deps
    d["engines"] = {"node": ">=18.0.0"}  # SDK 51 supports Node 18+

    with open(pkg_path, "w") as f:
        json.dump(d, f, indent=2)
    print(f"✓ {app_name} downgraded to SDK 51")

print("\nDone. Run npm install --legacy-peer-deps per app to update lockfile.")
