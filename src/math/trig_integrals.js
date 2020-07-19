import { SingleVariablePolynomial } from './polynomial'
import * as utils from "../core/utils"

let SiP1 = new SingleVariablePolynomial([1, -4.54393409816329991e-2, 1.15457225751016682e-3, -1.41018536821330254e-5, 9.43280809438713025e-8, -3.53201978997168357e-10, 7.08240282274875911e-12, -6.05338212010422477e-16])
let SiQ1 = new SingleVariablePolynomial([1, 1.01162145739225565e-2, 4.99175116169755106e-5, 1.55654986308745614e-7, 3.28067571055789734e-10, 4.5049097575386581e-13, 3.21107051193712168e-16])
let CiP1 = new SingleVariablePolynomial([-0.25, 7.51851524438898291e-3, -1.27528342240267686e-4, 1.05297363846239184e-6, -4.68889508144848019e-9, 1.06480802891189243e-11, -9.93728488857585407e-15])
let CiQ1 = new SingleVariablePolynomial([1, 1.1592605689110735e-2, 6.72126800814254432e-5, 2.55533277086129636e-7, 6.97071295760958946e-10, 1.38536352772778619e-12, 1.89106054713059759e-15, 1.39759616731376855e-18])
let FP1 = new SingleVariablePolynomial([1, 7.44437068161936700618e2, 1.96396372895146869801e5, 2.37750310125431834034e7, 1.43073403821274636888e9, 4.33736238870432522765e10, 6.40533830574022022911e11, 4.20968180571076940208e12, 1.00795182980368574617e13, 4.94816688199951963482e12, 4.94701168645415959931e11])
let FQ1 = new SingleVariablePolynomial([1, 7.46437068161927678031e2, 1.97865247031583951450e5, 2.41535670165126845144e7, 1.47478952192985464958e9, 4.58595115847765779830e10, 7.08501308149515401563e11, 5.06084464593475076774e12, 1.43468549171581016479e13, 1.11535493509914254097e13])
let GP1 = new SingleVariablePolynomial([1, 8.1359520115168615e2, 2.35239181626478200e5, 3.12557570795778731e7, 2.06297595146763354e9, 6.83052205423625007e10, 1.09049528450362786e12, 7.57664583257834349e12, 1.81004487464664575e13, 6.43291613143049485e12,
  -1.36517137670871689e12])
let GQ1 = new SingleVariablePolynomial([1, 8.19595201151451564e2, 2.40036752835578777e5, 3.26026661647090822e7, 2.23355543278099360e9, 7.87465017341829930e10, 1.39866710696414565e12, 1.17164723371736605e13, 4.01839087307656620e13, 3.99653257887490811e13])


function f(x) {
  let recip = 1 / x
  let recipSq = recip * recip

  return recip * FP1.evaluate(recipSq) / FQ1.evaluate(recipSq)
}

function g(x) {
  let recipSq = 1 / (x * x)

  return recipSq * GP1.evaluate(recipSq) / GQ1.evaluate(recipSq)
}

function Si(x) {
  if (x === 0)
    return 0

  if (x < 0)
    return -Si(-x)

  if (x <= 4) {
    // PADE APPROXIMANT

    let xSq = x * x

    return x * SiP1.evaluate(xSq) / SiQ1.evaluate(xSq)
  } else {
    return Math.PI / 2 - f(x) * Math.cos(x) - g(x) * Math.sin(x)
  }
}

function Ci(x) {
  if (x === 0)
    return -Infinity

  if (x < 0)
    return Ci(-x)

  if (x <= 4) {
    // PADE APPROXIMANT
    let xSq = x * x

    return utils.eulerGamma + Math.log(x) + xSq * CiP1.evaluate(xSq) / CiQ1.evaluate(xSq)
  } else {
    return f(x) * Math.sin(x) - g(x) * Math.cos(x)
  }
}

export { Si, Ci }
