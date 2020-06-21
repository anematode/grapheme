#include "real.h"
#include <string>
#include <iostream>

namespace Grapheme {

Real::Real(int precision) {
    // Init the real with a given precision
    mpfr_init2(ptr, precision);
}

Real::~Real() {
    // Free the mpfr_ptr
    mpfr_clear(ptr);
}

// Set the precision of the number
void Real::set_precision(int precision) {
    mpfr_set_prec(ptr, precision);
}

// Get the precision of the number
int Real::get_precision() {
    return mpfr_get_prec(ptr);
}

// Set the number from a float
void Real::set_value_from_float(double value) {
    mpfr_set_d(ptr, value, MPFR_RNDN);
}

// Set the number from a string (preferred for arbitrary precision calculations, unless the number is exactly
// representable as a float)
void Real::set_value_from_string(char* string) {
    mpfr_set_str(ptr, string, 10, MPFR_RNDN);
}

// Pointer to temporarily saved value, to be deleted later (because we need to read the string out of WASM memory)
std::string* saved_value1 = nullptr;

// Get the value of the real to the desired precision, with infinite precision if precision == 0
char* Real::get_value(int precision) {
    // Delete the saved value, since it is no longer useful
    if (saved_value1)
        delete saved_value1;

    // Get radix (aka where the decimal point should be)
    long radix = 0;

    // Convert the number to a string
    char* ret = mpfr_get_str(nullptr, &radix, 10, precision, ptr, MPFR_RNDN);

    // Insert a decimal point at the correct location, keeping in mind negative numbers have a starting '-'
    int index = 0;

    if (ret[0] == '-') {
        index += 1;
    }

    index += radix;
    std::string* result = new std::string();

    for (int i = 0; i < index; ++i) {
        *result += ret[i];
    }

    *result += '.';

    int length = strlen(ret);

    for (int i = index; i < length; ++i) {
        *result += ret[i];
    }

    // Free the intermediate result string
    mpfr_free_str(ret);

    // Mark the result to be cleared later
    saved_value1 = result;

    // Convert the std::string to a char* and return it
    return &(*result)[0];
}

// Pointer to temporarily saved value, to be deleted later (because we need to read the string out of WASM memory)
char* saved_value2 = nullptr;

// Get the number's value without a decimal point
char* Real::get_value_no_point(int precision) {
    // Free unused string
    if (saved_value2)
        mpfr_free_str(saved_value2);

    char* ret = mpfr_get_str(nullptr, nullptr, 10, precision, ptr, MPFR_RNDN);

    saved_value2 = ret;

    return ret;
}

// Copy values between reals
void Real::set_value_from_real(Real& r) {
    mpfr_set(ptr, r.ptr, MPFR_RNDN);
}

// Set this real's value to NaN
void Real::set_nan() {
    mpfr_set_nan(ptr);
}

// Set this real's value to an Infinity of given sign
void Real::set_inf(int sign) {
    mpfr_set_inf(ptr, sign);
}

// Set the real's value to 0 of given sign
void Real::set_zero(int sign) {
    mpfr_set_zero(ptr, sign);
}

// Return the nearest double to the real
double Real::approximate_as_float() {
    return mpfr_get_d(ptr, MPFR_RNDN);
}

// The following functions are relatively self-explanatory
void Real::add_float(double r) {
    mpfr_add_d(ptr, ptr, r, MPFR_RNDN);
}

void Real::add_real(Real& r) {
    mpfr_add(ptr, ptr, r.ptr, MPFR_RNDN);
}

void Real::subtract_float(double r) {
    mpfr_sub_d(ptr, ptr, r, MPFR_RNDN);
}

void Real::subtract_real(Real& r) {
    mpfr_sub(ptr, ptr, r.ptr, MPFR_RNDN);
}

void Real::multiply_float(double r) {
    mpfr_mul_d(ptr, ptr, r, MPFR_RNDN);
}

void Real::multiply_real(Real& r) {
    mpfr_mul(ptr, ptr, r.ptr, MPFR_RNDN);
}

void Real::sqrt() {
    mpfr_sqrt(ptr, ptr, MPFR_RNDN);
}

void Real::cbrt() {
    mpfr_cbrt(ptr, ptr, MPFR_RNDN);
}

void Real::rootn(int n) {
    mpfr_rootn_ui(ptr, ptr, n, MPFR_RNDN);
}

void Real::square() {
    mpfr_sqr(ptr, ptr, MPFR_RNDN);
}

void Real::divide_float(double r) {
    mpfr_div_d(ptr, ptr, r, MPFR_RNDN);
}

void Real::divide_real(Real& r) {
    mpfr_div(ptr, ptr, r.ptr, MPFR_RNDN);
}

void Real::pow_int(int a) {
    mpfr_pow_ui(ptr, ptr, a, MPFR_RNDN);
}

void Real::pow_real(Real& r) {
    mpfr_pow(ptr, ptr, r.ptr, MPFR_RNDN);
}

void Real::pow_rational(int p, int q) {
    pow_int(p);
    rootn(q);
}

void Real::ln() {
    mpfr_log(ptr, ptr, MPFR_RNDN);
}

void Real::log10() {
    mpfr_log10(ptr, ptr, MPFR_RNDN);
}

void Real::log2() {
    mpfr_log2(ptr, ptr, MPFR_RNDN);
}

void Real::exp() {
    mpfr_exp(ptr, ptr, MPFR_RNDN);
}

void Real::exp2() {
    mpfr_exp2(ptr, ptr, MPFR_RNDN);
}

void Real::exp10() {
    mpfr_exp10(ptr, ptr, MPFR_RNDN);
}

void Real::sin() {
    mpfr_sin(ptr, ptr, MPFR_RNDN);
}

void Real::cos() {
    mpfr_cos(ptr, ptr, MPFR_RNDN);
}

void Real::tan() {
    mpfr_tan(ptr, ptr, MPFR_RNDN);
}

void Real::sec() {
    mpfr_sec(ptr, ptr, MPFR_RNDN);
}

void Real::csc() {
    mpfr_csc(ptr, ptr, MPFR_RNDN);
}

void Real::cot() {
    mpfr_cot(ptr, ptr, MPFR_RNDN);
}

void Real::acos() {
    mpfr_acos(ptr, ptr, MPFR_RNDN);
}

void Real::asin() {
    mpfr_asin(ptr, ptr, MPFR_RNDN);
}

void Real::atan() {
    mpfr_atan(ptr, ptr, MPFR_RNDN);
}

void Real::asec() {
    mpfr_ui_div(ptr, 1, ptr, MPFR_RNDN);
    acos();
}

void Real::acsc() {
    mpfr_ui_div(ptr, 1, ptr, MPFR_RNDN);
    asin();
}

Real cotAdd(1);

void Real::acot() {
    // Implementation of arccot()
    mpfr_ui_div(ptr, 1, ptr, MPFR_RNDN);
    atan();
    if (mpfr_cmp_d(ptr, 0) < 0) {
        int prec = get_precision();
        if (cotAdd.get_precision() > prec) {
            cotAdd.set_precision(prec);
            mpfr_const_pi(cotAdd.ptr, MPFR_RNDN);
        }
        mpfr_add(ptr, ptr, cotAdd.ptr, MPFR_RNDN);
    }
}

void Real::sinh() {
    mpfr_sinh(ptr, ptr, MPFR_RNDN);
}

void Real::cosh() {
    mpfr_cosh(ptr, ptr, MPFR_RNDN);
}

void Real::tanh() {
    mpfr_tanh(ptr, ptr, MPFR_RNDN);
}

void Real::sech() {
    mpfr_sech(ptr, ptr, MPFR_RNDN);
}

void Real::csch() {
    mpfr_csch(ptr, ptr, MPFR_RNDN);
}

void Real::coth() {
    mpfr_coth(ptr, ptr, MPFR_RNDN);
}

void Real::acosh() {
    mpfr_acosh(ptr, ptr, MPFR_RNDN);
}

void Real::asinh() {
    mpfr_asinh(ptr, ptr, MPFR_RNDN);
}

void Real::atanh() {
    mpfr_atanh(ptr, ptr, MPFR_RNDN);
}

void Real::asech() {
    mpfr_ui_div(ptr, 1, ptr, MPFR_RNDN);
    mpfr_acosh(ptr, ptr, MPFR_RNDN);
}

void Real::acsch() {
    mpfr_ui_div(ptr, 1, ptr, MPFR_RNDN);
    mpfr_asinh(ptr, ptr, MPFR_RNDN);
}

void Real::acoth() {
    mpfr_ui_div(ptr, 1, ptr, MPFR_RNDN);
    mpfr_atanh(ptr, ptr, MPFR_RNDN);
}

void Real::gamma() {
    mpfr_gamma(ptr, ptr, MPFR_RNDN);
}

void Real::factorial() {
    mpfr_add_d(ptr, ptr, 1, MPFR_RNDN);
    mpfr_gamma(ptr, ptr, MPFR_RNDN);
}

void Real::ln_gamma() {
    mpfr_lngamma(ptr, ptr, MPFR_RNDN);
}

void Real::set_pi() {
    mpfr_const_pi(ptr, MPFR_RNDN);
}

int Real::is_nan() {
    return mpfr_nan_p(ptr);
}

int Real::is_inf() {
    return mpfr_inf_p(ptr);
}

void Real::digamma() {
    mpfr_digamma(ptr, ptr, MPFR_RNDN);
}

bool Real::equals(Real& r) {
    return mpfr_equal_p(ptr, r.ptr);
}

bool Real::greater_equal_than(Real& r) {
    return mpfr_greaterequal_p(ptr, r.ptr);
}

bool Real::less_equal_than(Real& r) {
    return mpfr_lessequal_p(ptr, r.ptr);
}

bool Real::greater_than(Real& r) {
    return mpfr_greater_p(ptr, r.ptr);
}

bool Real::less_than(Real& r) {
    return mpfr_less_p(ptr, r.ptr);
}

void Real::logb_real(Real& r) {
    mpfr_log(r.ptr, r.ptr, MPFR_RNDN);
    mpfr_log(ptr, ptr, MPFR_RNDN);
    mpfr_div(ptr, ptr, r.ptr, MPFR_RNDN);
}

void Real::abs() {
    mpfr_abs(ptr, ptr, MPFR_RNDN);
}

void Real::set_e() {
    mpfr_set_d(ptr, 1, MPFR_RNDN);
    mpfr_exp(ptr, ptr, MPFR_RNDN);
}

}
