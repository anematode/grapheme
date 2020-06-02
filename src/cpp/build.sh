python /Users/timoothy/Documents/emsdk/upstream/emscripten/tools/webidl_binder.py grapheme.idl glue

cp glue_header.cc glue.cc
cat glue.cpp >> glue.cc
rm glue.cpp

em++ -o grapheme_wasm.js *.cc ${HOME}/opt/lib/libmpc.a ${HOME}/opt/lib/libmpfr.a ${HOME}/opt/lib/libgmp.a -I/usr/local/include -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' --post-js glue.js
echo "export { Module }" >> grapheme_wasm.js

cp grapheme_wasm.wasm ../../build/grapheme_wasm.wasm
