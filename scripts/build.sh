#!/usr/bin/env bash

cd ..
rollup -c
cat src/ast/predefined_variables.js >> build/grapheme.js
