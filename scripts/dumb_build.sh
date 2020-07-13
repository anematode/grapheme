#!/usr/bin/env bash
# Uses fswatch (install on macOS with brew install fswatch)

fswatch -o ../src ../tests | xargs -n1 -I{} ./build.sh
