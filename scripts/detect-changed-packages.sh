#!/bin/bash
# Script to detect which packages in the monorepo were modified
# Uso: ./scripts/detect-changed-packages.sh

set -e

# Obtener archivos staged o modificados
if [ -n "$1" ]; then
  # If an argument is passed, use those files (useful for lint-staged)
  FILES="$1"
else
  # By default, use staged files
  FILES=$(git diff --cached --name-only --diff-filter=ACM)
fi

# If there are no files, exit
if [ -z "$FILES" ]; then
  exit 0
fi

# Detect modified packages
CHANGED_PACKAGES=""

for file in $FILES; do
  if [[ "$file" == packages/api/* ]]; then
    if [[ ! "$CHANGED_PACKAGES" =~ "api" ]]; then
      CHANGED_PACKAGES="${CHANGED_PACKAGES}api "
    fi
  elif [[ "$file" == packages/web/* ]]; then
    if [[ ! "$CHANGED_PACKAGES" =~ "web" ]]; then
      CHANGED_PACKAGES="${CHANGED_PACKAGES}web "
    fi
  elif [[ "$file" == packages/mobile/* ]]; then
    if [[ ! "$CHANGED_PACKAGES" =~ "mobile" ]]; then
      CHANGED_PACKAGES="${CHANGED_PACKAGES}mobile "
    fi
  elif [[ "$file" == packages/shared/* ]]; then
    # Si shared cambia, todos los paquetes que lo usan deben ser testeados
    if [[ ! "$CHANGED_PACKAGES" =~ "api" ]]; then
      CHANGED_PACKAGES="${CHANGED_PACKAGES}api "
    fi
    if [[ ! "$CHANGED_PACKAGES" =~ "web" ]]; then
      CHANGED_PACKAGES="${CHANGED_PACKAGES}web "
    fi
    if [[ ! "$CHANGED_PACKAGES" =~ "mobile" ]]; then
      CHANGED_PACKAGES="${CHANGED_PACKAGES}mobile "
    fi
  fi
done

# Also check for changes in root configuration files that affect all packages
for file in $FILES; do
  if [[ "$file" == tsconfig.base.json ]] || \
     [[ "$file" == tsconfig.json ]] || \
     [[ "$file" == package.json ]] || \
     [[ "$file" == .eslintrc.js ]] || \
     [[ "$file" == jest.config.js ]]; then
    # If changes are made to root configuration, test all packages
    CHANGED_PACKAGES="api web mobile"
    break
  fi
done

# Print modified packages (without extra spaces at the end)
echo "$CHANGED_PACKAGES" | xargs

