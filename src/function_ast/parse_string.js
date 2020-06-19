import {OperatorNode, VariableNode, ConstantNode, ASTNode, OperatorSynonyms} from "./node"

// a * b - c * d ^ g

let operator_regex = /^[*\-\/+^]|^[<>]=?|^[=!]=|^and|^or/
let function_regex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(/
let constant_regex = /^-?[0-9]*\.?[0-9]*e?[0-9]+/
let variable_regex = /^[a-zA-Z_][a-zA-Z0-9_]*/
let paren_regex = /^[()\[\]]/
let comma_regex = /^,/

function get_angry_at(string, index=0, message="I'm angry!") {
  let spaces = ""

  for (let i = 0; i < index; ++i)
    spaces += " "

  throw new Error(message + " at index " + index + ":\n" + string + "\n" + spaces + "^")
}

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

    get_angry_at(string, i, "Unbalanced parentheses/brackets")
  }

}

function* tokenizer(string) {
  // what constitutes a token? a sequence of n letters, one of the operators *-/+^, parentheses or brackets

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
          type: "paren",
          paren: match[0],
          index: i
        }
        break
      }

      match = string.match(operator_regex)

      if (match) {
        yield {
          type: "operator",
          op: match[0],
          index: i
        }
        break
      }

      match = string.match(constant_regex)

      if (match) {
        yield {
          type: "constant",
          value: match[0],
          index: i
        }
        break
      }

      match = string.match(comma_regex)

      if (match) {
        yield {
          type: "comma",
          index: i
        }
        break
      }

      match = string.match(function_regex)

      if (match) {
        yield {
          type: "function",
          name: match[1],
          index: i
        }

        yield {
          type: "paren",
          paren: '(',
          index: i + match[1].length
        }

        break
      }

      match = string.match(variable_regex)

      if (match) {
        yield {
          type: "variable",
          name: match[0],
          index: i
        }

        break
      }

      get_angry_at(original_string, i, "Unrecognized token")
    } while (false)

    let len = match[0].length

    string = string.slice(len)
  }
}

function check_valid(string, tokens) {
  for (let i = 0; i < tokens.length - 1; ++i) {
    let token1 = tokens[i]
    let token2 = tokens[i+1]

    if ((token1.type === "operator" || token1.type === "comma") && (token2.type === "operator" || token2.type === "comma") &&
      (!(token2.op === '-' && token2.op === '+') || i === tokens.length - 2))
      get_angry_at(string, token2.index, "No consecutive operators/commas")
    if (token1.paren === "(" && token2.paren === ")")
      get_angry_at(string, token2.index, "No empty parentheses")
    if (token1.paren === "[" && token2.paren === "]")
      get_angry_at(string, token2.index, "No empty brackets")
    if (token1.type === "operator" && token2.paren === ")")
      get_angry_at(string, token2.index, "No operator followed by closing parenthesis")
    if (token1.type === "operator" && token2.paren === "]")
      get_angry_at(string, token2.index, "No operator followed by closing bracket")
    if (token1.type === "comma" && token2.paren === ")")
    get_angry_at(string, token2.index, "No comma followed by closing parenthesis")
    if (token1.type === "comma" && token2.paren === "]")
      get_angry_at(string, token2.index, "No comma followed by closing bracket")
    if (token1.paren === '(' && token2.type === "comma")
      get_angry_at(string, token2.index, "No comma after starting parenthesis")
    if (token1.paren === '[' && token2.type === "comma")
      get_angry_at(string, token2.index, "No comma after starting bracket")
  }

  if (tokens[0].type === "comma" || (tokens[0].type === "operator" && !(tokens[0].op === '-' || tokens[0].op === '+')))
    get_angry_at(string, 0, "No starting comma/operator")

  const last_token = tokens[tokens.length - 1]
  if (last_token.type === "comma" || last_token.type === "operator")
    get_angry_at(string, tokens.length - 1, "No ending comma/operator")
}

function find_paren_indices(children) {
  let start_paren_index = -1;

  for (let i = 0; i < children.length; ++i) {
    let child = children[i]

    if (child.paren === '(' || child.paren === '[')
      start_paren_index = i

    if ((child.paren === ')' || child.paren === ']') && start_paren_index !== -1)
      return [start_paren_index, i]
  }
}

function parse_tokens(tokens) {
  for (let i = 0; i < tokens.length; ++i) {
    let token = tokens[i]

    switch (token.type) {
      case "constant":
        tokens[i] = new ConstantNode({value: parseFloat(token.value), text: token.value})
        break
      case "variable":
        tokens[i] = new VariableNode({name: token.name})
        break
    }
  }

  let root = new ASTNode()
  root.children = tokens

  let parens_remaining = true

  while (parens_remaining) {
    parens_remaining = false

    root.applyAll(child => {
      if (!(child instanceof ASTNode))
        return

      let indices = find_paren_indices(child.children)


      if (indices) {
        parens_remaining = true

        let new_node = new ASTNode()
        new_node.children = child.children.slice(indices[0] + 1, indices[1])
        child.children = child.children.slice(0, indices[0]).concat([
          new_node
        ]).concat(child.children.slice(indices[1] + 1))
      }
    })
  }

  root.applyAll(child => {
    let children = child.children

    if (children) {
      let first_child = children[0]

      if (first_child) {
        if (first_child.op === '+' || first_child.op === '-') {
          children.splice(0, 0, new ConstantNode({value: 0, invisible: true}))
        }
      }
    }
  })

  let functions_remaining = true

  while (functions_remaining) {
    functions_remaining = false

    root.applyAll(child => {
      let children = child.children

      if (children) {
        for (let i = 0; i < children.length; ++i) {
          let child_test = children[i]

          if (child_test.type === "function") {
            let synonym = OperatorSynonyms[child_test.name]

            let function_node = new OperatorNode({ operator: synonym ? synonym : child_test.name })

            children[i] = function_node

            function_node.children = children[i + 1].children

            functions_remaining = true

            children.splice(i + 1, 1)
            return
          }
        }
      }
    })
  }

  let unary_remaining = true

  while (unary_remaining) {
    unary_remaining = false

    root.applyAll(child => {
      let children = child.children

      for (let i = 0; i < children.length - 2; ++i) {
        let child1 = children[i]
        let child2 = children[i + 1]

        if (child1.op && (child2.op === '-' || child2.op === '+')) {
          const egg = new OperatorNode({
            operator: "*",
            children: [
              new ConstantNode({ value: child2.op === '-' ? -1 : 1 }),
              children[i + 2]
            ]
          })

          child.children = children.slice(0, i + 1).concat([egg]).concat(children.slice(i + 3))
          unary_remaining = true

          return
        }
      }
    })
  }

  function combineOperators(operators) {
    let operators_remaining = true

    while (operators_remaining) {
      operators_remaining = false

      root.applyAll(child => {
        let children = child.children

        for (let i = 0; i < children.length; ++i) {
          let child_test = children[i]

          if (operators.includes(child_test.op)) {
            let new_node = new OperatorNode({operator: child_test.op})

            new_node.children = [children[i-1],children[i+1]]

            child.children = children.slice(0, i-1).concat([new_node]).concat(children.slice(i+2))
            operators_remaining = true

            return
          }
        }
      })
    }
  }

  combineOperators(['^'])
  combineOperators(['*','/'])
  combineOperators(['-','+'])

  const comparisonOperators = ['<', '<=', '==', '!=', '>=', '>']

  // CChain
  let cchain_remaining = true
  while (cchain_remaining) {
    cchain_remaining = false

    root.applyAll(child => {
      const children = child.children
      let cchain_found = false

      for (let i = 0; i < children.length; ++i) {
        if (comparisonOperators.includes(children[i].op)) {
          let j
          for (j = i + 2; j < children.length; j += 2) {
            if (comparisonOperators.includes(children[j].op)) {
              cchain_found = true
            } else {
              break
            }
          }

          if (cchain_found) {
            child.children = children.slice(0, i-1).concat(new OperatorNode({
              operator: "cchain",
              children: children.slice(i-1, j).map(child => child.op ? new VariableNode({name: child.op}) : child)
            })).concat(children.slice(j))

            cchain_remaining = true

            return

          }
        }
      }
    })
  }

  combineOperators(comparisonOperators)
  combineOperators(["and", "or"])

  root.applyAll(child => {
    if (child.children) {
      child.children = child.children.filter(child => child.type !== "comma")
    }
  })

  root.setParents()

  return root
}

function parse_string(string) {
  check_parens_balanced(string)

  let tokens = []

  for (let token of tokenizer(string)) {
    tokens.push(token)
  }

  check_valid(string, tokens)

  return parse_tokens(tokens)
}

export {parse_string, tokenizer}
