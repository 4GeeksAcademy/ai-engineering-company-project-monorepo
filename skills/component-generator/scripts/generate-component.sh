#!/bin/bash

# Component Generator Script
# Usage: ./generate-component.sh ComponentName [--client] [--path ./custom/path]

set -e

# Parse arguments
COMPONENT_NAME=""
IS_CLIENT=false
CUSTOM_PATH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --client)
      IS_CLIENT=true
      shift
      ;;
    --path)
      CUSTOM_PATH="$2"
      shift 2
      ;;
    *)
      COMPONENT_NAME="$1"
      shift
      ;;
  esac
done

if [ -z "$COMPONENT_NAME" ]; then
  echo "❌ Usage: ./generate-component.sh ComponentName [--client] [--path ./custom/path]"
  exit 1
fi

# Determine output directory
if [ -n "$CUSTOM_PATH" ]; then
  OUTPUT_DIR="$CUSTOM_PATH/$COMPONENT_NAME"
else
  OUTPUT_DIR="./components/$COMPONENT_NAME"
fi

# Create directory
mkdir -p "$OUTPUT_DIR"

# Generate index.tsx
cat > "$OUTPUT_DIR/index.tsx" << 'EOF'
export { default } from "./COMPONENT_NAME_PLACEHOLDER";
EOF
sed -i "s/COMPONENT_NAME_PLACEHOLDER/$COMPONENT_NAME/g" "$OUTPUT_DIR/index.tsx"

# Generate component file
if [ "$IS_CLIENT" = true ]; then
  cat > "$OUTPUT_DIR/$COMPONENT_NAME.tsx" << 'CLIENT_EOF'
"use client";

import { useState, useCallback } from "react";

interface COMPONENT_NAME_PLACEHOLDERProps {
  /** Description of the prop */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * COMPONENT_NAME_PLACEHOLDER - Brief description of what it does
 *
 * @accessibility
 * - Client component with interactive features
 * - Uses semantic HTML elements
 * - Includes proper ARIA attributes
 * - Supports keyboard navigation
 * - Has visible focus indicators
 */
export default function COMPONENT_NAME_PLACEHOLDER({
  children,
  className = "",
}: COMPONENT_NAME_PLACEHOLDERProps) {
  return (
    <section
      className={className}
      aria-labelledby="componentname-heading"
    >
      <h2 id="componentname-heading" className="sr-only">
        Section Title
      </h2>
      {children}
    </section>
  );
}
CLIENT_EOF
  sed -i "s/COMPONENT_NAME_PLACEHOLDER/$COMPONENT_NAME/g" "$OUTPUT_DIR/$COMPONENT_NAME.tsx"
else
  cat > "$OUTPUT_DIR/$COMPONENT_NAME.tsx" << 'SERVER_EOF'
import type { ReactNode } from "react";

interface COMPONENT_NAME_PLACEHOLDERProps {
  /** Description of the prop */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * COMPONENT_NAME_PLACEHOLDER - Brief description of what it does
 *
 * @accessibility
 * - Uses semantic HTML elements
 * - Includes proper ARIA attributes
 * - Has visible focus indicators
 */
export default function COMPONENT_NAME_PLACEHOLDER({
  children,
  className = "",
}: COMPONENT_NAME_PLACEHOLDERProps) {
  return (
    <section
      className={className}
      aria-labelledby="componentname-heading"
    >
      <h2 id="componentname-heading" className="sr-only">
        Section Title
      </h2>
      {children}
    </section>
  );
}
SERVER_EOF
  sed -i "s/COMPONENT_NAME_PLACEHOLDER/$COMPONENT_NAME/g" "$OUTPUT_DIR/$COMPONENT_NAME.tsx"
fi

echo "✅ Component created successfully!"
echo ""
echo "📁 Files created:"
echo "   $OUTPUT_DIR/index.tsx"
echo "   $OUTPUT_DIR/$COMPONENT_NAME.tsx"
echo ""
echo "📝 Next steps:"
echo "   1. Update the interface props in $COMPONENT_NAME.tsx"
echo "   2. Implement your component logic"
echo "   3. Add accessibility attributes as needed"
echo "   4. Import in your page: import $COMPONENT_NAME from '@/$OUTPUT_DIR'"
