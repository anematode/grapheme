import { ConstantNode, OperatorNode } from './node'

function operator_derivative (opNode, variable = 'x') {
  let node
  switch (opNode.operator) {
    case '>':
    case '>=':
    case '<':
    case '<=':
    case '!=':
    case '==':
      return new ConstantNode({ value: 0 })
    case 'ifelse':
      return new OperatorNode({
        operator: 'ifelse',
        children: [
          opNode.children[0].derivative(variable),
          opNode.children[1],
          opNode.children[2].derivative(variable)
        ]
      })
    case 'piecewise':
      node = opNode.clone()

      for (let i = 1; i < node.children.length; ++i) {
        node.children[i] = node.children[i].derivative(variable)
      }

      if (node.children.length % 2 === 1) {
        let i = node.children.length - 1
        node.children[i] = node.children[i].derivative(variable)
      }

      return node
    case 'cchain':
      return opNode.clone()
    case '+':
      node = new OperatorNode({ operator: '+' })
      node.children = opNode.children.map(child => child.derivative(variable))
      return node
    case '*':
      node = new OperatorNode({ operator: '+' })

      // product rule
      let first = new OperatorNode({ operator: '*' })
      let second = new OperatorNode({ operator: '*' })

      first.children = [opNode.children[0].clone(), opNode.children[1].derivative(variable)]
      second.children = [opNode.children[0].derivative(variable), opNode.children[1].clone()]

      node.children = [first, second]
      return node
    case '/':
      // Division rules
      if (opNode.children[1] instanceof ConstantNode) {
        return new OperatorNode({
          operator: '/',
          children: [opNode.children[0].derivative(variable), opNode.children[1]]
        })
      } else {
        node = new OperatorNode({ operator: '/' })

        let top = new OperatorNode({ operator: '-' })
        let topFirst = new OperatorNode({ operator: '*' })
        topFirst.children = [opNode.children[0].derivative(variable), opNode.children[1].clone()]
        let topSecond = new OperatorNode({ operator: '*' })
        topSecond.children = [opNode.children[0], opNode.children[1].derivative(variable)]

        top.children = [topFirst, topSecond]
        let bottom = new OperatorNode({ operator: '^' })
        bottom.children = [opNode.children[1].clone(), new ConstantNode({ value: 2 })]

        node.children = [top, bottom]
      }

      return node
    case '-':
      node = new OperatorNode({ operator: '-' })
      node.children = opNode.children.map(child => child.derivative(variable))
      return node
    case '^':
      if (opNode.children[1] instanceof ConstantNode) {
        let power = opNode.children[1].value

        if (power === 0) {
          return new ConstantNode({ value: 0 })
        }

        // power rule
        let node = new OperatorNode({ operator: '*' })
        let node2 = new OperatorNode({ operator: '*' })
        let pow = new OperatorNode({ operator: '^' })

        pow.children = [opNode.children[0].clone(), new ConstantNode({ value: power - 1 })]
        node2.children = [opNode.children[0].derivative(variable), pow]
        node.children = [new ConstantNode({ value: power }), node2]

        return node
      } else if (opNode.children[0] instanceof ConstantNode) {
        return new OperatorNode({
          operator: '*',
          children: [
            new OperatorNode({
              operator: 'ln',
              children: [
                opNode.children[0].clone()
              ]
            }),
            new OperatorNode({
              operator: '*',
              children: [
                opNode.clone(),
                opNode.children[1].derivative(variable)
              ]
            })
          ]
        })
      } else {
        return new OperatorNode({
          operator: '*',
          children: [
            opNode.clone(),
            new OperatorNode({
              operator: '+',
              children: [
                new OperatorNode({
                  operator: '*',
                  children: [
                    opNode.children[1].derivative(variable),
                    new OperatorNode({
                      operator: 'ln',
                      children: [
                        opNode.children[0].clone()
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
                        opNode.children[1].clone(),
                        opNode.children[0].clone()
                      ]
                    }),
                    opNode.children[0].derivative(variable)
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
            children: [opNode.children[0].clone()]
          }),
          opNode.children[0].derivative(variable)
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
                children: [opNode.children[0].clone()]
              }),
              opNode.children[0].derivative(variable)
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
                children: [opNode.children[0].clone()]
              }),
              new ConstantNode({ value: 2 })
            ]
          }),
          opNode.children[0].derivative(variable)
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
                      opNode.children[0].clone()
                    ]
                  }),
                  new OperatorNode({
                    operator: 'cot',
                    children: [
                      opNode.children[0].clone()
                    ]
                  })
                ]
              }),
              opNode.children[0].derivative(variable)
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
                  opNode.children[0].clone()
                ]
              }),
              new OperatorNode({
                operator: 'tan',
                children: [
                  opNode.children[0].clone()
                ]
              })
            ]
          }),
          opNode.children[0].derivative(variable)
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
                  children: [opNode.children[0].clone()]
                }),
                new ConstantNode({ value: 2 })
              ]
            }),
            opNode.children[0].derivative(variable)
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
                  opNode.children[0].clone(),
                  new ConstantNode({ value: -0.5 })
                ]
              }),
              opNode.children[0].derivative(variable)
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
                  opNode.children[0].clone(),
                  new ConstantNode({ value: -2 / 3 })
                ]
              }),
              opNode.children[0].derivative(variable)
            ]
          })
        ]
      })
    case 'asin':
      return new OperatorNode({
        operator: '/',
        children: [
          opNode.children[0].derivative(variable),
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
                      opNode.children[0].clone(),
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
            opNode.children[0].derivative(variable),
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
                        opNode.children[0].clone(),
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
          opNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '+',
            children: [
              new ConstantNode({ value: 1 }),
              new OperatorNode({
                operator: '^',
                children: [
                  opNode.children[0].clone(),
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
            children: [new ConstantNode({ value: -1 }), opNode.children[0].derivative(variable)]
          }),
          new OperatorNode({
            operator: '+',
            children: [
              new ConstantNode({ value: 1 }),
              new OperatorNode({
                operator: '^',
                children: [
                  opNode.children[0].clone(),
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
          opNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'abs',
                children: [
                  opNode.children[0].clone()
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
                          opNode.children[0].clone(),
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
            children: [new ConstantNode({ value: -1 }), opNode.children[0].derivative(variable)]
          }),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'abs',
                children: [
                  opNode.children[0].clone()
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
                          opNode.children[0].clone(),
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
          opNode.children[0].derivative(),
          new OperatorNode({
            operator: 'cosh',
            children: [
              opNode.children[0].clone()
            ]
          })
        ]
      })
    case 'cosh':
      return new OperatorNode({
        operator: '*',
        children: [
          opNode.children[0].derivative(),
          new OperatorNode({
            operator: 'sinh',
            children: [
              opNode.children[0].clone()
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
                children: opNode.children[0].clone()
              }),
              new ConstantNode({ value: 2 })
            ]
          }),
          opNode.children[0].derivative(variable)
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
                      opNode.children[0].clone()
                    ]
                  }),
                  new OperatorNode({
                    operator: 'coth',
                    children: [
                      opNode.children[0].clone()
                    ]
                  })
                ]
              }),
              opNode.children[0].derivative(variable)
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
                    opNode.children[0].clone()
                  ]
                }),
                new OperatorNode({
                  operator: 'tanh',
                  children: [
                    opNode.children[0].clone()
                  ]
                })
              ]
            }),
            opNode.children[0].derivative(variable)
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
                  children: [opNode.children[0].clone()]
                }),
                new ConstantNode({ value: 2 })
              ]
            }),
            opNode.children[0].derivative(variable)
          ]
        })]
      })
    case 'asinh':
      return new OperatorNode({
        operator: '/',
        children: [
          opNode.children[0].derivative(variable),
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
                      opNode.children[0].clone(),
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
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: 'sqrt',
              children: [
                new OperatorNode({
                  operator: '-',
                  children: [
                    new OperatorNode({
                      operator: '^',
                      children: [
                        opNode.children[0].clone(),
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
          opNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '-',
            children: [
              new ConstantNode({ value: 1 }),
              new OperatorNode({
                operator: '^',
                children: [
                  opNode.children[0].clone(),
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
              opNode.children[0].derivative(variable)
            ]
          }),
          new OperatorNode({
            operator: '*',
            children: [
              opNode.children[0].clone(),
              new OperatorNode({
                operator: 'sqrt',
                children: [
                  new OperatorNode({
                    operator: '-',
                    children: [
                      new OperatorNode({
                        operator: '^',
                        children: [
                          opNode.children[0].clone(),
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
            children: [new ConstantNode({ value: -1 }), opNode.children[0].derivative(variable)]
          }),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'abs',
                children: [
                  opNode.children[0].clone()
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
                          opNode.children[0].clone(),
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
    case 'abs':
      return new OperatorNode({
        operator: 'ifelse',
        children: [
          new OperatorNode({
            operator: '*',
            children: [
              new ConstantNode({ value: -1 }),
              opNode.children[0].clone()
            ]
          }),
          new OperatorNode({
            operator: '<',
            children: [
              opNode.children[0].clone(),
              new ConstantNode({ value: 0 })
            ]
          }),
          opNode.children[0].clone()
        ]
      })
    case 'gamma':
      // Derivative of gamma is polygamma(0, z) * gamma(z) * z'
      return new OperatorNode({
        operator: '*',
        children: [
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'polygamma',
                children: [
                  new ConstantNode({ value: 0 }),
                  opNode.children[0]
                ]
              }),
              opNode.clone()
            ]
          }),
          opNode.children[0].derivative(variable)
        ]
      })
    case 'factorial':
      return new OperatorNode({
        operator: 'gamma',
        children: [
          new OperatorNode({
            operator: '+',
            children: [
              new ConstantNode({ value: 1 }),
              opNode.children[0]
            ]
          })
        ]
      }).derivative(variable)
    case 'abs':
      return new OperatorNode({
        operator: 'ifelse',
        children: [
          new OperatorNode({
            operator: '*',
            children: [
              new ConstantNode({ value: -1 }),
              opNode.derivative(variable)
            ]
          }),
          new OperatorNode({
            operator: '<',
            children: [
              opNode.clone(),
              new ConstantNode({ value: 0 })
            ]
          }),
          opNode.derivative(variable)
        ]
      })
    case 'max':

    case 'digamma':
      // digamma = polygamma(0, x)
      return new OperatorNode({
        operator: 'polygamma',
        children: [
          new ConstantNode({ value: 0 }),
          opNode.children[0]
        ]
      }).derivative(variable)
    case 'trigamma':
      // trigamma = polygamma(1, x)
      return new OperatorNode({
        operator: 'polygamma',
        children: [
          new ConstantNode({ value: 1 }),
          opNode.children[0]
        ]
      }).derivative(variable)
    case 'polygamma':
      return new OperatorNode({
        operator: '*',
        children: [new OperatorNode({
          operator: 'polygamma',
          children: [
            new ConstantNode({ value: opNode.children[0].value + 1 }),
            opNode.children[1]
          ]
        }),
          opNode.children[1].derivative(variable)
        ]
      })
    default:
      // No symbolic derivative, oof
      throw new Error('unimplemented')
  }
}

export { operator_derivative }
