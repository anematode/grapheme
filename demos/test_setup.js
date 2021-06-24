
if (document.location.origin.search("localhost") > -1) {
// An idiotic hack to allow Grapheme to load as an ES6 module while I can pretend it loaded as a bundle
  const moduleLoader = document.createElement("script")

  moduleLoader.innerHTML = `
import * as Grapheme from "../src/main.js"

window.Grapheme = Grapheme
window.deferLoad = () => {}

// Remove and readd the script. It won't crash now.
Grapheme.utils.onReady(() => {
const script = document.getElementById("setup")
const scriptText = script.innerHTML

script.parentNode.removeChild(script)
const newScript = document.createElement("script")
newScript.setAttribute("id", "cow")
newScript.innerHTML = scriptText
document.body.appendChild(newScript)
})
`

  moduleLoader.setAttribute("type", "module")
  document.body.appendChild(moduleLoader)
} else {
  setTimeout(() => {
    const grapheme = document.createElement("script")
    grapheme.setAttribute("src", "../build/grapheme.js")
    document.body.appendChild(grapheme)

    setTimeout(() => {
      const script = document.getElementById("setup")
      const scriptText = script.innerHTML

      const newScript = document.createElement("script")
      newScript.innerHTML = scriptText
      document.body.appendChild(newScript)
    }, 1000)
  }, 0)
}
