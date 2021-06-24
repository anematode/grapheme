#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

#define BIGINT_WORD_BITS 30
#define BIGINT_WORD_PART_BITS 15
#define BIGINT_WORD_BIT_MASK 0x3FFFFFFF
#define BIGINT_WORD_OVERFLOW_BIT_MASK 0x40000000

#define BIGINT_WORD_SIZE 1073741824
#define BIGINT_WORD_MAX 1073741823

typedef struct grapheme_bigint {
    int sign; // -1, 0 or 1
    int word_count; // Number of used words
    int allocated_words; // Size of words
    int* words; // Words ptr
} grapheme_bigint;

// Return a grapheme_big_int ptr with words allocated to the given size, ready to be filled by the external code
grapheme_bigint* grapheme_bigint_external_init(int sign, int word_count, int allocated_words) {
    grapheme_bigint* bigint = (grapheme_bigint*) malloc(sizeof(grapheme_bigint));

    if (!bigint) return NULL;

    bigint->sign = sign;
    bigint->word_count = word_count;

    if (allocated_words == -1) allocated_words = word_count;
    bigint->words = (int*) malloc(sizeof(int) * allocated_words);
    bigint->allocated_words = allocated_words;

    if (!bigint->words) {
        free(bigint);
        return NULL;
    }

    return bigint;
}

grapheme_bigint* grapheme_bigint_init_from_single_word(int sign, int value) {
    grapheme_bigint* bigint = (grapheme_bigint*) malloc(sizeof(grapheme_bigint));

    if (!bigint) return NULL;

    bigint->sign = sign;
    bigint->word_count = 1;
    bigint->words = (int*) malloc(sizeof(int));

    bigint->words[0] = value & BIGINT_WORD_BIT_MASK;
    return bigint;
}

int* grapheme_bigint_get_words(grapheme_bigint* bigint) {
    return bigint->words;
}

int grapheme_bigint_get_sign(grapheme_bigint* bigint) {
    return bigint->sign;
}

int grapheme_bigint_get_word_count(grapheme_bigint* bigint) {
    return bigint->word_count;
}

void grapheme_free_bigint(grapheme_bigint* bigint) {
    free(bigint->words);
    free(bigint);
}

void grapheme_bigint_allocate_words(grapheme_bigint* bigint, int allocate_words) {
    if (allocate_words <= bigint->allocated_words) return;

    bigint->words = realloc(bigint->words, sizeof(int) * allocate_words);

    int new_words = allocate_words - bigint->allocated_words;
    memset(bigint->words + bigint->allocated_words, 0, sizeof(int) * new_words); // fill new words with 0

    bigint->allocated_words = allocate_words;
}

void grapheme_bigint_set_zero(grapheme_bigint* bigint) {
    bigint->word_count = 1;
    bigint->sign = 0;

    memset(bigint->words, 0, sizeof(int) * (bigint->allocated_words));
}

// Multiply by a single word in-place
void grapheme_bigint_multiply_in_place(grapheme_bigint* bigint, int multiplicand) {
    if (multiplicand == 0) {
        grapheme_bigint_set_zero(bigint);
        return;
    }

    int* words = bigint->words;
    int word_count = bigint->word_count;

    // Use 64-bit integers to prevent overflow
    long long multiplicand_long = multiplicand, carry = 0, word, result;
    int i = 0;

    for (; i < word_count; ++i) {
        word = words[i];
        result = word * multiplicand_long + carry;

        carry = result >> BIGINT_WORD_BITS;
        words[i] = result & BIGINT_WORD_BIT_MASK;
    }

    if (carry != 0) {
        word_count += 1;
        grapheme_bigint_allocate_words(bigint, word_count);

        bigint->word_count = word_count;
        bigint->words[i] = carry;
    }

    if (multiplicand < 0) {
        bigint->sign *= -1;
    }
}

void grapheme_bigint_add_in_place(grapheme_bigint* bigint, int add) {
    if (add == 0) return;

    int* words = bigint->words;
    int word_count = bigint->word_count;

    int carry = add, i=0;
    for (; i < word_count; ++i) {
        int word = words[i];
        int result = word + carry;

        if (result > BIGINT_WORD_BIT_MASK) {
            carry = 1;
            words[i] = result & BIGINT_WORD_BIT_MASK;
        } else {
            carry = 0;
            words[i] = result;
        }
    }

    if (carry != 0) {
        grapheme_bigint_allocate_words(bigint, word_count + 1);
        words = bigint->words;
        words[i] = carry;
    }
}
