import {OperatorNode, VariableNode, ConstantNode} from "./node"

// a * b - c * d ^ g

let operator_regex = /^[*-\/+^]/
let function_regex = /^([^\s\\*-\/+^]+)\(/
let variable_regex = /^[^\s\\*-\/+^()]+/
let paren_regex = /^[()\[\]]/
let comma_regex = /^,/

function check_parens_balanced(string) {
  let stack = []

  let i;
  let err = false
  for (i = 0; i < string.length; ++i) {
    let chr = string[i]

    if (chr === '(') {
      stack.push('(')
    } else if (chr === '[') {
      stack.push('[')
    } else if (chr === ')' || chr === ']') {
      if (stack.length === 0) {
        err = true
        break
      }

      if (chr === ')') {
        let pop = stack.pop()

        if (pop !== '(') {
          err = true
          break
        }
      } else {
        let pop = stack.pop()

        if (pop !== '[') {
          err = true
          break
        }
      }
    }
  }

  if (stack.length !== 0)
    err = true

  if (err) {
    let spaces = ""

    for (let j = 0; j < i; ++j) {
      spaces += ' '
    }

    throw new Error("Unbalanced parentheses/brackets at index " + i + ":\n" + string + "\n" + spaces + "^")
  }

}

function* tokenizer(string) {
  // what constitutes a token? a sequence of n letters, one of the operators *-/+^, parentheses or brackets

  while (string) {
    string = string.trim()
    let match

    do {
      match = string.match(paren_regex)

      if (match) {
        yield {
          type: "paren",
          paren: match[0]
        }
        break
      }

      match = string.match(operator_regex)

      if (match) {
        yield {
          type: "operator",
          operator: match[0]
        }
        break
      }

      match = string.match(comma_regex)

      if (match) {
        yield { type: "comma" }
        break
      }

      match = string.match(function_regex)

      if (match) {
        yield {
          type: "function",
          name: match[1]
        }

        yield {
          type: "paren",
          paren: '('
        }

        break
      }

      match = string.match(variable_regex)

      if (match) {
        yield {
          type: "variable",
          name: match[0]
        }
      }
    } while (false)

    let len = match[0].length

    string = string.slice(len)
  }
}

function parse_string(string) {
  check_parens_balanced(string)

  for (let token of tokenizer(string)) {
    
  }
}

export {parse_string}
