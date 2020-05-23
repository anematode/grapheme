import * as utils from "./utils";

const ADD = function (interval_a, interval_b) {
  return [interval_a[0] + interval_b[0], interval_a[1] + interval_b[1]];
}

const SUB = function (interval_a, interval_b) {
  return [interval_a[0] - interval_b[1], interval_a[1] - interval_b[0]];
}

const MUL = function (interval_a, interval_b) {
  let m1 = interval_a[0] * interval_b[0];
  let m2 = interval_a[1] * interval_b[0];
  let m3 = interval_a[0] * interval_b[1];
  let m4 = interval_a[1] * interval_b[1];

  return [Math.min(m1,m2,m3,m4), Math.max(m1,m2,m3,m4)];
}

const DIV = function (interval_a, interval_b) {
  if (interval_b[0] <= 0 && 0 <= interval_b[1]) { // if b contains 0
    if (!interval_a[0] && !interval_a[1]) { // if a = [0,0]
      if (interval_b[0] === 0 && interval_b[1] === 0)
        return [NaN, NaN];
      return [0, 0]; // though NaN is possible
    }
    return [-Infinity, Infinity];
  }

  if (0 < interval_b[0]) // b is positive
    return [interval_a[0] / interval_b[1], interval_a[1] / interval_b[0]];

  return [interval_a[1] / interval_b[0], interval_a[0] / interval_b[1]];
}

const SIN = function (interval) {
  if (interval[1] - interval[0] >= 2 * Math.PI)
    return [-1,1];

  let a_rem_2p = utils.mod(interval[0], 2 * Math.PI);
  let b_rem_2p = utils.mod(interval[1], 2 * Math.PI);

  let min_rem = Math.min(a_rem_2p, b_rem_2p);
  let max_rem = Math.max(a_rem_2p, b_rem_2p);

  let contains_1 = (min_rem < Math.PI / 2) && (max_rem > Math.PI / 2);
  let contains_n1 = (min_rem < 3 * Math.PI / 2 && max_rem > 3 * Math.PI / 2);

  if (b_rem_2p < a_rem_2p) {
    contains_1 = !contains_1;
    contains_n1 = !contains_n1;
  }

  if (contains_1 && contains_n1)
    return [-1,1]; // for rapidity

  let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
  return [contains_n1 ? -1 : Math.min(sa, sb), contains_1 ? 1 : Math.max(sa, sb)];
}

const COS = function (interval) {
  return SIN([interval[0] + Math.PI / 2, interval[1] + Math.PI / 2]); // and I oop
}

const TAN = function (interval) {
  return DIV(SIN(interval), COS(interval));
}

const SEC = function (interval) {
  return DIV([1,1], COS(interval));
}

const CSC = function (interval) {
  return DIV([1,1], SIN(interval));
}

const COT = function (interval) {
  return DIV(COS(interval), SIN(interval));
}

const EXP_B = function (b, interval_n) {
  return [Math.pow(b, interval_n[0]), Math.pow(b, interval_n[1])];
}

const EXP_N = function (interval_b, n) {
  if (n === 0)
    return [1,1];
  if (utils.isPositiveInteger(n)) {
    if (n % 2 === 0) {
      let p1 = Math.pow(interval_b[0], n), p2 = Math.pow(interval_b[1], n);
      return (interval_b[0] >= 0 ? [p1, p2] : (interval_b[1] < 0 ? [p2, p1] : [0, Math.max(p1, p2)]));
    } else {
      return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
    }
  } else if (utils.isInteger(n)) {
    return DIV([1,1], EXP_N(interval_b, -n));
  } else {
    if (interval_b[1] < 0)
      return [NaN, NaN];
    if (interval_b[0] < 0) interval_b[0] = 0;

    if (n >= 0) {
      return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
    } else {
      return [Math.pow(interval_b[1], n), Math.pow(interval_b[0], n)];
    }
  }
}

const LOG_A = function (a, interval_n) {
  if (a === 1) {
    if (interval_n[0] <= 1 && 1 <= interval_n[1])
      return [-Infinity, Infinity];
    else
      return [NaN, NaN];
  }

  if (interval_n[0] === interval_n[1])
    return Math.log(interval_n[0]) / Math.log(a);

  if (interval_n[1] <= 0) return [NaN, NaN];
  if (interval_n[0] < 0) interval_n[0] = 0;

  if (a > 1) {
    let log_a = Math.log(a);

    return [Math.log(interval_n[0]) / log_a, Math.log(interval_n[1]) / log_a];
  } else {
    let log_a = Math.log(a);

    return [Math.log(interval_n[1]) / log_a, Math.log(interval_n[0]) / log_a];
  }
}

const LOG_N = function (interval_a, n) {
  if (interval_a[1] < 0)
    interval_a[0] = 0;
  if (interval_a[0] <= 1 && 1 <= interval_a[1])
    return [-Infinity, Infinity];

  if (n < 1) {

  }
}

const POW = function (interval_a, interval_b) {
  if (interval_a[0] === interval_a[1]) {
    return EXP_B(interval_a[0], interval_b);
  } else if (interval_b[0] === interval_b[1]) {
    return EXP_N(interval_a, interval_b[0]);
  } else {
    // ANNOYST ANNOYST
    // For now: discard negative a

    if (interval_a[1] < 0)
      return [NaN, NaN];

    if (interval_a[0] < 0)
      interval_a[0] = 0;

    if (interval_a[0] < 1) {

    }
  }
}

const CONST = function(a) {
  return [a,a];
}

const IntervalFunctions = {ADD,SUB,MUL,DIV,SIN,COS,TAN,SEC,CSC,COT,EXP_B,EXP_N,LOG_A,LOG_N,POW,CONST};

export {IntervalFunctions};
