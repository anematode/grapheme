import { pow } from './pow'
import { roundUp, roundDown } from './fp_manip'

function combinations (cows, l) {
  if (l === 0) { return [] }

  const rec = combinations(cows, l - 1)
  const ret = []

  for (const perm of rec) {
    for (const cow of cows) {
      ret.push([ ...perm, cow ])
    }
  }

  return ret
}

test('behaves like Math.pow for most arguments', () => {
  let cases = [
    [ 1, 2 ],
    [ 1, -2.4 ],
    [ 1.5, 12.1241 ],
    [ 1, 0.51241 ],
    [ 0.1409128, 120.124 ],
    [ 0, 0.1241 ],
    [ 150.12498, 12.14928 ],
    [ 10, 2 ],
    [ -2, 3 ],
    [ -152001.3, 2 ],
    [ -142919, 40 ],
    [ -20104.42, -22 ],
    [ -219, 22 ],
    [ -49.001, 22 ],
    [ -1.0009, 391 ],
    [ -40, -30 ],
    [ 120, 0 ],
    [ -100, 0 ],
    [ 4102, 0 ],
    [ -210.5, 0 ],
    ...combinations([ Infinity, -Infinity, 0, -0 ], 2)
  ]

  cases = cases.map((...args) => [ ...args, Math.pow(...args) ])

  expectMultipleCases(pow, cases)
})

test('returns NaN if any argument is NaN', () => {
  const cases = [
    [ NaN, NaN, NaN ],
    [ NaN, 0, NaN ],
    [ 0, NaN, NaN ]
  ]

  expectMultipleCases(pow, cases)
})

const bases = [
  -2,
  -1.121,
  -1,
  -141004001001.4,
  -24194.140198
]

test('returns NaN for negative base with exponent with even denominator', () => {
  const angers = [
    151 / 2,
    15 / 2,
    429 / 2,
    511 / 12,
    1581 / 144,
    50181 / 502
  ]

  angers.push(...angers.map(anger => -anger))
  angers.push(...angers.map(anger => [ roundUp(anger), roundDown(anger) ]).flat())

  for (const base of bases) {
    for (const anger of angers) {
      expect(pow(base, anger), `Input was ${base} ^ ${anger}`).toBe(NaN)
    }
  }
})

const getSurrounding = cow => [ roundUp(cow), cow, roundDown(cow) ]

test('Happy values for negative base and fractions', () => {
  const happyNegatives = [
    1 / 3,
    1 / 5,
    1 / 51051,
    503 / 505,
    507 / 505,
    5071 / 5069,
    500001 / 501
  ]

  const happyPositives = [
    3102 / 3101,
    41028 / 3,
    4192 / 151,
    42 / 3,
    140218 / 141,
    1401840 / 21041
  ]

  for (const neg of happyNegatives) {
    for (const base of bases) {
      for (const cow of getSurrounding(neg)) {
        expect(pow(base, cow), `Input was ${base} ^ ${cow}`).toBe(-Math.pow(-base, neg))
      }
    }
  }

  for (const pos of happyPositives) {
    for (const base of bases) {
      for (const cow of getSurrounding(pos)) {
        expect(pow(base, cow), `Input was ${base} ^ ${cow}`).toBe(Math.pow(-base, pos))
      }
    }
  }
})

test('pi and e considered irrational', () => {
  expectMultipleCases(pow, [
    [ -2, Math.PI, NaN ],
    [ -2, -Math.PI, NaN ],
    [ -2, Math.E, NaN ],
    [ -2, -Math.E, NaN ]
  ])
})

test('Various other fractions correct', () => {
  // Random p/q with p,q < 1000
  const fractions = [
    -1.4319526627218935, 0.6513761467889908, -0.7941176470588235,
    0.6122448979591837, -1.3559322033898304, 0.8253424657534246,
    -0.7819025522041764, -0.5578093306288032, -3.076923076923077,
    -0.9684684684684685, 3.2, 0.7263581488933601,
    -0.5854214123006833, 2.2752293577981653, 0.4732620320855615,
    0.8549848942598187, -1.9683794466403162, 0.8108974358974359,
    -0.31746031746031744, -54.125, 1.348441926345609,
    -0.6, -1.3267605633802817, -4,
    0.44545454545454544, -2.521472392638037, -2.1988950276243093,
    -0.5405405405405406, -2.9318181818181817, 0.8770764119601329,
    0.0935672514619883, -0.28150134048257375, 0.2766990291262136,
    -0.44148936170212766, -0.7440347071583514, 1.9227467811158798,
    -0.20066889632107024, -7.076923076923077, -1.417142857142857,
    40.714285714285715, -0.6615384615384615, 2.3846153846153846,
    10.8, -0.6360759493670886, -0.718475073313783,
    1.8719512195121952, 1.4109589041095891, -2.1739130434782608,
    -0.2727272727272727, -0.9873817034700315, 1.2456140350877194,
    -0.7410926365795725, 3.75, 1.2543859649122806,
    2.275, 4.380952380952381, 0.8592233009708737,
    0.6235294117647059, -1.465, -0.7147147147147147,
    1.309090909090909, -4.914285714285715, 25.3,
    0.9439252336448598, -1.1789473684210525, -1.3936170212765957,
    -5.814814814814815, 1.577319587628866, -9.38,
    -0.9724409448818898, 6.386666666666667, 5.642857142857143,
    2.342857142857143, 0.483271375464684, -0.5856079404466501,
    2.125, -1.5928338762214984, 2.782122905027933,
    -3.711864406779661, -0.3057324840764331, 0.9813084112149533,
    -0.3877551020408163, -12.375, -1.5170068027210883,
    -2.1775147928994083, 1.825, 1.7796610169491525,
    -0.6844783715012722, -4.333333333333333, -0.7963800904977375,
    -1.2962962962962963, 0.005420054200542005, -0.5,
    -1.1800766283524904, 66, 5.338983050847458,
    -3.4210526315789473, -0.3738738738738739, -1.0401785714285714,
    1.0209424083769634
  ]
  const alsohappy = [ ...fractions.map(roundUp), ...fractions.map(roundDown) ]
  const angers = [ ...fractions.map(roundUp).map(roundUp), ...fractions.map(roundDown).map(roundDown) ]

  for (const frac of [ ...fractions, ...alsohappy ]) {
    for (const base of bases) {
      expect(pow(base, frac), `Input was ${base} ^ ${frac}`).toBeDefined()
    }
  }

  for (const frac of angers) {
    for (const base of bases) {
      expect(pow(base, frac), `Input was ${base} ^ ${frac}`).toBeNaN()
    }
  }
})
