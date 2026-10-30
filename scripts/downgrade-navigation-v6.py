#!/usr/bin/env python3
"""Downgrade @react-navigation/* to v6 (compatible with Expo SDK 51)."""
import json
from pathlib import Path

ROOT = Path("/home/z/my-project")
APPS = ["mobile-bendahara", "mobile-guru", "mobile-kepala", "mobile-wali"]

# React Navigation v6 (compatible with react-native-screens 3.x)
NAV_V6 = {
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/native-stack": "^6.9.26",
    "@react-navigation/bottom-tabs": "^6.6.1",
}

for app_name in APPS:
    pkg_path = ROOT / "apps" / app_name / "package.json"
    with open(pkg_path) as f:
        d = json.load(f)
    deps = d.get("dependencies", {})

    for k, v in NAV_V6.items():
        if k in deps:
            deps[k] = v
        else:
            # Add if missing (only bottom-tabs for apps that need it)
            if k == "@react-navigation/bottom-tabs" and app_name in ("mobile-guru", "mobile-wali"):
                deps[k] = v

    d["dependencies"] = deps
    with open(pkg_path, "w") as f:
        json.dump(d, f, indent=2)
    print(f"✓ {app_name} downgraded to React Navigation v6")
