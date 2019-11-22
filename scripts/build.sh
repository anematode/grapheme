#!/usr/bin/env bash

cd ..
rollup -c
cp src/grapheme.css build/grapheme.css
cat build/grapheme_wasm.js >> build/grapheme.js
