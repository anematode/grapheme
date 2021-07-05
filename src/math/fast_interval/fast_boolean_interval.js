
// A boolean interval is basically just a bitset with four bits: valMin, valMax, defMin, defMax. So 15 is (T, T, T, T),
// 0 is (F, F, F, F), and a boolean interval is undefined iff b & 0b11 is false.

