#!/bin/bash

# 1. Enter the alternate screen (smcup)
tput smcup

# Clear the new screen for a clean UI
clear

echo "------------------------------------------------"
echo "Welcome to the Alternate Screen Buffer!"
echo "Your previous terminal history is safe and hidden."
echo "------------------------------------------------"
echo ""
echo "Notice that you cannot scroll back to see your old commands."
echo "Press any key to exit and restore your terminal..."

# Wait for a single keypress
read -n 1 -s

# 2. Exit the alternate screen (rmcup)
# This will instantly bring back your previous prompt and text.
tput rmcup
