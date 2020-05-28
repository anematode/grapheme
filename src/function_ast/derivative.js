import { ConstantNode, OperatorNode } from './node'

function operator_derivative(operatorNode, variable='x') {
  let node
  switch (operatorNode.operator) {
    case '+':
      node = new OperatorNode({ operator: '+' })
      node.children = operatorNode.children.map(child => child.derivative(variable))
      return node
    case '*':
      node = new OperatorNode({ operator: '+' })

      // product rule
      let first = new OperatorNode({ operator: '*' })
      let second = new OperatorNode({ operator: '*' })

      first.children = [operatorNode.children[0].clone(), operatorNode.children[1].derivative(variable)]
      second.children = [operatorNode.children[0].derivative(variable), operatorNode.children[1].clone()]

      node.children = [first, second]
      return node
    case '/':
      // Division rules
      node = new OperatorNode({ operator: '/' })

      let top = new OperatorNode({ operator: '-' })
      let topFirst = new OperatorNode({ operator: '*' })
      topFirst.children = [operatorNode.children[0].derivative(variable), operatorNode.children[1].clone()]
      let topSecond = new OperatorNode({ operator: '*' })
      topSecond.children = [operatorNode.children[0], operatorNode.children[1].derivative(variable)]
      let bottom = new OperatorNode({ operator: '^' })
      bottom.children = [operatorNode.children[1].clone(), new ConstantNode({ value: 2 })]

      node.children = [top, bottom]

      return node
    case '-':
      node = new OperatorNode({ operator: '-' })
      node.children = operatorNode.children.map(child => child.derivative(variable))
      return node
    case '^':
      if (operatorNode.children[1] instanceof ConstantNode) {
        let power = operatorNode.children[1].value

        if (power === 0) {
          return new ConstantNode({ value: 0 })
        }

        // power rule
        let node = new OperatorNode({ operator: '*' })
        let node2 = new OperatorNode({ operator: '*' })
        let pow = new OperatorNode({ operator: '^' })

        pow.children = [operatorNode.children[0].clone(), new ConstantNode({ value: power - 1 })]
        node2.children = [operatorNode.children[0].derivative(variable), pow]
        node.children = [new ConstantNode({ value: power }), node2]

        return node
      } else if (operatorNode.children[0] instanceof ConstantNode) {
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: 'ln',
              children: [
                operatorNode.children[0].clone()
              ]
            }),
            new OperatorNode({
              operator: '*',
              children: [
                operatorNode.clone(),
                operatorNode.children[1].derivative(variable)
              ]
            })
          ]
        })
      } else {
        return new OperatorNode({
          operator: '*',
          children: [
            operatorNode.clone(),
            new OperatorNode({
              operator: '+',
              children: [
                new OperatorNode({
                  operator: '*',
                  children: [
                    operatorNode.children[1].derivative(variable),
                    new OperatorNode({
                      operator: 'ln',
                      children: [
                        operatorNode.children[0].clone()
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
                        operatorNode.children[1].clone(),
                        operatorNode.children[0].clone()
                      ]
                    }),
                    operatorNode.children[0].derivative(variable)
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
            children: operatorNode.children[0].clone()
          }),
          operatorNode.children[0].derivative(variable)
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
                children: operatorNode.children[0].clone()
              }),
              operatorNode.children[0].derivative(variable)
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
                children: operatorNode.children[0].clone()
              }),
              new ConstantNode({ value: 2 })
            ]
          }),
          operatorNode.children[0].derivative(variable)
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
                      operatorNode.children[0].clone()
                    ]
                  }),
                  new OperatorNode({
                    operator: 'cot',
                    children: [
                      operatorNode.children[0].clone()
                    ]
                  })
                ]
              }),
              operatorNode.children[0].derivative(variable)
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
                  operatorNode.children[0].clone()
                ]
              }),
              new OperatorNode({
                operator: 'tan',
                children: [
                  operatorNode.children[0].clone()
                ]
              })
            ]
          }),
          operatorNode.children[0].derivative(variable)
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
                  operator: 'csc',
                  children: operatorNode.children[0].clone()
                }),
                new ConstantNode({ value: 2 })
              ]
            }),
            operatorNode.children[0].derivative(variable)
          ]
        })]
      })
    case 'sqrt':
      return new OperatorNode({
        operator: '*',
        children: [
          new ConstantNode({ value: 0.5 }),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: '^',
                children: [
                  operatorNode.children[0].clone(),
                  new ConstantNode({ value: -0.5 })
                ]
              }),
              operatorNode.children[0].derivative(variable)
            ]
          })
        ]
      })
    case 'cbrt':
      return new OperatorNode({
        operator: '*',
        children: [
          new ConstantNode({ value: 1 / 3 }),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: '^',
                children: [
                  operatorNode.children[0].clone(),
                  new ConstantNode({ value: -2 / 3 })
                ]
              }),
              operatorNode.children[0].derivative(variable)
            ]
          })
        ]
      })
    case 'asin':
      return new OperatorNode({
        operator: '/',
        children: [
          operatorNode.children[0].derivative(variable),
          new OperatorNode({
            operator: 'sqrt',
            children: [
              new OperatorNode({
                operator: '-',
                children: [
                  new ConstantNode({ value: 1 }),
                  new OperatorNode({
                    operator: '^',
                    children: [
                      operatorNode.children[0].clone(),
                      new ConstantNode({ value: 2 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    case 'acos':
      return new OperatorNode({
        operator: '*',
        children: [new ConstantNode({ value: -1 }), new OperatorNode({
          operator: '/',
          children: [
            operatorNode.children[0].derivative(variable),
            new OperatorNode({
              operator: 'sqrt',
              children: [
                new OperatorNode({
                  operator: '-',
                  children: [
                    new ConstantNode({ value: 1 }),
                    new OperatorNode({
                      operator: '^',
                      children: [
                        operatorNode.children[0].clone(),
                        new ConstantNode({ value: 2 })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })]
      })
    case 'atan':
      return new OperatorNode({
        operator: '/',
        children: [
          operatorNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '+',
            children: [
              new ConstantNode({ value: 1 }),
              new OperatorNode({
                operator: '^',
                children: [
                  operatorNode.children[0].clone(),
                  new ConstantNode({ value: 2 })
                ]
              })
            ]
          })
        ]
      })
    case 'acot':
      return new OperatorNode({
        operator: '/',
        children: [
          new OperatorNode({
            operator: '*',
            children: [new ConstantNode({ value: -1 }), operatorNode.children[0].derivative(variable)]
          }),
          new OperatorNode({
            operator: '+',
            children: [
              new ConstantNode({ value: 1 }),
              new OperatorNode({
                operator: '^',
                children: [
                  operatorNode.children[0].clone(),
                  new ConstantNode({ value: 2 })
                ]
              })
            ]
          })
        ]
      })
    case 'asec':
      return new OperatorNode({
        operator: '/',
        children: [
          operatorNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'abs',
                children: [
                  operatorNode.children[0].clone()
                ]
              }),
              new OperatorNode({
                operator: 'sqrt',
                children: [
                  new OperatorNode({
                    operator: '-',
                    children: [
                      new OperatorNode({
                        operator: '^',
                        children: [
                          operatorNode.children[0].clone(),
                          new ConstantNode({ value: 2 })
                        ]
                      }),
                      new ConstantNode({ value: 1 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    case 'acsc':
      return new OperatorNode({
        operator: '/',
        children: [
          new OperatorNode({
            operator: '*',
            children: [new ConstantNode({ value: -1 }), operatorNode.children[0].derivative(variable)]
          }),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'abs',
                children: [
                  operatorNode.children[0].clone()
                ]
              }),
              new OperatorNode({
                operator: 'sqrt',
                children: [
                  new OperatorNode({
                    operator: '-',
                    children: [
                      new OperatorNode({
                        operator: '^',
                        children: [
                          operatorNode.children[0].clone(),
                          new ConstantNode({ value: 2 })
                        ]
                      }),
                      new ConstantNode({ value: 1 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    case 'sinh':
      return new OperatorNode({
        operator: '*',
        children: [
          operatorNode.children[0].derivative(),
          new OperatorNode({
            operator: 'cosh',
            children: [
              operatorNode.children[0].clone()
            ]
          })
        ]
      })
    case 'cosh':
      return new OperatorNode({
        operator: '*',
        children: [
          operatorNode.children[0].derivative(),
          new OperatorNode({
            operator: 'sinh',
            children: [
              operatorNode.children[0].clone()
            ]
          })
        ]
      })
    case 'tanh':
      return new OperatorNode({
        operator: '*',
        children: [
          new OperatorNode({
            operator: '^',
            children: [
              new OperatorNode({
                operator: 'sech',
                children: operatorNode.children[0].clone()
              }),
              new ConstantNode({ value: 2 })
            ]
          }),
          operatorNode.children[0].derivative(variable)
        ]
      })
    case 'csch':
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
                    operator: 'csch',
                    children: [
                      operatorNode.children[0].clone()
                    ]
                  }),
                  new OperatorNode({
                    operator: 'coth',
                    children: [
                      operatorNode.children[0].clone()
                    ]
                  })
                ]
              }),
              operatorNode.children[0].derivative(variable)
            ]
          })
        ]
      })
    case 'sech':
      return new OperatorNode({
        operator: '*',
        children: [new ConstantNode({ value: -1 }), new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '*',
              children: [
                new OperatorNode({
                  operator: 'sech',
                  children: [
                    operatorNode.children[0].clone()
                  ]
                }),
                new OperatorNode({
                  operator: 'tanh',
                  children: [
                    operatorNode.children[0].clone()
                  ]
                })
              ]
            }),
            operatorNode.children[0].derivative(variable)
          ]
        })]
      })
    case 'coth':
      return new OperatorNode({
        operator: '*',
        children: [new ConstantNode({ value: -1 }), new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: '^',
              children: [
                new OperatorNode({
                  operator: 'csch',
                  children: operatorNode.children[0].clone()
                }),
                new ConstantNode({ value: 2 })
              ]
            }),
            operatorNode.children[0].derivative(variable)
          ]
        })]
      })
    case 'asinh':
      return new OperatorNode({
        operator: '/',
        children: [
          operatorNode.children[0].derivative(variable),
          new OperatorNode({
            operator: 'sqrt',
            children: [
              new OperatorNode({
                operator: '+',
                children: [
                  new ConstantNode({ value: 1 }),
                  new OperatorNode({
                    operator: '^',
                    children: [
                      operatorNode.children[0].clone(),
                      new ConstantNode({ value: 2 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    case 'acosh':
      return new OperatorNode({
        operator: '*',
        children: [new ConstantNode({ value: -1 }), new OperatorNode({
          operator: '/',
          children: [
            operatorNode.children[0].derivative(variable),
            new OperatorNode({
              operator: 'sqrt',
              children: [
                new OperatorNode({
                  operator: '-',
                  children: [
                    new OperatorNode({
                      operator: '^',
                      children: [
                        operatorNode.children[0].clone(),
                        new ConstantNode({ value: 2 })
                      ]
                    }),
                    new ConstantNode({ value: 1 })
                  ]
                })
              ]
            })
          ]
        })]
      })
    case 'atanh':
    case 'acoth':
      return new OperatorNode({
        operator: '/',
        children: [
          operatorNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '-',
            children: [
              new ConstantNode({ value: 1 }),
              new OperatorNode({
                operator: '^',
                children: [
                  operatorNode.children[0].clone(),
                  new ConstantNode({ value: 2 })
                ]
              })
            ]
          })
        ]
      })
    case 'asech':
      return new OperatorNode({
        operator: '/',
        children: [
          new OperatorNode({
            operator: '*',
            children: [
              new ConstantNode({ value: -1 }),
              operatorNode.children[0].derivative(variable)
            ]
          }),
          new OperatorNode({
            operator: '*',
            children: [
              operatorNode.children[0].clone(),
              new OperatorNode({
                operator: 'sqrt',
                children: [
                  new OperatorNode({
                    operator: '-',
                    children: [
                      new OperatorNode({
                        operator: '^',
                        children: [
                          operatorNode.children[0].clone(),
                          new ConstantNode({ value: 2 })
                        ]
                      }),
                      new ConstantNode({ value: 1 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    case 'acsch':
      return new OperatorNode({
        operator: '/',
        children: [
          new OperatorNode({
            operator: '*',
            children: [new ConstantNode({ value: -1 }), operatorNode.children[0].derivative(variable)]
          }),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'abs',
                children: [
                  operatorNode.children[0].clone()
                ]
              }),
              new OperatorNode({
                operator: 'sqrt',
                children: [
                  new OperatorNode({
                    operator: '+',
                    children: [
                      new OperatorNode({
                        operator: '^',
                        children: [
                          operatorNode.children[0].clone(),
                          new ConstantNode({ value: 2 })
                        ]
                      }),
                      new ConstantNode({ value: 1 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    default:
      // No symbolic derivative, oof
      throw new Error('unimplemented')
  }
}

export { operator_derivative }
