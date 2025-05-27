#!/usr/bin/env python3
"""
Setup script to install Guardrails validators
This should be run during the build process
"""

import subprocess
import sys
import os

def install_validators():
    """Install required Guardrails validators from the Hub"""
    
    # Set up Guardrails configuration
    print("Configuring Guardrails...")
    try:
        # Configure Guardrails with default settings
        subprocess.run([
            sys.executable, "-m", "guardrails", "configure",
            "--enable-metrics", "--enable-remote-inferencing"
        ], check=True, capture_output=True, text=True)
        print("Guardrails configured successfully")
    except subprocess.CalledProcessError as e:
        print(f"Warning: Guardrails configuration failed: {e}")
        print("Continuing with validator installation...")

    # Install required validators
    validators = [
        "hub://guardrails/detect_pii",
        "hub://guardrails/detect_secrets"
    ]
    
    for validator in validators:
        print(f"Installing validator: {validator}")
        try:
            subprocess.run([
                sys.executable, "-m", "guardrails", "hub", "install", validator, "--quiet"
            ], check=True, capture_output=True, text=True)
            print(f"Successfully installed: {validator}")
        except subprocess.CalledProcessError as e:
            print(f"Failed to install {validator}: {e}")
            # Continue with other validators

if __name__ == "__main__":
    install_validators() 