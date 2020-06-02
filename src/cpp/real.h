#include "gmp.h"
#include "mpfr.h"
#include "emscripten.h"

namespace Grapheme {

// Ovinus
class Real {
private:
    mpfr_t ptr;
public:
    Real(int precision);
    ~Real();

    void set_precision(int precision);
    int get_precision();
    void set_value_from_float(double value);
    void set_value_from_string(char* string);
    void set_value_from_real(Real& r);
    char* get_value(int precision);
    char* get_value_no_point(int precision);
    void set_nan();
    void set_inf(int sign);
    void set_zero(int sign);
    double approximate_as_float();
    void add_float(double);
    void add_real(Real&);
    void subtract_float(double);
    void subtract_real(Real&);
    void multiply_float(double);
    void multiply_real(Real&);
    void square();
    void divide_float(double);
    void divide_real(Real&);
    void pow_real(Real&);
    void pow_rational(int p, int q);
    void pow_int(int);
    void sqrt();
    void cbrt();
    void rootn(int);
    void ln();
    void log10();
    void log2();
    void exp();
    void exp2();
    void exp10();
    void sin();
    void cos();
    void tan();
    void sec();
    void csc();
    void cot();
    void acos();
    void asin();
    void atan();
    void asec();
    void acsc();
    void acot();
    void sinh();
    void cosh();
    void tanh();
    void sech();
    void csch();
    void coth();
    void acosh();
    void asinh();
    void atanh();
    void asech();
    void acsch();
    void acoth();
    void gamma();
    void set_pi();
    int is_nan();
    int is_inf();
};

}
