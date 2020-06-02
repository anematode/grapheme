#include "real.h"
#include <string>
#include <iostream>

namespace Grapheme {

Real::Real(int precision) {
    mpfr_init2(ptr, precision);
}

Real::~Real() {
    mpfr_clear(ptr);
}

void Real::set_precision(int precision) {
    mpfr_set_prec(ptr, precision);
}

int Real::get_precision() {
    return mpfr_get_prec(ptr);
}

void Real::set_value_from_float(double value) {
    mpfr_set_d(ptr, value, MPFR_RNDN);
}

void Real::set_value_from_string(char* string) {
    mpfr_set_str(ptr, string, 10, MPFR_RNDN);
}

std::string* saved_value1 = nullptr;

char* Real::get_value(int precision) {
    if (saved_value1)
        delete saved_value1;

    long radix = 0;
    char* ret = mpfr_get_str(nullptr, &radix, 10, precision, ptr, MPFR_RNDN);

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

    mpfr_free_str(ret);

    saved_value1 = result;

    return &(*result)[0];
}

char* saved_value2 = nullptr;

char* Real::get_value_no_point(int precision) {

    if (saved_value2)
        mpfr_free_str(saved_value2);

    char* ret = mpfr_get_str(nullptr, nullptr, 10, precision, ptr, MPFR_RNDN);

    saved_value2 = ret;

    return ret;
}

void Real::set_value_from_real(Real& r) {
    mpfr_set(ptr, r.ptr, MPFR_RNDN);
}

void Real::set_nan() {
    mpfr_set_nan(ptr);
}

void Real::set_inf(int sign) {
    mpfr_set_inf(ptr, sign);
}

void Real::set_zero(int sign) {
    mpfr_set_zero(ptr, sign);
}

double Real::approximate_as_float() {
    return mpfr_get_d(ptr, MPFR_RNDN);
}

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

void Real::acot() {
    mpfr_ui_div(ptr, 1, ptr, MPFR_RNDN);
    atan();
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
    mpfr_add_d(ptr, 1, MPFR_RNDN);
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

}
