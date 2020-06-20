'use strict';

function operator_derivative (opNode, variable = 'x') {
  if (opNode.isConstant()) {
    return new ConstantNode({value: 0})
  }

  let node;
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
      node = opNode.clone();

      for (let i = 1; i < node.children.length; ++i) {
        node.children[i] = node.children[i].derivative(variable);
      }

      if (node.children.length % 2 === 1) {
        let i = node.children.length - 1;
        node.children[i] = node.children[i].derivative(variable);
      }

      return node
    case 'cchain':
      return opNode.clone()
    case '+':
      node = new OperatorNode({ operator: '+' });
      node.children = opNode.children.map(child => child.derivative(variable));
      return node
    case '*':
      let firstChild = opNode.children[0], secondChild = opNode.children[1];

      if (firstChild.isConstant()) {
        node = new OperatorNode({operator: '*', children: [
          firstChild,
            secondChild.derivative(variable)
          ]});
      } else if (secondChild.isConstant()) {
        node = new OperatorNode({operator: '*', children: [
            secondChild,
            firstChild.derivative(variable)
          ]});
      } else {
        node = new OperatorNode({ operator: '+' });

        // product rule
        let first = new OperatorNode({ operator: '*' });
        let second = new OperatorNode({ operator: '*' });

        first.children = [opNode.children[0].clone(), opNode.children[1].derivative(variable)];
        second.children = [opNode.children[0].derivative(variable), opNode.children[1].clone()];

        node.children = [first, second];
      }
      return node
    case '/':
      // Division rules
      if (opNode.children[1] instanceof ConstantNode) {
        return new OperatorNode({
          operator: '/',
          children: [opNode.children[0].derivative(variable), opNode.children[1]]
        })
      } else {
        node = new OperatorNode({ operator: '/' });

        let top = new OperatorNode({ operator: '-' });
        let topFirst = new OperatorNode({ operator: '*' });
        topFirst.children = [opNode.children[0].derivative(variable), opNode.children[1].clone()];
        let topSecond = new OperatorNode({ operator: '*' });
        topSecond.children = [opNode.children[0], opNode.children[1].derivative(variable)];

        top.children = [topFirst, topSecond];
        let bottom = new OperatorNode({ operator: '^' });
        bottom.children = [opNode.children[1].clone(), new ConstantNode({ value: 2 })];

        node.children = [top, bottom];
      }

      return node
    case '-':
      node = new OperatorNode({ operator: '-' });
      node.children = opNode.children.map(child => child.derivative(variable));
      return node
    case '^':
      let child1 = opNode.children[1];

      if (child1.isConstant()) {
        let power = child1.evaluateConstant();

        if (power === 0) {
          return new ConstantNode({ value: 0 })
        }

        // power rule
        let node = new OperatorNode({ operator: '*' });
        let node2 = new OperatorNode({ operator: '*' });
        let pow = new OperatorNode({ operator: '^' });

        let newPower;

        if (child1 instanceof ConstantNode && powerExactlyRepresentableAsFloat(child1.text)) {
          newPower = new ConstantNode({value: power - 1});
        } else {
          newPower = new OperatorNode({operator: '-', children: [
              opNode.children[1],
              new ConstantNode({ value: 1 })]});
        }

        pow.children = [opNode.children[0].clone(), newPower];

        node2.children = [opNode.children[0].derivative(variable), pow];
        node.children = [child1.clone(), node2];

        return node
      } else if (opNode.children[0].isConstant()) {
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
          ONE_THIRD.clone(),
          new OperatorNode({
            operator: '*',
            children: [
              new OperatorNode({
                operator: 'pow_rational',
                children: [
                  opNode.children[0].clone(),
                  new ConstantNode({ value: -2 }),
                  new ConstantNode({ value: 3 })
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
                children: [ opNode.children[0].clone() ]
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
        operator: 'ifelse',
        children: [new OperatorNode({
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
        }), new OperatorNode({
          operator: '>=',
          children: [opNode.children[0], new ConstantNode({ value: 1 })]
        }),
          new ConstantNode({ value: NaN })]
      })
    case 'atanh':
      var isAtanh = true;
    case 'acoth':
      return new OperatorNode({
        operator: 'ifelse',
        children: [new OperatorNode({
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
        }), new OperatorNode({
          operator: isAtanh ? '<=' : '>=',
          children: [new OperatorNode({
            operator: 'abs',
            children: [opNode.children[0].clone()]
          }), new ConstantNode({ value: 1 })]
        }),
          new ConstantNode({ value: NaN })]
      })
    case 'asech':
      return new OperatorNode({
        operator: 'ifelse',
        children: [new OperatorNode({
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
          ]
        }), new OperatorNode({
          operator: '>',
          children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
        }), new ConstantNode({ value: NaN })]
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
              opNode.children[0].derivative(variable)
            ]
          }),
          new OperatorNode({
            operator: '<',
            children: [
              opNode.children[0].clone(),
              new ConstantNode({ value: 0 })
            ]
          }),
          opNode.children[0].derivative(variable)
        ]
      })
    case 'min':
      if (opNode.children.length === 0) {
        return new ConstantNode({ value: 0 })
      } else if (opNode.children.length === 1) {
        return opNode.children[0].derivative(variable)
      }

      // Translate to ifelse statement, then take derivative
      var next_level = opNode.children.slice(1);

      if (next_level.length === 1) {
        next_level = next_level[0].clone();
      } else {
        next_level = new OperatorNode({
          operator: 'min',
          children: next_level.clone()
        });
      }

      return new OperatorNode({
        operator: 'ifelse',
        children: [
          opNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '<',
            children: [
              opNode.children[0],
              next_level
            ]
          }),
          next_level.derivative(variable)
        ]
      })
    case 'max':
      if (opNode.children.length === 0) {
        return new ConstantNode({ value: 0 })
      } else if (opNode.children.length === 1) {
        return opNode.children[0].derivative(variable)
      }

      // Translate to ifelse statement, then take derivative
      var next_level = opNode.children.slice(1);

      if (next_level.length === 1) {
        next_level = next_level[0].clone();
      } else {
        next_level = new OperatorNode({
          operator: 'max',
          children: next_level.map(cow => cow.clone())
        });
      }

      return new OperatorNode({
        operator: 'ifelse',
        children: [
          opNode.children[0].derivative(variable),
          new OperatorNode({
            operator: '>',
            children: [
              opNode.children[0],
              next_level
            ]
          }),
          next_level.derivative(variable)
        ]
      })
    case 'floor':
      return new ConstantNode({ value: 0 })
    case 'ceil':
      return new ConstantNode({ value: 0 })
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
    case 'ln_gamma':
      return new OperatorNode({
        operator: '*',
        children: [
          new OperatorNode({
            operator: 'digamma',
            children: [
              opNode.children[0]
            ]
          }),
          opNode.children[0].derivative(variable)
        ]
      })
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
    case 'ln':
      return new OperatorNode({
        operator: 'ifelse',
        children: [new OperatorNode({
          operator: '/',
          children: [
            opNode.children[0].derivative(variable),
            opNode.children[0].clone()
          ]
        }), new OperatorNode({
          operator: '>',
          children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
        }), new ConstantNode({ value: NaN })]
      })
    case 'log10':
      return new OperatorNode({
        operator: 'ifelse',
        children: [new OperatorNode({
          operator: '/',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: '*',
              children: [opNode.children[0].clone(), LN10.clone()]
            })
          ]
        }), new OperatorNode({
          operator: '>',
          children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
        }), new ConstantNode({ value: NaN })]
      })
    case 'log2':
      return new OperatorNode({
        operator: 'ifelse',
        children: [new OperatorNode({
          operator: '/',
          children: [
            opNode.children[0].derivative(variable),
            new OperatorNode({
              operator: '*',
              children: [opNode.children[0], LN2.clone()]
            })
          ]
        }), new OperatorNode({
          operator: '>',
          children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
        }), new ConstantNode({ value: NaN })]
      })
    case 'logb':
      return new OperatorNode({
        operator: 'ifelse',
        children: [new OperatorNode({
          operator: '/',
          children: [new OperatorNode({
            operator: 'ln',
            children: [opNode.children[1]]
          }).derivative(), new OperatorNode({
            operator: 'ln',
            children: [
              opNode.children[0]
            ]
          })]
        }), new OperatorNode({
          operator: '>',
          children: [opNode.children[0].clone(), new ConstantNode({ value: 0 })]
        }), new ConstantNode({ value: NaN })]
      })
    default:
      // No symbolic derivative, oof
      throw new Error('unimplemented')
  }
}

class Vec2 {
  constructor (x, y) {
    if (x.x) {
      this.x = x.x;
      this.y = x.y;
    } else if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
    } else {
      this.x = x;
      this.y = y;
    }
  }

  clone() {
    return new Vec2(this.x, this.y)
  }

  set(v) {
    this.x = v.x;
    this.y = v.y;
  }

  subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this
  }

  multiply(s) {
    this.x *= s;
    this.y *= s;
    return this
  }

  hasNaN() {
    return isNaN(this.x) || isNaN(this.y)
  }

  scale(s) {
    return this.multiply(s)
  }

  divide(s) {
    this.x /= s;
    this.y /= s;
    return this
  }

  asArray() {
    return [this.x, this.y]
  }

  length() {
    return Math.hypot(this.x, this.y)
  }

  unit() {
    return this.clone().divide(this.length())
  }

  distanceTo(v) {
    return Math.hypot(this.x - v.x, this.y - v.y)
  }

  distanceSquaredTo(v) {
    return (this.x - v.x) ** 2 + (this.y - v.y) ** 2
  }

  cross(v) {
    return this.x * v.x + this.y * v.y
  }

  rotate(angle, about=Origin) {
    let c = Math.cos(angle), s = Math.sin(angle);

    if (about === Origin) {
      let x = this.x, y = this.y;

      this.x = x * c - y * s;
      this.y = y * c + x * s;
    } else {
      let x = this.x, y = this.y;

      this.subtract(about).rotate(angle).add(about);
    }

    return this
  }

  rotateDeg(angle_deg, about=Origin) {
    this.rotate(angle_deg / 180 * 3.14159265359, about);

    return this
  }
}
const Origin = new Vec2(0,0);

class BoundingBox {
  //_width;
  //_height;

  draw(canvasCtx) {
    canvasCtx.beginPath();
    canvasCtx.rect(this.top_left.x, this.top_left.y, this.width, this.height);
    canvasCtx.stroke();
  }

  constructor(top_left=new Vec2(0,0), width=640, height=480) {
    this.top_left = top_left;

    this.width = width;
    this.height = height;
  }

  get width() {
    return this._width
  }

  get height() {
    return this._height
  }

  set width(w) {
    if (w < 0)
      throw new Error("Invalid bounding box width")
    this._width = w;
  }

  set height(h) {
    if (h < 0)
      throw new Error("Invalid bounding box height")
    this._height = h;
  }

  setTL(top_left) {
    this.top_left = top_left;
    return this
  }

  area() {
    return this.width * this.height
  }

  set cx(cx) {
    this.top_left.x = cx - this.width / 2;
  }

  set cy(cy) {
    this.top_left.y = cy - this.height / 2;
  }

  get cx() {
    return this.top_left.x + this.width / 2
  }

  get cy() {
    return this.top_left.y + this.height / 2
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    return this
  }

  clone() {
    return new BoundingBox(this.top_left.clone(), this.width, this.height)
  }

  padLeft(x) {
    this.width -= x;
    this.top_left.x += x;
    return this
  }

  padRight(x) {
    this.width -= x;
    return this
  }

  padTop(y) {
    this.height -= y;
    this.top_left.y += y;
    return this
  }

  padBottom(y) {
    this.height -= y;
    return this
  }

  pad(paddings={}) {
    if (paddings.left) {
      this.padLeft(paddings.left);
    }
    if (paddings.right) {
      this.padRight(paddings.right);
    }
    if (paddings.top) {
      this.padTop(paddings.top);
    }
    if (paddings.bottom) {
      this.padBottom(paddings.bottom);
    }

    return this
  }

  get x1() {
    return this.top_left.x
  }

  get x2() {
    return this.top_left.x + this.width
  }

  set x1(x) {
    this.top_left.x = x;
  }

  set x2(x) {
    this.width = x - this.top_left.x;
  }

  get y1() {
    return this.top_left.y
  }

  get y2() {
    return this.top_left.y + this.height
  }

  set y1(y) {
    this.top_left.y = y;
  }

  set y2(y) {
    this.height = y - this.top_left.y;
  }

  getBoxVertices() {
    return [this.x1, this.y1, this.x2, this.y1, this.x2, this.y2, this.x1, this.y2, this.x1, this.y1]
  }

  getPath() {
    let path = new Path2D();

    path.rect(this.x1, this.y1, this.width, this.height);

    return path
  }

  clip(ctx) {
    ctx.clip(this.getPath());
  }
}

const EMPTY = new BoundingBox(new Vec2(0,0), 0, 0);

// This file defines some common utilities that Grapheme uses!

// A list of all extant Grapheme Universes
const Universes = [];

// Non-stupid mod function
function mod (n, m) {
  return ((n % m) + m) % m
}

// device pixel ratio... duh
let dpr = window.devicePixelRatio;
function updateDPR () {
  if (dpr !== window.devicePixelRatio) {
    dpr = window.devicePixelRatio;

    // Tell the babies that the device pixel ratio has changed
    Universes.forEach(context => context.triggerEvent("dprchanged"));
  }
}

// Periodically check whether the dpr has changed
setInterval(updateDPR, 100);

// Import the Grapheme CSS file for canvas styling
function importGraphemeCSS () {
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '../build/grapheme.css'; // oof, must change l8r

    document.getElementsByTagName('HEAD')[0].appendChild(link);
  } catch (e) {
    console.error('Could not import Grapheme CSS');
    throw e
  }
}

importGraphemeCSS();

let empty_canvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement("canvas");
let empty_canvas_ctx = empty_canvas.getContext("2d");

let x = 0;

function getRenderID () {
  x += 1;
  return x
}

// A glyph to be fill drawn in some fashion.
class Glyph {
  constructor (params = {}) {
    // vertices is array of Vec2s
    const { vertices = [] } = params;
    this.vertices = vertices;
  }

  addGlyphToPath (path, x = 0, y = 0, scale = 1, angle = 0) {
    const vertices = this.vertices;

    const translateV = new Vec2(x, y);

    // Nothing to draw
    if (vertices.length < 2) {
      return
    }

    const p1 = vertices[0].clone().scale(scale).rotate(angle).add(translateV);
    let jumpToNext = false;

    path.moveTo(p1.x, p1.y);

    for (let i = 1; i < vertices.length; ++i) {
      const p = vertices[i].clone().scale(scale).rotate(angle).add(translateV);

      if (p.hasNaN()) {
        jumpToNext = true;
        continue
      }

      if (jumpToNext) {
        jumpToNext = false;
        path.moveTo(p.x, p.y);
      } else path.lineTo(p.x, p.y);
    }

    path.closePath();
  }
}

/**
A glyph which creates an arrowhead. Tells you where the arrowhead will be with a Path2D
return value, but also tells you where the base of the arrowhead is so that you can join it
up properly.

length is the length of the arrowhead, from tip to tail */
class Arrowhead extends Glyph {
  constructor (params = {}) {
    super(params);

    const { length = 0 } = params;
    this.length = length;
  }

  addPath2D (path, x1, y1, x2, y2, thickness) {
    const arrowTipAt = new Vec2(x2, y2);
    const displacement = new Vec2(x1, y1).subtract(arrowTipAt).unit().scale(this.length);

    this.addGlyphToPath(path, x2, y2, 2 * thickness, Math.atan2(y2 - y1, x2 - x1));

    return arrowTipAt.add(displacement)
  }
}

function createTriangleArrowhead (width, length) {
  return new Arrowhead({
    vertices: [
      new Vec2(0, 0),
      new Vec2(-length, width / 2),
      new Vec2(-length, -width / 2)
    ],
    length
  })
}

const Arrowheads = {
  Normal: createTriangleArrowhead(3, 6),
  Squat: createTriangleArrowhead(3, 3)
};

function GeometryASMFunctionsCreate(stdlib, foreign, buffer) {
  "use asm";

  var sqrt = stdlib.Math.sqrt;
  var abs = stdlib.Math.abs;
  var atan2 = stdlib.Math.atan2;
  var values = new stdlib.Float64Array(buffer);
  var Infinity = stdlib.Infinity;
  var PI = stdlib.Math.PI;

  function hypot(x, y) {
    x = +x;
    y = +y;

    var quot = 0.0;

    if (+x == +0.0) {
      return abs(y)
    }

    quot = y / x;

    return abs(x) * sqrt(1.0 + quot * quot)
  }

  function point_line_segment_distance(px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px;
    py = +py;
    ax = +ax;
    ay = +ay;
    bx = +bx;
    by = +by;

    var t = 0.0, tx = 0.0, ty = 0.0, d = 0.0, xd = 0.0, yd = 0.0;

    if (ax == bx) {
      if (ay == by) {
        return +hypot(px - ax, py - ay)
      }
    }

    xd = bx - ax;
    yd = by - ay;

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

    if (t < 0.0) {
      t = 0.0;
    } else if (t > 1.0) {
      t = 1.0;
    }

    tx = ax + t * (bx - ax);
    ty = ay + t * (by - ay);

    d = +hypot(px - tx, py - ty);

    return d
  }

  function point_line_segment_min_distance(px, py, start, end) {
    px = +px;
    py = +py;
    start = start|0;
    end = end|0;

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0;
    min_distance = Infinity;

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_distance(px, py, +values[p>>3], +values[(p+8)>>3], +values[(p+16)>>3], +values[(p+24)>>3]);

      if (distance < min_distance) {
        min_distance = distance;
      }
    }

    return min_distance
  }

  function point_line_segment_closest(px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px;
    py = +py;
    ax = +ax;
    ay = +ay;
    bx = +bx;
    by = +by;

    var t = 0.0, tx = 0.0, ty = 0.0, xd = 0.0, yd = 0.0;

    if (ax == bx) {
      if (ay == by) {
        values[0] = +ax;
        values[1] = +ay;

        return +hypot(px - ax, py - ay)
      }
    }

    xd = bx - ax;
    yd = by - ay;

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

    if (t < 0.0) {
      t = 0.0;
    } else if (t > 1.0) {
      t = 1.0;
    }

    tx = ax + t * (bx - ax);
    ty = ay + t * (by - ay);

    values[0] = +tx;
    values[1] = +ty;

    return +hypot(px - tx, py - ty)
  }

  function point_line_segment_min_closest(px, py, start, end) {
    px = +px;
    py = +py;
    start = start|0;
    end = end|0;

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0, cx = 0.0, cy = 0.0;
    min_distance = Infinity;

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_closest(px, py, +values[p>>3], +values[(p+8)>>3], +values[(p+16)>>3], +values[(p+24)>>3]);

      if (distance < min_distance) {
        min_distance = distance;
        cx = +values[0];
        cy = +values[1];
      }
    }

    values[0] = +cx;
    values[1] = +cy;

    return +min_distance
  }

  function min(x, y) {
    x = +x;
    y = +y;

    if (x < y)
      return x
    return y
  }

  function angle_between(x1, y1, x2, y2, x3, y3) {
    x1 = +x1;
    y1 = +y1;
    x2 = +x2;
    y2 = +y2;
    x3 = +x3;
    y3 = +y3;

    return atan2(y3 - y1, x3 - x1) - atan2(y2 - y1, x2 - x1)
  }

  // Returns 0 if no refinement needed, 1 if left refinement, 2 if right refinement, 3 if both refinment
  function needs_refinement(x1, y1, x2, y2, x3, y3, threshold) {
    x1 = +x1;
    y1 = +y1;
    x2 = +x2;
    y2 = +y2;
    x3 = +x3;
    y3 = +y3;
    threshold = +threshold;

    var angle = 0.0;

    angle = +angle_between(x2, y2, x1, y1, x3, y3);
    angle = +min(abs(angle-PI), abs(angle+PI));

    if (angle > threshold) {
      return 3
    }

    if (y2 != y2) {
      if (y3 == y3) {
        return 3
      }
      if (y1 == y1) {
        return 3
      }
    }

    if (y3 != y3) {
      if (y2 == y2) {
        return 3
      }
    }

    if (y1 != y1) {
      if (y2 == y2) {
        return 3
      }
    }

    return 0
  }

  function angles_between(start, end, threshold, aspectRatio) {
    start = start | 0;
    end = end | 0;
    threshold = +threshold;
    aspectRatio = +aspectRatio;

    var p = 0, q = 0, res = 0, indx = 0;

    for (p = (start + 2) << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      res = needs_refinement(+values[(p-16)>>3],
        +(values[(p-8)>>3] * aspectRatio),
        +values[p>>3],
        +(values[(p+8)>>3] * aspectRatio),
        +values[(p+16)>>3],
        +(values[(p+24)>>3] * aspectRatio),
        +threshold) | 0;

      indx = (((p-4)>>1)) | 0;

      values[indx>>3] = +(res|0);
    }
  }


  return {angles_between: angles_between, point_line_segment_min_distance: point_line_segment_min_distance, point_line_segment_min_closest: point_line_segment_min_closest, needs_refinement: needs_refinement}
}

let heap = new ArrayBuffer(0x200000);
let stdlib = {Math: Math, Float64Array: Float64Array, Infinity: Infinity};
var GeometryASMFunctions = GeometryASMFunctionsCreate(stdlib, null, heap);

/* Unicode characters for exponent signs, LOL */
const exponent_reference = {
  '-': String.fromCharCode(8315),
  '0': String.fromCharCode(8304),
  '1': String.fromCharCode(185),
  '2': String.fromCharCode(178),
  '3': String.fromCharCode(179),
  '4': String.fromCharCode(8308),
  '5': String.fromCharCode(8309),
  '6': String.fromCharCode(8310),
  '7': String.fromCharCode(8311),
  '8': String.fromCharCode(8312),
  '9': String.fromCharCode(8313)
};

/* Convert a digit into its exponent form */
function convert_char(c) {
  return exponent_reference[c];
}

/* Convert an integer into its exponent form (of Unicode characters) */
function exponentify(integer) {
  let stringi = integer + '';
  let out = '';

  for (let i = 0; i < stringi.length; ++i) {
    out += convert_char(stringi[i]);
  }

  return out;
}

// Credit: https://stackoverflow.com/a/20439411
/* Turns a float into a pretty float by removing dumb floating point things */
function beautifyFloat(f, prec=12) {
  let strf = f.toFixed(prec);
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g,'');
  } else {
    return strf;
  }
}

function isApproxEqual(v, w, eps=1e-5) {
  return Math.abs(v - w) < eps;
}

const CDOT = String.fromCharCode(183);

const StandardLabelFunction = x => {
  if (x === 0) return "0"; // special case
  else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
    // non-extreme floats displayed normally
    return beautifyFloat(x);
  else {
    // scientific notation for the very fat and very small!

    let exponent = Math.floor(Math.log10(Math.abs(x)));
    let mantissa = x / (10 ** exponent);

    let prefix = (isApproxEqual(mantissa, 1) ? '' :
      (beautifyFloat(mantissa, 8) + CDOT));
    let exponent_suffix = "10" + exponentify(exponent);

    return prefix + exponent_suffix;
  }
};

function multiplyPolynomials(coeffs1, coeffs2, degree) {
  let ret = [];
  for (let i = 0; i <= degree; ++i) {
    ret.push(0);
  }

  for (let i = 0; i < coeffs1.length; ++i) {
    for (let j = 0; j < coeffs2.length; ++j) {
      ret[i + j] += coeffs1[i] * coeffs2[j];
    }
  }

  return ret
}

class SingleVariablePolynomial {
  constructor(coeffs=[0]) {
    // Order: first is constant, second is linear, etc.
    this.coeffs = coeffs;
  }

  _evaluateFloat(x) {
    let coeffs = this.coeffs;
    let prod = 1;
    let sum = 0;

    for (let i = 0; i < coeffs.length; ++i) {
      sum += coeffs[i] * prod;

      prod *= x;
    }

    return sum
  }

  evaluate(x) {
    let coeffs = this.coeffs;
    let prod = 1;
    let sum = 0;

    for (let i = 0; i < coeffs.length; ++i) {
      let coeff = coeffs[i];

      // TODO
      if (isNaN(coeff))
        coeff = coeff.approximate_as_float();

      sum += coeff * prod;

      prod *= x;
    }

    return sum
  }

  degree() {
    return this.coeffs.length - 1
  }

  derivative() {
    let newCoeffs = [];
    const coeffs = this.coeffs;

    for (let i = 1; i < coeffs.length; ++i) {
      let coeff = coeffs[i];

      newCoeffs.push(i * coeff);
    }

    return new SingleVariablePolynomial(newCoeffs)
  }

  clone() {
    return new SingleVariablePolynomial(this.coeffs.slice())
  }

  add(poly) {
    let coeffs = this.coeffs;
    let otherCoeffs = poly.coeffs;

    for (let i = 0; i < otherCoeffs.length; ++i) {
      coeffs[i] = (coeffs[i] ? coeffs[i] : 0) + otherCoeffs[i];
    }

    return this
  }

  subtract(poly) {
    const coeffs = this.coeffs;
    const otherCoeffs = poly.coeffs;

    for (let i = 0; i < otherCoeffs.length; ++i) {
      coeffs[i] = (coeffs[i] ? coeffs[i] : 0) - otherCoeffs[i];
    }

    return this
  }

  multiplyScalar(s) {
    const coeffs = this.coeffs;

    for (let i = 0; i < coeffs.length; ++i) {
      coeffs[i] *= s;
    }

    return this
  }

  multiply(poly) {
    this.coeffs = multiplyPolynomials(poly.coeffs, this.coeffs, poly.degree() + this.degree());
    return this
  }

  integral() {
    // TODO
  }
}

// Credit to https://stackoverflow.com/questions/15454183/how-to-make-a-function-that-computes-the-factorial-for-numbers-with-decimals!! Thank you so much

var g = 7;
var C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
var integer_factorials = [
  1,
  1,
  2,
  6,
  24,
  120,
  720,
  5040,
  40320,
  362880,
  3628800,
  39916800,
  479001600,
  6227020800,
  87178291200,
  1307674368000,
  20922789888000,
  355687428096000,
  6402373705728000,
  121645100408832000,
  2432902008176640000,
  51090942171709440000,
  1.1240007277776077e+21,
  2.585201673888498e+22,
  6.204484017332394e+23,
  1.5511210043330986e+25,
  4.0329146112660565e+26,
  1.0888869450418352e+28,
  3.0488834461171384e+29,
  8.841761993739701e+30,
  2.6525285981219103e+32,
  8.222838654177922e+33,
  2.631308369336935e+35,
  8.683317618811886e+36,
  2.9523279903960412e+38,
  1.0333147966386144e+40,
  3.719933267899012e+41,
  1.3763753091226343e+43,
  5.23022617466601e+44,
  2.0397882081197442e+46,
  8.159152832478977e+47,
  3.3452526613163803e+49,
  1.4050061177528798e+51,
  6.041526306337383e+52,
  2.6582715747884485e+54,
  1.1962222086548019e+56,
  5.5026221598120885e+57,
  2.5862324151116818e+59,
  1.2413915592536073e+61,
  6.082818640342675e+62,
  3.0414093201713376e+64,
  1.5511187532873822e+66,
  8.065817517094388e+67,
  4.2748832840600255e+69,
  2.308436973392414e+71,
  1.2696403353658276e+73,
  7.109985878048635e+74,
  4.052691950487722e+76,
  2.350561331282879e+78,
  1.3868311854568986e+80,
  8.320987112741392e+81,
  5.075802138772248e+83,
  3.146997326038794e+85,
  1.98260831540444e+87,
  1.2688693218588417e+89,
  8.247650592082472e+90,
  5.443449390774431e+92,
  3.647111091818868e+94,
  2.4800355424368305e+96,
  1.711224524281413e+98,
  1.197857166996989e+100,
  8.504785885678622e+101,
  6.123445837688608e+103,
  4.4701154615126834e+105,
  3.3078854415193856e+107,
  2.480914081139539e+109,
  1.8854947016660498e+111,
  1.4518309202828584e+113,
  1.1324281178206295e+115,
  8.946182130782973e+116,
  7.156945704626378e+118,
  5.797126020747366e+120,
  4.75364333701284e+122,
  3.945523969720657e+124,
  3.314240134565352e+126,
  2.8171041143805494e+128,
  2.4227095383672724e+130,
  2.107757298379527e+132,
  1.8548264225739836e+134,
  1.6507955160908452e+136,
  1.4857159644817607e+138,
  1.3520015276784023e+140,
  1.24384140546413e+142,
  1.1567725070816409e+144,
  1.0873661566567424e+146,
  1.0329978488239052e+148,
  9.916779348709491e+149,
  9.619275968248206e+151,
  9.426890448883242e+153,
  9.33262154439441e+155,
  9.33262154439441e+157,
  9.425947759838354e+159,
  9.614466715035121e+161,
  9.902900716486175e+163,
  1.0299016745145622e+166,
  1.0813967582402903e+168,
  1.1462805637347078e+170,
  1.2265202031961373e+172,
  1.3246418194518284e+174,
  1.4438595832024928e+176,
  1.5882455415227421e+178,
  1.7629525510902437e+180,
  1.9745068572210728e+182,
  2.2311927486598123e+184,
  2.543559733472186e+186,
  2.925093693493014e+188,
  3.3931086844518965e+190,
  3.969937160808719e+192,
  4.6845258497542883e+194,
  5.574585761207603e+196,
  6.689502913449124e+198,
  8.09429852527344e+200,
  9.875044200833598e+202,
  1.2146304367025325e+205,
  1.5061417415111404e+207,
  1.8826771768889254e+209,
  2.372173242880046e+211,
  3.012660018457658e+213,
  3.8562048236258025e+215,
  4.9745042224772855e+217,
  6.466855489220472e+219,
  8.471580690878817e+221,
  1.118248651196004e+224,
  1.4872707060906852e+226,
  1.992942746161518e+228,
  2.6904727073180495e+230,
  3.659042881952547e+232,
  5.01288874827499e+234,
  6.917786472619486e+236,
  9.615723196941086e+238,
  1.346201247571752e+241,
  1.89814375907617e+243,
  2.6953641378881614e+245,
  3.8543707171800706e+247,
  5.550293832739301e+249,
  8.047926057471987e+251,
  1.17499720439091e+254,
  1.7272458904546376e+256,
  2.5563239178728637e+258,
  3.808922637630567e+260,
  5.7133839564458505e+262,
  8.627209774233235e+264,
  1.3113358856834518e+267,
  2.006343905095681e+269,
  3.089769613847349e+271,
  4.789142901463391e+273,
  7.47106292628289e+275,
  1.1729568794264138e+278,
  1.8532718694937338e+280,
  2.946702272495037e+282,
  4.714723635992059e+284,
  7.590705053947215e+286,
  1.2296942187394488e+289,
  2.0044015765453015e+291,
  3.2872185855342945e+293,
  5.423910666131586e+295,
  9.003691705778433e+297,
  1.5036165148649983e+300,
  2.526075744973197e+302,
  4.2690680090047027e+304,
  7.257415615307994e+306
];

function gamma (z) {

  // Define gamma specially for integral values
  if (z % 1 === 0) {
    if (z <= 0) {
      return Infinity
    }

    let res = integer_factorials[Math.round(z - 1)];

    if (!res) {
      return Infinity
    }
    return res
  }

  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  } else {
    z -= 1;

    var x = C[0];
    for (var i = 1; i < g + 2; i++) {
      x += C[i] / (z + i);
    }

    var t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, (z + 0.5)) * Math.exp(-t) * x
  }
}

function ln_gamma (z) {
  if (z < 0.5) {
    // Compute via reflection formula
    let reflected = ln_gamma(1 - z);

    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - reflected
  } else {
    z -= 1;

    var x = C[0];
    for (var i = 1; i < g + 2; i++) {
      x += C[i] / (z + i);
    }

    var t = z + g + 0.5;

    return Math.log(2 * Math.PI) / 2 + Math.log(t) * (z + 0.5) - t + Math.log(x)
  }
}



function polygamma (m, z) {
  if (m % 1 !== 0) {
    return NaN
  }

  if (m === 0) {
    return digamma(z)
  }

  if (m === 1) {
    return trigamma(z)
  }

  let sign = (m % 2 === 0) ? -1 : 1;
  let numPoly = getPolygammaNumeratorPolynomial(m);

  if (z < 0.5) {
    if (z % 1 === 0)
      return Infinity

    // Reflection formula, see https://en.wikipedia.org/wiki/Polygamma_function#Reflection_relation
    // psi_m(z) = pi ^ (m+1) * numPoly(cos(pi z)) / (sin ^ (m+1) (pi z)) + (-1)^(m+1) psi_m(1-z)

    return -(Math.pow(Math.PI, m + 1) * numPoly.evaluate(Math.cos(Math.PI * z)) /
      (Math.pow(Math.sin(Math.PI * z), m+1)) + sign * polygamma(m, 1 - z))
  } else if (z < 8) {
    // Recurrence relation
    // psi_m(z) = psi_m(z+1) + (-1)^(m+1) * m! / z^(m+1)

    return polygamma(m, z+1) + sign * gamma(m + 1) / Math.pow(z, m+1)
  }

  // Series representation

  let sum = 0;
  for (let i = 0; i < 200; ++i) {
    sum += 1 / Math.pow(z + i, m + 1);
  }

  return sign * gamma(m + 1) * sum

}

const GREGORY_COEFFICIENTS = [
  1.0, 0.5, -0.08333333333333333, 0.041666666666666664, -0.02638888888888889, 0.01875, -0.014269179894179895, 0.01136739417989418, -0.00935653659611993, 0.00789255401234568, -0.006785849984634707, 0.005924056412337663, -0.005236693257950285, 0.004677498407042265, -0.004214952239005473, 0.003826899553211884, -0.0034973498453499175, 0.0032144964313235674, -0.0029694477154582097, 0.002755390299436716, -0.0025670225450072377, 0.0024001623785907204, -0.0022514701977588703, 0.0021182495272954456, -0.001998301255043453, 0.0018898154636786972, -0.0017912900780718936, 0.0017014689263700736, -0.0016192940490963672, 0.0015438685969283421, -0.0014744276890609623, 0.001410315320613454, -0.0013509659123128112, 0.0012958894558251668, -0.0012446594681088444, 0.0011969031579517945, -0.001152293347825886, 0.0011105417984181721, -0.001071393661516785, 0.0010346228462800521, -0.0010000281292566525, 0.0009674298734228264, -0.0009366672485567989, 0.0009075958663860963, -0.0008800857605298948, 0.000854019654366952, -0.0008292914703794421, 0.0008058050428513827, -0.0007834730024921167, 0.0007622158069590723, -0.0007419608956386516, 0.0007226419506180641, -0.0007041982487069233, 0.000686574091772996, -0.0006697183046421545, 0.0006535837914580035, -0.0006381271427651654, 0.0006233082867224927, -0.0006090901788092055, 0.0005954385251909118, -0.0005823215355902033, 0.0005697097020796109, -0.0005575756007007343, 0.0005458937132267388, -0.0005346402667379662, 0.0005237930889818988, -0.0005133314777471911, 0.0005032360827036401, -0.0004934887983513816, 0.00048407266688788627, -0.00047497178994440343, 0.00046617124826760925, -0.00045765702853009814, 0.00044941595654733894, -0.0004414356362607454, 0.0004337043939182513, -0.00042621122694664064, 0.00041894575706506086, -0.0004118981872376783, 0.0004050592621061756, -0.00039842023158052236, 0.0003919728172997837, -0.0003857091817042604, 0.00037962189948642086, -0.00037370393121133474, 0.0003679485989179907, -0.0003623495635312948, 0.0003569008039309683, -0.0003515965975382364, 0.0003464315022943173, -0.00034140033991647036, 0.0003364981803279027, -0.00033172032716728803, 0.00032706230429215997, -0.0003225198431980953, 0.000318088871282497, -0.000313765500888013, 0.00030954601906624203, -0.0003054268780074607, 0.00030140468608670396, -0.00029747619948069663, 0.0002936383143139141
];

let PolygammaNumeratorPolynomials = [new SingleVariablePolynomial([0, 1])];

let POLY1 = new SingleVariablePolynomial([0, 1]);
let POLY2 = new SingleVariablePolynomial([-1, 0, 1]);

function getPolygammaNumeratorPolynomial(n) {
  let poly = PolygammaNumeratorPolynomials[n];
  if (poly)
    return poly

  if (n > 10000)
    return new SingleVariablePolynomial([0])

  if (n > 20) {
    // to prevent stack overflow issues
    for (let i = 0; i < n; ++i) {
      getPolygammaNumeratorPolynomial(i);
    }
  }

  return PolygammaNumeratorPolynomials[n] =
    getPolygammaNumeratorPolynomial(n - 1).clone().multiplyScalar(-n).multiply(POLY1).add(
      getPolygammaNumeratorPolynomial(n - 1).derivative().multiply(POLY2)
    )
}

function digamma (z) {
  if (z < 0.5) {
    // psi(1-x) - psi(x) = pi cot(pi x)
    // psi(x) = psi(1-x) - pi cot (pi x)

    return digamma(1 - z) - Math.PI / Math.tan(Math.PI * z)
  } else if (z < 5) {
    // psi(x+1) = psi(x) + 1/x
    // psi(x) = psi(x+1) - 1/x

    return digamma(z + 1) - 1 / z
  }

  let egg = 1;
  let sum = Math.log(z);

  for (let n = 1; n < 100; ++n) {
    let coeff = Math.abs(GREGORY_COEFFICIENTS[n]);

    egg *= ((n-1) ? (n-1) : 1);
    egg /= z + n - 1;

    sum -= coeff * egg;
  }

  return sum
}

function trigamma(z) {
  if (z < 0.5) {
    if (z % 1 === 0) {
      return Infinity
    }

    // psi_1(1-z) + psi_1(z) = pi^2 / (sin^2 pi z)
    // psi_1(z) = pi^2 / (sin^2 pi z) - psi_1(1-z)

    return (Math.PI * Math.PI) / (Math.sin(Math.PI * z) ** 2) - trigamma(1-z)
  } else if (z < 8) {
    // psi_1(z+1) = psi_1(z) - 1/z^2
    // psi_1(z) = psi_1(z+1) + 1/z^2

    return trigamma(z+1) + 1 / (z*z)
  }

  return 1 / z + 1 / (2 * z**2) + 1 / (6 * z**3) - 1 / (30 * z**5) + 1/(42 * z**7) - 1/(30 * z**9) + 5/(66 * z**11) - 691 / (2730 * z**13) + 7 / (6 * z**15)
}

const Functions = {
  LogB: (b, v) => {
    return Math.log(v) / Math.log(b)
  },
  Factorial: (a) => {
    return Functions.Gamma(a + 1)
  },
  Gamma: (a) => {
    return gamma(a)
  },
  LnGamma: (a) => {
    return ln_gamma(a)
  },
  Digamma: (a) => {
    return digamma(a)
  },
  Trigamma: (a) => {
    return trigamma(a)
  },
  Polygamma: (n, a) => {
    return polygamma(n, a)
  },
  Arccot: (z) => {
    let t = Math.atan(1 / z);

    if (t < 0) {
      t += Math.PI;
    }

    return t
  },
  PowRational: (x, p, q) => {
    // Calculates x ^ (p / q), where p and q are integers

    if (p === 0) {
      return 1
    }

    let gcd = gcd(p, q);

    if (gcd !== 1) {
      p /= gcd;
      q /= gcd;
    }

    if (x >= 0) {
      return Math.pow(x, p / q)
    } else {
      if (mod(q, 2) === 0)
        return NaN

      let ret = Math.pow(-x, p / q);
      if (mod(p, 2) === 0) {
        return ret
      } else {
        return -ret
      }
    }
  }
};

function cchain(val1, compare, val2, ...args) {
  if (!val2) {
    return false
  }

  switch (compare) {
    case '<':
      if (val1 >= val2)
        return false
      break
    case '>':
      if (val1 <= val2)
        return false
      break
    case '<=':
      if (val1 > val2)
        return false
      break
    case '>=':
      if (val1 < val2)
        return false
      break
    case '==':
      if (val1 !== val2)
        return false
      break
    case '!=':
      if (val1 === val2)
        return false
      break
  }

  if (args.length > 0)
    return cchain(val2, ...args)

  return true
}
function piecewise(cond, val, ...args) {
  if (!val) {
    return cond
  }

  if (cond) {
    return val
  }

  if (args.length === 0) {
    // This is a fail
    return val
  } else {
    return piecewise(...args)
  }
}

function ifelse(val1, cond, val2) {
  if (cond)
    return val1
  return val2
}

const Operators = {
  '+': (x, y) => x + y,
  '-': (x, y) => x - y,
  '*': (x, y) => x * y,
  '/': (x, y) => x / y,
  '^': (x, y) => Math.pow(x, y),
  '<': (x, y) => x < y,
  '<=': (x, y) => x <= y,
  '>': (x, y) => x > y,
  '>=': (x, y) => x >= y,
  '==': (x, y) => x === y,
  '!=': (x, y) => x !== y,
  'sin': Math.sin,
  'tan': Math.tan,
  'cos': Math.cos,
  'csc': x => 1/Math.sin(x),
  'sec': x => 1/Math.cos(x),
  'cot': x => 1/Math.tan(x),
  'asin': x => Math.asin(x),
  'acos': x => Math.acos(x),
  'atan': x => Math.atan(x),
  'abs': x => Math.abs(x),
  'sqrt': x => Math.sqrt(x),
  'cbrt': x => Math.cbrt(x),
  'ln': x => Math.log(x),
  'log': x => Math.log(x),
  'log10': x => Math.log10(x),
  'log2': x => Math.log2(x),
  'sinh': Math.sinh,
  'cosh': Math.cosh,
  'tanh': Math.tanh,
  'csch': x => 1/Math.sinh(x),
  'sech': x => 1/Math.cosh(x),
  'coth': x => 1/Math.tanh(x),
  'asinh': Math.asinh,
  'acosh': Math.acosh,
  'atanh': Math.atanh,
  'asec': x => Math.acos(1/x),
  'acsc': x => Math.asin(1/x),
  'acot': Functions.Arccot,
  'acsch': x => Math.asinh(1/x),
  'asech': x => Math.acosh(1/x),
  'acoth': x => Math.atanh(1/x),
  'logb': Functions.LogB,
  'gamma': Functions.Gamma,
  'factorial': Functions.Factorial,
  'ln_gamma': Functions.LnGamma,
  'digamma': Functions.Digamma,
  'trigamma': Functions.Trigamma,
  'polygamma': Functions.Polygamma,
  'pow_rational': Functions.PowRational,
  'max': Math.max,
  'min': Math.min,
  'floor': Math.floor,
  'ceil': Math.ceil,
  'and': (x, y) => x && y,
  'or': (x, y) => x || y,
  'cchain': cchain,
  'ifelse': ifelse,
  'piecewise': piecewise
};

function getLatex(opNode) {
  switch (opNode.operator) {
    case "^":
      let exponent = opNode.children[1];

      let exponent_latex;
      if (exponent.type() === "node") {
        exponent_latex = exponent.latex(false);
      } else {
        exponent_latex = exponent.latex();
      }
      return `${opNode.children[0].latex()}^{${exponent_latex}}`
    case "*":
      return `${opNode.children[0].latex()}\\cdot ${opNode.children[1].latex()}`
    case "+":
      return `${opNode.children[0].latex()}+${opNode.children[1].latex()}`
    case "-":
      return `${opNode.children[0].latex()}-${opNode.children[1].latex()}`
    case "/":
      return `\\frac{${opNode.children[0].latex()}}{${opNode.children[1].latex()}}`
    case "<":
      return `${opNode.children[0].latex()} < ${opNode.children[1].latex()}`
    case "<=":
      return `${opNode.children[0].latex()} \\leq ${opNode.children[1].latex()}`
    case "==":
      return `${opNode.children[0].latex()} = ${opNode.children[1].latex()}`
    case "!=":
      return `${opNode.children[0].latex()} \\neq ${opNode.children[1].latex()}`
    case ">":
      return `${opNode.children[0].latex()} > ${opNode.children[1].latex()}`
    case ">=":
      return `${opNode.children[0].latex()} \\geq ${opNode.children[1].latex()}`
    case "pow_rational":
      // Normally unused third child stores what the user actually inputted
      return `${opNode.children[0].latex()}^{${opNode.children[3].latex()}}`
    case "factorial":
      let needs_parens = opNode.needsParentheses();
      let latex_n = opNode.children[0].latex();

      if (needs_parens)
        return `\\left(${latex_n}\\right)!`
      else
        return latex_n + '!'
    case "logb":
      let log_needs_parens = opNode.children[1].needsParentheses();
      let base_needs_parens = opNode.children[0].needsParentheses();

      let base = `${base_needs_parens ? '\\left(' : ''}${opNode.children[0].latex()}${base_needs_parens ? '\\right)' : ''}`;
      let log = `${log_needs_parens ? '\\left(' : ''}${opNode.children[1].latex()}${log_needs_parens ? '\\right)' : ''}`;

      return `\\operatorname{log}_{${base}}{${log}}`
    case "ifelse":
      return `\\begin{cases} ${opNode.children[0].latex()} & ${opNode.children[1].latex()} \\\\ ${opNode.children[2].latex()} & \\text{otherwise} \\end{cases}`
    case "cchain":
      return opNode.children.map(child => child.latex()).join('')
    case "polygamma":
      return `\\psi^{(${opNode.children[0].latex()})}\\left(${opNode.children[1].latex()}\\right)`
    case "piecewise":
      let pre = `\\begin{cases} `;

      let post;
      if (opNode.children.length % 2 === 0) {

        post = `0 & \\text{otherwise} \\end{cases}`;
      } else {
        post = ` \\text{otherwise} \\end{cases}`;
      }

      let latex = pre;

      for (let i = 0; i < opNode.children.length; i += 2) {
        let k = 0;
        for (let j = 1; j >= 0; --j) {
          let child = opNode.children[i+j];

          if (!child)
            continue

          latex += child.latex();

          if (k === 0) {
            latex += " & ";
          } else {
            latex += " \\\\ ";
          }

          k++;
        }
      }

      latex += post;

      return latex
    case "not":
      return "\\neg(" + opNode.children.map(child => child.latex()).join('+') + ')'
    case "and":
      return opNode.children.map(child => child.latex()).join("\\land ")
    case "or":
      return opNode.children.map(child => child.latex()).join("\\lor ")
    case "abs":
      return '\\left|' + opNode.children.map(child => child.latex()).join(",") + '\\right|'
    default:
      let needs_parens2 = opNode.needsParentheses();

      let operatorName = getOperatorName(opNode.operator);
      if (!needs_parens2 && alwaysParenthesize(opNode.operator)) {
        needs_parens2 = true;
      }

      return `${operatorName}${needs_parens2 ? '\\left(' : ''}${opNode.children.map(child => child.latex()).join(',\\,')}${needs_parens2 ? '\\right)' : ''}`
  }
}

// const fs = require( ...

// List of operators (currently)
// +, -, *, /, ^,

const comparisonOperators = ['<', '>', '<=', '>=', '!=', '=='];

let floatRepresentabilityTester;
const matchIntegralComponent = /[0-9]*\./;
const trailingZeroes = /0+$/;

function isExactlyRepresentableAsFloat (f) {
  if (typeof f === 'number') {
    return true
  }
  if (!floatRepresentabilityTester) {
    floatRepresentabilityTester = new Grapheme.Real(0, 53);
  }
  floatRepresentabilityTester.value = f;

  return floatRepresentabilityTester.value.replace(trailingZeroes, '').replace(matchIntegralComponent, '') ===
    f.replace(matchIntegralComponent, '')
}

class ASTNode {
  constructor (params = {}) {

    const {
      parent = null,
      children = []
    } = params;

    this.children = children;
    this.parent = parent;
  }

  _getCompileText (defineVariable) {
    return this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join('+')
  }

  _getIntervalCompileText (defineVariable) {
    return this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',')
  }

  _getRealCompileText (defineRealVariable) {
    return this.children.map(child => '(' + child._getRealCompileText(defineRealVariable) + ')').join('+')
  }

  applyAll (func, depth = 0) {
    func(this, depth);

    this.children.forEach(child => {
      if (child.applyAll) {
        child.applyAll(func, depth + 1);
      }
    });
  }

  clone () {
    let node = new ASTNode();

    node.children = this.children.map(child => child.clone());

    return node
  }

  compile (exportedVariables) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames();
    }

    let preamble = '';

    const defineVariable = (variable, expression) => {
      preamble += `let ${variable}=${expression};`;
    };

    let returnVal = this._getCompileText(defineVariable);

    return {
      func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
      variableNames: exportedVariables
    }
  }

  compileInterval (exportedVariables) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames();
    }
    let preamble = '';

    const defineVariable = (variable, expression) => {
      preamble += `let ${variable}=${expression};`;
    };

    let returnVal = this._getIntervalCompileText(defineVariable);

    return {
      func: new Function(...exportedVariables, preamble + 'return ' + returnVal),
      variableNames: exportedVariables
    }
  }

  compileReal (exportedVariables, precision = 53) {
    if (!exportedVariables) {
      exportedVariables = this.getVariableNames();
    }

    let Variables = {};
    let preamble = '';

    const defineRealVariable = (name, value, variable) => {
      Variables[name] = new Grapheme.Real(precision);
      if (value) {
        if (value === 'pi') {
          preamble += `${name}.set_pi()`;
        } else if (value === 'e') {
          preamble += `${name}.set_e()`;
        } else if (isExactlyRepresentableAsFloat(value)) {
          preamble += `${name}.value = ${value.toString()}; `;
        } else {
          preamble += `${name}.value = "${value}"; `;
        }

      } else {
        preamble += `${name}.value = ${variable};`;
      }
    };

    let text = this._getRealCompileText(defineRealVariable);

    let realVarNames = Object.keys(Variables);
    let realVars = realVarNames.map(name => Variables[name]);

    let func = new Function(...realVarNames, ...exportedVariables, `${preamble}
      return ${text};`);
    let isValid = true;

    return {
      isValid () {
        return isValid
      },
      set_precision: (prec) => {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        realVars.forEach(variable => variable.set_precision(prec));
      },
      evaluate: (...args) => {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        return func(...realVars, ...args)
      },
      variableNames: exportedVariables,
      free () {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        isValid = false;

        realVars.forEach(variable => variable.__destroy__());
      },
      _get_func () {
        if (!isValid) {
          throw new Error('Already freed compiled real function!')
        }
        return func
      }
    }
  }

  derivative (variable) {
    let node = new ASTNode();

    node.children = this.children.map(child => child.derivative(variable));

    node.applyAll(child => {
      if (child.children) {
        child.children.forEach(subchild => subchild.parent = child);
      }
    });

    return node
  }

  evaluateConstant () {
    return this.children.map(child => child.evaluateConstant()).reduce((x, y) => x + y, 0)
  }

  getText () {
    return '(node)'
  }

  getVariableNames () {
    let variableNames = [];

    this.applyAll(child => {
      if (child instanceof VariableNode) {
        let name = child.name;

        if (variableNames.indexOf(name) === -1 && comparisonOperators.indexOf(name) === -1) {
          variableNames.push(name);
        }
      }
    });

    return variableNames
  }

  hasChildren () {
    return this.children.length !== 0
  }

  isConstant () {
    return this.children.every(child => child.isConstant())
  }

  latex (parens = true) {
    let latex = this.children.map(child => child.latex()).join('+');

    if (parens) {
      return String.raw`\left(${latex}\right)`
    }
    return latex
  }

  needsParentheses () {
    return !(this.children.length <= 1 && (!this.children[0] || !this.children[0].hasChildren()))
  }

  setParents () {
    this.applyAll(child => {
      if (child.children) {
        child.children.forEach(subchild => subchild.parent = child);
      }
    });
  }

  toJSON () {
    return {
      type: 'node',
      children: this.children.map(child => child.toJSON())
    }
  }

  type () {
    return 'node'
  }
}

const greek = ['alpha', 'beta', 'gamma', 'Gamma', 'delta', 'Delta', 'epsilon', 'zeta', 'eta', 'theta', 'Theta', 'iota', 'kappa', 'lambda', 'Lambda', 'mu', 'nu', 'xi', 'Xi', 'pi', 'Pi', 'rho', 'Rho', 'sigma', 'Sigma', 'tau', 'phi', 'Phi', 'chi', 'psi', 'Psi', 'omega', 'Omega'];

function substituteGreekLetters (string) {
  if (greek.includes(string)) {
    return '\\' + string
  }

  return string
}

class VariableNode extends ASTNode {
  constructor (params = {}) {
    super();

    const {
      name = 'x'
    } = params;

    this.name = name;
  }

  _getCompileText (defineVariable) {
    if (comparisonOperators.includes(this.name)) {
      return '"' + this.name + '"'
    }
    return this.name
  }

  _getIntervalCompileText (defineVariable) {
    if (comparisonOperators.includes(this.name)) {
      return '"' + this.name + '"'
    }
    return this.name
  }

  _getRealCompileText (defineRealVariable) {
    if (comparisonOperators.includes(this.name)) {
      return `'${this.name}'`
    }
    let var_name = '$' + getRenderID();

    defineRealVariable(var_name, null, this.name);

    return var_name
  }

  clone () {
    return new VariableNode({ name: this.name })
  }

  derivative (variable) {
    if (variable === this.name) {
      return new ConstantNode({ value: 1 })
    } else {
      return new ConstantNode({ value: 0 })
    }
  }

  evaluateConstant () {
    return NaN
  }

  getText () {
    return this.name
  }

  isConstant () {
    return false
  }

  isConstant () {
    return false
  }

  latex () {
    if (comparisonOperators.includes(this.name)) {
      switch (this.name) {
        case '>':
        case '<':
          return this.name
        case '>=':
          return '\\geq '
        case '<=':
          return '\\leq '
        case '==':
          return '='
        case '!=':
          return '\\neq '
      }
    }

    return substituteGreekLetters(this.name)
  }

  toJSON () {
    return {
      type: 'variable',
      name: this.name
    }
  }

  type () {
    return 'variable'
  }
}

const OperatorPatterns = {
  'sin': ['Math.sin'],
  '+': ['', '+'],
  '-': ['', '-'],
  '*': ['', '*'],
  '/': ['', '/'],
  '^': ['', '**'],
  '<': ['', '<'],
  '<=': ['', '<='],
  '>': ['', '>'],
  '>=': ['', '>='],
  '==': ['', '==='],
  '!=': ['', '!=='],
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
  'log': ['Math.log'],
  'log10': ['Math.log10'],
  'log2': ['Math.log2'],
  'sinh': ['Math.sinh'],
  'cosh': ['Math.cosh'],
  'tanh': ['Math.tanh'],
  'csch': ['1/Math.sinh'],
  'sech': ['1/Math.cosh'],
  'coth': ['1/Math.tanh'],
  'asinh': ['Math.asinh'],
  'acosh': ['Math.acosh'],
  'atanh': ['Math.atanh'],
  'asec': ['Math.acos(1/', '+', ')'],
  'acsc': ['Math.asin(1/', '+', ')'],
  'acot': ['Grapheme.Functions.Arccot', ','],
  'acsch': ['Math.asinh(1/', '+', ')'],
  'asech': ['Math.acosh(1/', '+', ')'],
  'acoth': ['Math.atanh(1/', '+', ')'],
  'logb': ['Grapheme.Functions.LogB', ','],
  'gamma': ['Grapheme.Functions.Gamma', ','],
  'factorial': ['Grapheme.Functions.Factorial', ','],
  'ln_gamma': ['Grapheme.Functions.LnGamma', ','],
  'digamma': ['Grapheme.Functions.Digamma', ','],
  'trigamma': ['Grapheme.Functions.Trigamma', ','],
  'polygamma': ['Grapheme.Functions.Polygamma', ','],
  'pow_rational': ['Grapheme.Functions.PowRational', ','],
  'max': ['Math.max', ','],
  'min': ['Math.min', ','],
  'floor': ['Math.floor', ','],
  'ceil': ['Math.ceil', ',']
};

class OperatorNode extends ASTNode {
  constructor (params = {}) {
    super(params);

    const {
      operator = '^'
    } = params;

    this.operator = operator;
  }

  _getCompileText (defineVariable) {

    switch (this.operator) {
      case 'cchain':
        let components = this.children;
        let ids = [];
        for (let i = 0; i < components.length; i += 2) {
          let variableId = '$' + getRenderID();

          defineVariable(variableId, components[i]._getCompileText(defineVariable));

          ids.push(variableId);
        }

        let comparisons = [];

        for (let i = 1; i < components.length; i += 2) {
          let comparison = components[i];
          let lhs = ids[(i - 1) / 2];
          let rhs = ids[(i + 1) / 2];

          // comparisons in cchains are variables
          comparisons.push('(' + lhs + comparison.name + rhs + ')');
        }

        return comparisons.join('&&')
      case 'ifelse':
        const res = this.children.map(child => child._getCompileText(defineVariable));

        return `((${res[1]})?(${res[0]}):(${res[2]}))`
      case 'piecewise':
        if (this.children.length === 0) {
          return '(0)'
        }

        if (this.children.length === 1) {
          return this.children[0]._getCompileText(defineVariable)
        }

        if (this.children.length === 3) {
          return new OperatorNode({
            operator: 'ifelse',
            children: [this.children[1], this.children[0], this.children[2]]
          })._getCompileText(defineVariable)
        } else if (this.children.length === 2) {
          return new OperatorNode({
            operator: 'ifelse',
            children: [this.children[1], this.children[0], new ConstantNode({ value: 0 })]
          })._getCompileText(defineVariable)
        } else {
          let remainder = new OperatorNode({
            operator: 'piecewise',
            children: this.children.slice(2)
          })._getCompileText(defineVariable);

          let condition = this.children[0]._getCompileText(defineVariable);
          let value = this.children[1]._getCompileText(defineVariable);

          return `((${condition})?(${value}):(${remainder}))`
        }
      case 'and':
        return this.children.map(child => child._getCompileText(defineVariable)).join('&&')
      case 'or':
        return this.children.map(child => child._getCompileText(defineVariable)).join('||')
    }

    let pattern = OperatorPatterns[this.operator];

    if (!pattern) {
      throw new Error('Unrecognized operation')
    }

    return pattern[0] + '(' + this.children.map(child => '(' + child._getCompileText(defineVariable) + ')').join(pattern[1] ? pattern[1] : '+') + ')' + (pattern[2] ? pattern[2] : '')
  }

  _getIntervalCompileText (defineVariable) {
    const children_text = this.children.map(child => child._getIntervalCompileText(defineVariable)).join(',');

    return `Grapheme.Intervals['${this.operator}'](${children_text})`
  }

  _getRealCompileText (defineRealVariable) {
    let children = this.children;
    if (this.operator === 'piecewise') {
      if (children.length % 2 === 0) {
        // add default value of 0
        children = children.slice();
        children.push(new ConstantNode({
          value: 0,
          text: '0'
        }));
      }
    }

    if (this.operator === 'ifelse') {
      if (children.length === 2) {
        // add default value of 0
        children.push(new ConstantNode({
          value: 0,
          text: '0'
        }));
        return
      }
    }

    const children_text = children.map(child => child._getRealCompileText(defineRealVariable)).join(',');

    return `Grapheme.REAL_FUNCTIONS['${this.operator}'](${children_text})`
  }

  clone () {
    let node = new OperatorNode({ operator: this.operator });

    node.children = this.children.map(child => child.clone());

    return node
  }

  derivative (variable) {
    return operator_derivative(this, variable)
  }

  evaluateConstant () {
    return Operators[this.operator](...this.children.map(child => child.evaluateConstant()))
  }

  getText () {
    return this.operator
  }

  latex () {
    return getLatex(this)
  }

  toJSON () {
    return {
      type: 'operator',
      operator: this.operator,
      children: this.children.map(child => child.toJSON())
    }
  }

  type () {
    return 'operator'
  }
}

class ConstantNode extends ASTNode {
  constructor (params = {}) {
    super();

    const {
      value = 0,
      text = '',
      invisible = false
    } = params;

    this.value = value;
    this.text = text ? text : StandardLabelFunction(value);
    this.invisible = invisible;
  }

  _getCompileText (defineVariable) {
    return this.value + ''
  }

  _getIntervalCompileText (defineVariable) {
    let varName = '$' + getRenderID();
    if (isNaN(this.value)) {
      defineVariable(varName, `new Grapheme.Interval(NaN, NaN, false, false, true, true)`);
      return varName
    }

    defineVariable(varName, `new Grapheme.Interval(${this.value}, ${this.value}, true, true, true, true)`);
    return varName
  }

  _getRealCompileText (defineRealVariable) {
    let var_name = '$' + getRenderID();
    defineRealVariable(var_name, this.text);
    return var_name
  }

  clone () {
    return new ConstantNode({
      value: this.value,
      invisible: this.invisible,
      text: this.text
    })
  }

  derivative () {
    return new ConstantNode({ value: 0 })
  }

  evaluateConstant () {
    return this.value
  }

  getText () {
    return this.invisible ? '' : this.text
  }

  isConstant () {
    return true
  }

  latex () {
    return this.getText()
  }

  toJSON () {
    return {
      value: this.value,
      text: this.text,
      invisible: this.invisible,
      type: 'constant'
    }
  }

  type () {
    return 'constant'
  }
}

function powerExactlyRepresentableAsFloat (power) {
  if (typeof power === 'number') return true

  // todo, make more precise
  if (Number.isInteger(parseFloat(power))) {
    return true
  }

  return false

  /*if (!floatRepresentabilityTester)
    floatRepresentabilityTester = new Real(0, 53)

  floatRepresentabilityTester.value = power

  floatRepresentabilityTester.subtract_float(1)

  floatRepresentabilityTester.set_precision(106)

  floatRepresentabilityTester.add_float(1)

  return floatRepresentabilityTester.value.replace(trailingZeroes, '').replace(matchIntegralComponent, '') ===
    power.replace(matchIntegralComponent, '');*/
}

const LN2 = new OperatorNode({
  operator: 'ln',
  children: [new ConstantNode({ value: 10 })]
});
const LN10 = new OperatorNode({
  operator: 'ln',
  children: [new ConstantNode({ value: 10 })]
});
const ONE_THIRD = new OperatorNode({
  operator: '/',
  children: [
    new ConstantNode({ value: 1 }),
    new ConstantNode({ value: 3 })
  ]
});

onmessage = function (evt) {

};



// { job: "defineFunction", jobID: 1, data: { func: ASTNode.toJSON(), exportedVariables: ['x', 'y'] }}
// { job: "deleteFunction", jobID: 2, data: { functionID: 1 }}
// { job: "calculatePolylineVertices", jobID: 3, data: { pen: pen.toJSON(), vertices: [ ... ]}}
// { job: "generateContours2", jobID: 4, data: { functionID: 1, box: { ... }}}
// { job: "adaptivelySample1D", jobID: 5, data: { functionID: 1, xmin: -1, xmax: 1, ... }}
// { job: "sample1D", jobID: 6, ... }
//
