import { OperatorNode } from './node'

function add(clone=true, node1, node2, ...args) {
  if (args)
    return add(clone, node1, add(clone, node2, ...args))

  let node = OperatorNode({
    operator: '+',
    children: [node1, node2]
  })

  if (clone)
    node = node.clone()

  return node
}

function sub(clone=true, node1, node2) {
  let node = new OperatorNode({
    operator: '-',
    children: [node1, node2]
  })

  if (clone)
    node = node.clone()

  return node
}

function mul(clone=true, node1, node2, ...args) {
  if (args)
    return mul(clone, node1, mul(clone, node2, ...args))

  let node = OperatorNode({
    operator: '*',
    children: [node1, node2]
  })

  if (clone)
    node = node.clone()

  return node
}

function div(clone=true, node1, node2) {
  let node = new OperatorNode({
    operator: '/',
    children: [node1, node2]
  })

  if (clone)
    node = node.clone()

  return node
}

export const OperatorHelpers = {
  add, sub, mul, div
}
