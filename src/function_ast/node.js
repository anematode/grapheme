// const fs = require( ...
// No, this is not node.js the language.

class ASTNode {
  constructor (params = {}) {

    const {
      parent = null,
      children = []
    } = params

    this.children = children
    this.parent = parent
  }

  applyAll (func, depth = 0) {
    func(this, depth)

    this.children.forEach(child => {
      if (child.applyAll) {
        child.applyAll(func, depth + 1)
      }
    })
  }

  getText () {
    return '(node)'
  }

  compile () {
    let variableNames = this.getVariableNames()

    return new Function(...variableNames, 'return ' + this._getCompileText())
  }

  derivative (variable) {
    let node = new ASTNode()

    node.children = this.children.map(child => child.derivative(variable))

    node.applyAll(child => {
      if (child.children) {
        console.log(child.children)
        child.children.forEach(subchild => subchild.parent = child)
      }
    })

    return node
  }

  getVariableNames () {
    let variableNames = []

    this.applyAll(child => {
      if (child instanceof VariableNode) {
        let name = child.name

        if (variableNames.indexOf(name) === -1) {
          variableNames.push(name)
        }
      }
    })

    return variableNames
  }

  _getCompileText () {
    return this.children.map(child => '(' + child._getCompileText() + ')').join('+')
  }

  clone () {
    let node = new ASTNode()

    node.children = this.children.map(child => child.clone())

    return node
  }
}

class VariableNode extends ASTNode {
  constructor (params = {}) {
    super()

    const {
      name = 'x'
    } = params

    this.name = name
  }

  _getCompileText () {
    return this.name
  }

  derivative (variable) {
    if (variable === this.name) {
      return new ConstantNode({ value: 1 })
    } else {
      return new ConstantNode({ value: 0 })
    }
  }

  getText () {
    return this.name
  }

  clone () {
    return new VariableNode({ name: this.name })
  }
}

const OperatorPatterns = {
  'sin': ['Math.sin', '+'],
  '+': ['', '+'],
  '-': ['', '-'],
  '*': ['', '*'],
  '/': ['', '/'],
  '^': ['', '**'],
  'tan': ['Math.tan'],
  'cos': ['Math.cos'],
  'csc': ['1/Math.sin'],
  'sec': ['1/Math.cos'],
  'cot': ['1/Math.tan'],
  'asin': ['Math.asin'],
  'acos': ['Math.acos'],
  'atan': ['Math.atan'],
  'abs': ['Math.abs'],
  'sqrt': ['Math.sqrt'],
  'cbrt': ['Math.cbrt'],
  'ln': ['Math.log'],
  'log': ['Math.log10']
}

class OperatorNode extends ASTNode {
  constructor (params = {}) {
    super(params)

    const {
      operator = '^'
    } = params

    this.operator = operator
  }

  _getCompileText () {

    let pattern = OperatorPatterns[this.operator]

    if (!pattern) {
      throw new Error('Unrecognized operation')
    }

    return pattern[0] + '(' + this.children.map(child => '(' + child._getCompileText() + ')').join(pattern[1] ? pattern[1] : '+') + ')'
  }

  derivative (variable) {
    let node
    switch (this.operator) {
      case '+':
        node = new OperatorNode({ operator: '+' })
        node.children = this.children.map(child => child.derivative(variable))
        return node
      case '*':
        node = new OperatorNode({ operator: '+' })

        // product rule
        let first = new OperatorNode({ operator: '*' })
        let second = new OperatorNode({ operator: '*' })

        first.children = [this.children[0].clone(), this.children[1].derivative(variable)]
        second.children = [this.children[0].derivative(variable), this.children[1].clone()]

        node.children = [first, second]
        return node
      case '/':
        // Division rules
        node = new OperatorNode({ operator: '/' })

        let top = new OperatorNode({ operator: '-' })
        let topFirst = new OperatorNode({ operator: '*' })
        topFirst.children = [this.children[0].derivative(variable), this.children[1].clone()]
        let topSecond = new OperatorNode({ operator: '*' })
        topSecond.children = [this.children[0], this.children[1].derivative(variable)]
        let bottom = new OperatorNode({ operator: '^' })
        bottom.children = [this.children[1].clone(), new ConstantNode({ value: 2 })]

        node.children = [top, bottom]

        return node
      case '-':
        node = new OperatorNode({ operator: '-' })
        node.children = this.children.map(child => child.derivative(variable))
        return node
      case '^':
        if (this.children[1] instanceof ConstantNode) {
          let power = this.children[1].value

          if (power === 0) {
            // TODO: domain restriction
            return new ConstantNode({ value: 0 })
          }

          // power rule
          let node = new OperatorNode({ operator: '*' })
          let node2 = new OperatorNode({ operator: '*' })
          let pow = new OperatorNode({ operator: '^' })

          pow.children = [this.children[0].clone(), new ConstantNode({ value: power - 1 })]
          node2.children = [this.children[0].derivative(variable), pow]
          node.children = [new ConstantNode({ value: power }), node2]

          return node
        } else {
          return new OperatorNode({
            operator: '*',
            children: [
              this.clone(),
              new OperatorNode({
                operator: '+',
                children: [
                  new OperatorNode({
                    operator: '*',
                    children: [
                      this.children[1].derivative(variable),
                      new OperatorNode({
                        operator: 'ln',
                        children: [
                          this.children[0].clone()
                        ]
                      })
                    ]
                  }),
                  new OperatorNode({
                    operator: '*',
                    children: [
                      new OperatorNode({
                        operator: '/',
                        children: [
                          this.children[1].clone(),
                          this.children[0].clone()
                        ]
                      }),
                      this.children[0].derivative(variable)
                    ]
                  })
                ]
              })
            ]
          })
        }

      case 'sin':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: 'cos',
              children: this.children.map(child => child.clone())
            }),
            new ASTNode(this.children).derivative()
          ]
        })
      case 'cos':
        return new OperatorNode({
          operator: '*',
          children: [
            new ConstantNode({ value: -1 }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'sin',
                  children: this.children.map(child => child.clone())
                }),
                new ASTNode(this.children).derivative()
              ]
            })
          ]
        })
      case 'tan':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '^',
              children: [
                new OperatorNode({
                  operator: 'sec',
                  children: this.children.map(child => child.clone())
                }),
                new ConstantNode({ value: 2 })
              ]
            }),
            new ASTNode(this.children).derivative()
          ]
        })
      case 'csc':
        return new OperatorNode({
          operator: '*',
          children: [
            new ConstantNode({ value: -1 }),
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: '*',
                  children: [
                    new OperatorNode({
                      operator: 'csc',
                      children: [
                        this.children.map(child => child.clone())
                      ]
                    }),
                    new OperatorNode({
                      operator: 'cot',
                      children: [
                        this.children.map(child => child.clone())
                      ]
                    })
                  ]
                }),
                new ASTNode(this.children).derivative(variable)
              ]
            })
          ]
        })
      case 'sec':
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'sec',
                  children: [
                    this.children.map(child => child.clone())
                  ]
                }),
                new OperatorNode({
                  operator: 'tan',
                  children: [
                    this.children.map(child => child.clone())
                  ]
                })
              ]
            }),
            new ASTNode(this.children).derivative(variable)
          ]
        })
      case 'cot':
        return new OperatorNode({
          operator: '*',
          children: [new ConstantNode({ value: -1 }), new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: '^',
                children: [
                  new OperatorNode({
                    operator: 'sec',
                    children: this.children.map(child => child.clone())
                  }),
                  new ConstantNode({ value: 2 })
                ]
              }),
              new ASTNode(this.children).derivative()
            ]
          })]
        })
    }
  }

  getText () {
    return this.operator
  }

  clone () {
    let node = new OperatorNode({ operator: this.operator })

    node.children = this.children.map(child => child.clone())

    return node
  }
}

class ConstantNode extends ASTNode {
  constructor (params = {}) {
    super()

    const {
      value = 0
    } = params

    this.value = value
  }

  _getCompileText () {
    return this.value + ''
  }

  derivative () {
    return new ConstantNode({ value: 0 })
  }

  getText () {
    return '' + this.value
  }

  clone () {
    return new ConstantNode({ value: this.value })
  }
}

export { VariableNode, OperatorNode, ConstantNode, ASTNode }
