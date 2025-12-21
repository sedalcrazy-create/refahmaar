#!/bin/bash
# Script to fix Persian/Farsi display in Git Bash

echo "🔧 Configuring Git for Persian/UTF-8 support..."
echo ""

# Set UTF-8 encoding for git
git config --global core.quotepath false
git config --global i18n.commitEncoding utf-8
git config --global i18n.logOutputEncoding utf-8

# Set pager to handle UTF-8
git config --global core.pager "less -r"

# Set editor encoding (if using vim)
git config --global core.editor "vim"

echo "✅ Git configuration updated!"
echo ""
echo "Current settings:"
echo "===================="
git config --global --get core.quotepath
git config --global --get i18n.commitEncoding
git config --global --get i18n.logOutputEncoding
echo ""
echo "📝 Test Persian display:"
echo "سلام - یلدا مبارک 🎉"
echo ""
echo "If you see Persian text correctly above, configuration is working!"
echo ""
echo "⚠️  IMPORTANT: You must also change Git Bash font to 'Courier New' or 'Consolas'"
echo "   Right-click Git Bash title bar → Options → Text → Font: Courier New"
echo ""
echo "Or better: Use Windows Terminal with Git Bash profile for best experience!"
