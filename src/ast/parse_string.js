/**
 * In this file, we convert strings representing expressions in Grapheme into their ASTNode counterparts. For example,
 * x^2 is compiled to OperatorNode{operator=^, children=[VariableNode{name="x"}, ConstantNode{value="2"}]}
 */
import {
  ConstantNode,
  VariableNode,
  OperatorNode,
  ASTGroup,
  ASTNode
} from './node.js'
import { toMathematicalType } from './builtin_types.js'

const operator_regex = /^[*\-\/+^]|^[<>]=?|^[=!]=|^and\s+|^or\s+/
const function_regex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(/
const constant_regex = /^[0-9]*\.?[0-9]*e?[0-9]+/
const variable_regex = /^[a-zA-Z_][a-zA-Z0-9_]*/
const paren_regex = /^[()\[\]]/
const comma_regex = /^,/
const string_regex = /^"(?:[^"\\]|\\.)*"/

/**
 * Error thrown when the parser gets pissed
 */
export class ParserError extends Error {
  constructor (message) {
    super(message)

    this.name = 'ParserError'
  }
}

/**
 * Helper function to throw an error at a specific index in a string.
 * @param string {String} The string to complain about
 * @param index {number} The index in the string where the error occurred
 * @param message {String} The error message
 */
export function getAngryAt (string, index = 0, message = "I'm angry!") {
  // Spaces to offset the caret to the correct place along the string
  const spaces = ' '.repeat(index)

  throw new ParserError(
    message + ' at index ' + index + ':\n' + string + '\n' + spaces + '^'
  )
}


/**
 * Take a string and check whether its parentheses are balanced, throwing a ParserError if not.
 * @param string
 */
function checkParensBalanced (string) {
  // Stack of parentheses
  const stack = []

  let i = 0
  let err = false

  outer: for (; i < string.length; ++i) {
    const chr = string[i]

    switch (chr) {
      case '(':
      case '[':
        stack.push(chr)
        break
      case ')':
      case ']':
        if (stack.length === 0) {
          err = true
          break outer
        }

        if (chr === ')') {
          let pop = stack.pop()

          if (pop !== '(') {
            err = true
            break outer
          }
        } else {
          let pop = stack.pop()

          if (pop !== '[') {
            err = true
            break outer
          }
        }
    }
  }

  if (stack.length !== 0) err = true

  if (err) getAngryAt(string, i, 'Unbalanced parentheses/brackets')
}

// Make sure the variable name isn't a member of the empty object
let testObj = {}
export function isValidVariableName (str) {
  return (
    typeof str === 'string' &&
    !!str.match(variable_regex) &&
    str[0] !== '$' &&
    !testObj[str]
  )
}

function * tokenizer (string) {
  string = string.trimEnd()

  let i = 0
  let prev_len = string.length

  let original_string = string

  while (string) {
    string = string.trim()

    i += prev_len - string.length
    prev_len = string.length

    let match

    do {
      match = string.match(paren_regex)

      if (match) {
        yield {
          type: 'paren',
          paren: match[0],
          index: i
        }
        break
      }

      match = string.match(constant_regex)

      if (match) {
        yield {
          type: 'constant',
          value: match[0],
          index: i
        }
        break
      }

      match = string.match(operator_regex)

      if (match) {
        yield {
          type: 'operator',
          op: match[0].replace(/\s+/g, ''),
          index: i
        }
        break
      }

      match = string.match(comma_regex)

      if (match) {
        yield {
          type: 'comma',
          index: i
        }
        break
      }

      match = string.match(function_regex)

      if (match) {
        yield {
          type: 'function',
          name: match[1],
          index: i
        }

        yield {
          type: 'paren',
          paren: '(',
          index: i + match[1].length
        }

        break
      }

      match = string.match(variable_regex)

      if (match) {
        yield {
          type: 'variable',
          name: match[0],
          index: i
        }

        break
      }

      match = string.match(string_regex)

      if (match) {
        yield {
          type: 'string',
          contents: match[0].slice(1, -1),
          index: i
        }
      }

      getAngryAt(original_string, i, 'Unrecognized token')
    } while (false)

    let len = match[0].length

    string = string.slice(len)
  }
}

function checkValid (string, tokens) {
  for (let i = 0; i < tokens.length - 1; ++i) {
    let token1 = tokens[i]
    let token2 = tokens[i + 1]

    let token2IsUnary = token2.op === '-' || token2.op === '+'

    if (
      (token1.type === 'operator' || token1.type === 'comma') &&
      (token2.type === 'operator' || token2.type === 'comma') &&
      (!token2IsUnary || i === tokens.length - 2)
    ) {
      getAngryAt(string, token2.index, 'No consecutive operators/commas')
    }
    if (token1.paren === '(' && token2.paren === ')')
      getAngryAt(string, token2.index, 'No empty parentheses')
    if (token1.paren === '[' && token2.paren === ']')
      getAngryAt(string, token2.index, 'No empty brackets')
    if (token1.type === 'operator' && token2.paren === ')')
      getAngryAt(
        string,
        token2.index,
        'No operator followed by closing parenthesis'
      )
    if (token1.type === 'operator' && token2.paren === ']')
      getAngryAt(
        string,
        token2.index,
        'No operator followed by closing bracket'
      )
    if (token1.type === 'comma' && token2.paren === ')')
      getAngryAt(
        string,
        token2.index,
        'No comma followed by closing parenthesis'
      )
    if (token1.type === 'comma' && token2.paren === ']')
      getAngryAt(string, token2.index, 'No comma followed by closing bracket')
    if (token1.paren === '(' && token2.type === 'comma')
      getAngryAt(string, token2.index, 'No comma after starting parenthesis')
    if (token1.paren === '[' && token2.type === 'comma')
      getAngryAt(string, token2.index, 'No comma after starting bracket')
    if (token1.paren === '(' && token2.type === 'operator' && !token2IsUnary)
      getAngryAt(string, token2.index, 'No operator after starting parenthesis')
    if (token1.paren === '[' && token2.type === 'operator' && !token2IsUnary)
      getAngryAt(string, token2.index, 'No operator after starting bracket')
  }

  if (
    tokens[0].type === 'comma' ||
    (tokens[0].type === 'operator' &&
      !(tokens[0].op === '-' || tokens[0].op === '+'))
  )
    getAngryAt(string, 0, 'No starting comma/operator')

  const last_token = tokens[tokens.length - 1]
  if (last_token.type === 'comma' || last_token.type === 'operator')
    getAngryAt(string, tokens.length - 1, 'No ending comma/operator')
}

/**
 * Find a pair of parentheses in a list of tokens, namely the first one as indexed by the closing paren/bracket. For
 * example, in (x(y(z)(w))) it will find (z).
 * @param children
 * @returns {number[]}
 */
function findParenIndices (children) {
  let startIndex = -1

  for (let i = 0; i < children.length; ++i) {
    let child = children[i]
    if (!child.paren) continue

    if (child.paren === '(' || child.paren === '[') startIndex = i

    if ((child.paren === ')' || child.paren === ']') && startIndex !== -1)
      return [startIndex, i]
  }
}

/**
 * Given a string like "1.5", "3e10", etc., determine whether it is an integer. Assumes the string is well-formed.
 * @param s {string}
 * @return {boolean}
 */
function isStringInteger (s) {
  if (s[0] === '-') s = s.slice(1) // trim leading '-'

  let exponent = 0, mIntTrailingZeros = Infinity, mFracLen = 0
  let e = s.indexOf('e')

  // If mFracLen = 0 (no fractional part) and mIntTrailingZeros = 0 (no integer part), the result is 0, so integer
  // If mFracLen > 0 (fractional part), integer if exponent >= mFracLen
  // If mFracLen = 0 (no fractional part), integer if exponent >= -mIntTrailingZeros

  if (e !== -1) { // get exponent
    exponent = parseInt(s.slice(e + 1))

    if (Number.isNaN(exponent)) throw new Error("Unrecognized exponent " + s.slice(e + 1))
  } else {
    e = s.length
  }

  let p = s.indexOf('.')
  if (p !== -1) {
    for (let i = e - 1; i > p; --i) {
      // find trailing zeros
      if (s[i] !== '0') {
        mFracLen = i - p
        break
      }
    }
  } else {
    p = e
  }

  for (let i = p - 1; i >= 0; --i) {
    if (s[i] !== '0') {
      mIntTrailingZeros = p - i
    }
  }

  if (mFracLen !== 0) {
    return exponent >= mFracLen
  } else {
    if (mIntTrailingZeros !== 0) {
      return exponent > -mIntTrailingZeros
    } else {
      // 0
      return true
    }
  }
}

/**
 * Convert constants and variables to their ASTNode counterparts
 * @param tokens {Array}
 */
function processConstantsAndVariables (tokens) {
  for (let i = 0; i < tokens.length; ++i) {
    let token = tokens[i]

    switch (token.type) {
      case 'constant':
        let node = new ConstantNode({ value: token.value })
        node.type = toMathematicalType(isStringInteger(token.value) ? 'int' : 'real')

        tokens[i] = node

        break
      case 'variable':
        tokens[i] = new VariableNode({ name: token.name })
        break
    }
  }
}

// To process parentheses, we find pairs of them and combine them into ASTNodes containing the nodes and
// tokens between them. We already know the parentheses are balanced, which is a huge help here. We basically go
// through each node recursively and convert all paren pairs to a node, then recurse into those new nodes
function processParentheses (rootNode) {
  rootNode.applyAll(node => {
    let parensRemaining = true
    while (parensRemaining) {
      parensRemaining = false
      let indices = findParenIndices(node.children)

      if (indices) {
        parensRemaining = true

        let newNode = new ASTGroup()
        let expr = node.children.splice(
          indices[0],
          indices[1] - indices[0] + 1,
          newNode
        )

        newNode.children = expr.slice(1, expr.length - 1)
      }
    }
  }, true)
}

// Turn function tokens followed by ASTNodes into OperatorNodes
function processFunctions (rootNode) {
  rootNode.applyAll(node => {
    let children = node.children

    for (let i = 0; i < children.length; ++i) {
      let token = children[i]

      if (token.type === 'function') {
        let newNode = new OperatorNode({ name: token.name })

        children[i] = newNode

        // Take children from the node coming immediately after
        newNode.children = children[i + 1].children

        // Remove the node immediately after
        children.splice(i + 1, 1)
      }
    }
  }, true)
}

// Given a node and an index i of a binary operator, combine the nodes immediately to the left and right of the node
// into a single binary operator
function combineBinaryOperator (node, i) {
  const children = node.children
  let newNode = new OperatorNode({ name: children[i].op })

  newNode.children = [children[i - 1], children[i + 1]]

  children.splice(i - 1, 3, newNode)
}

// Process the highest precedence operators. Note that e^x^2 = (e^x)^2 and e^-x^2 = e^(-x^2).
function processUnaryAndExponentiation (root) {
  root.applyAll(node => {
    let children = node.children

    // We iterate backwards
    for (let i = children.length - 1; i >= 0; --i) {
      let child = children[i]
      if (child instanceof ASTNode || !child.op) continue

      if (child.op === '-') {
        // If the preceding token is an unprocessed non-operator token, or node, then it's a binary expression
        if (i !== 0 && children[i - 1].type !== 'operator') continue

        let newNode = new OperatorNode({ name: '-' })
        newNode.children = [children[i + 1]]

        children.splice(i, 2, newNode)
      } else if (child.op === '+') {
        // See above
        if (i !== 0 && children[i - 1].type !== 'operator') continue

        // Unary + is considered a no-op
        children.splice(i, 1)
      } else if (child.op === '^') {
        combineBinaryOperator(node, i)

        --i
      }
    }
  }, true)
}

// Combine binary operators, going from left to right, with equal precedence for all
function processOperators (root, operators) {
  root.applyAll(node => {
    let children = node.children

    for (let i = 0; i < children.length; ++i) {
      let child = children[i]
      if (child instanceof ASTNode || !child.op) continue

      if (operators.includes(child.op)) {
        combineBinaryOperator(node, i)
        --i
      }
    }
  }, true)
}

// The index of each operator is also an enum, which is used in comparison chains to describe which operator is being used
const comparisonOperators = ['<', '<=', '==', '!=', '>=', '>']

// Process "comparison chains", which are sequences of the form 0 <= x < 2. Internally these are transformed into
// "comparison_chain" operators, which have the form comparison_chain(0, 1 (enum comparison), x, 0 (enum comparison), 2). Gross, but
// it's hard to cleanly represent these comparison chains otherwise. You *could* represent them using boolean operations,
// but that duplicates the internal nodes which is inefficient
function processComparisonChains (root) {
  root.applyAll(node => {
    // TODO: process backwards
    const children = node.children

    for (let i = 0; i < children.length; ++i) {
      let child = children[i]
      if (child instanceof ASTNode || !child.op) continue

      if (comparisonOperators.includes(children[i].op)) {
        let comparisonChainFound = false

        // Found a comparison operator token; we now check for whether the tokens +2, +4, etc. ahead of it are also
        // comparison tokens. If so, we emit a comparison chain

        // Index of the last comparison token, plus 2
        let j = i + 2
        for (; j < children.length; j += 2) {
          let nextChild = children[j]
          if (nextChild instanceof ASTNode || !nextChild.op) continue

          if (comparisonOperators.includes(children[j].op)) {
            comparisonChainFound = true
          } else {
            break
          }
        }

        if (comparisonChainFound) {
          // The nodes i, i+2, i+4, ..., j-4, j-2 are all comparison nodes. Thus, all nodes in the range i-1 ... j-1
          // should be included in the comparison chain

          let comparisonChain = new OperatorNode({ name: 'comparison_chain' })

          // Looks something like [ ASTNode, '<', ASTNode, '<=', ASTNode ]
          let removedChildren = children.splice(
            i - 1,
            j - i + 1,
            comparisonChain // inserts the comparison chain as replacement
          )

          // [ ASTNode, ASTNode, ASTNode ]
          let cchainChildren = (comparisonChain.children = [])

          let comparisons = [] // [ '<', '<=' ]
          for (let i = 1; i < removedChildren.length - 2; i += 2) {
            comparisons.push(removedChildren[i].op)
          }

          for (let i = 0; i < removedChildren.length; i += 2) {
            cchainChildren.push(removedChildren[i])
          }

          comparisonChain.extraArgs.comparisons = comparisons

          return
        }
      }
    }
  }, true)
}

// Remove residual commas from the node
function removeCommas (root) {
  root.applyAll(node => {
    let children = node.children
    let i = children.length
    while (i--) {
      if (children[i].type === 'comma') children.splice(i, 1)
    }
  }, true)
}

/**
 * Parse a given list of tokens, returning a single ASTNode. At this point, the tokens are a list of the form
 * { type: "function"|"variable"|"paren"|"operator"|"constant"|"comma", index: <index of the token in the original string>,
 *  op?: <operator>, name?: <name of variable>, paren?: <type of paren> }
 * @param tokens
 * @returns {ASTNode}
 */
function parseTokens (tokens) {
  processConstantsAndVariables(tokens)
  let root = new ASTGroup()

  root.children = tokens

  processParentheses(root)
  processFunctions(root)
  processUnaryAndExponentiation(root)

  // PEMDAS
  processOperators(root, ['*', '/'])
  processOperators(root, ['-', '+'])

  processComparisonChains(root)
  processOperators(root, comparisonOperators)
  processOperators(root, ['and', 'or'])

  removeCommas(root)

  return root
}

function parseString (string, types = {}) {
  checkParensBalanced(string)

  let tokens = []

  for (let token of tokenizer(string)) {
    tokens.push(token)
  }

  checkValid(string, tokens)

  let node = parseTokens(tokens).children[0]

  return node
}

export { parseString, tokenizer }
