#!/usr/bin/env bash

cd ..
rollup -c
cp src/core/grapheme.css build/grapheme.css
cat src/ast/predefined_variables.js >> build/grapheme.js
