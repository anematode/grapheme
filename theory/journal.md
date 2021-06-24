# November 20

Feeling excited about Grapheme again. I wonder how many hours it will last....

Here is the overall concept. Things are similar to three.js, but with a bit more nuances. Let's take an example scene and see how it plays out in this system.

We have a scene of width 1920 and height 1080. Within the scene, there are two plots. On the left (size 960 by 1080) is a nice log-log plot (id COW) containing a set of gridlines and two functions, one of e^x (id ex) and one of x^2 (id x2). The functions are interactive, so that if you click on it anywhere, a point appears and can be dragged around. Clicking on anywhere else—including on another graph—causes the point to disappear. The points themselves are crosses and labeled with text containing the coordinates of the point. The top of the plot is labeled "Two Handsome Plots" and there are some margins on the sides; the x-axis is labeled "cows (millions)" and the y-axis is labeled "chickens (m)". On the right (size 960 by 1080) is a normal plot of the Mandelbrot set (id mandel), zoomed in rather far. On top are arrows and labels indicating various interesting parts of the set.

The code for this might look something like...

const scene = new Grapheme.InteractiveScene()

const logLog = new Grapheme.Plot2D({ id: "COW", transformation: "log-log" })
const mandel = new Grapheme.Plot2D({ id: "mandel" })

scene.add(logLog, mandel)

// Attach scene's DOM element
document.body.appendChild(scene.domElement)


There's obviously a lot going on here, but it shows a lot of the desired features. First, we have ELEMENTS, which are the various components of a scene, including plots, text boxes, the Mandelbrot set, the gridlines, the lines within the gridlines, 

# March 20

Hm... what about SVG rendering and stuff. There must be other ways for this.

In what cases does the calculation for rendering for WebGL, versus for SVG, matter? It's a relatively small set. I think the render() function should return some special thing. What should the code look like for attaching to a canvas and stuff.

```js
const renderer = new Grapheme.WebGLRenderer()
const svgRenderer = new Grapheme.SVGRenderer()
const scene = new Grapheme.InteractiveScene() // This by default creates a domElement, also to which the event listeners are attached. Can be turned off with { dom: false }. The DOM element cannot be added after the fact (?)

document.body.appendChild(scene.domElement)

const anotherCanvas = new OffscreenCanvas(5, 5)  // Some other canvas

renderer.render(scene) // Puts an image bitmap canvas inside the dom element and copies to it from the internal renderer
renderer.render(scene, anotherCanvas) // Renders the scene to another canvas
svgRenderer.render(scene) // Puts an SVG in the canvas, etc.
```

How will the rest of this stuff work? I don't think storing whether each prop changed is sustainable. It's just pointless. Then again, inheritance and all that is pretty cool. But for a thing like polylines, it's annoying to have to propagate the whole styling information...

```js
const scene = new Grapheme.InteractiveScene()
const plot = new Grapheme.InteractivePlot()
const lineThing = new Grapheme.Polyline()

scene.add(plot)
plot.add(lineThing)

lineThing.set("vertices", [[2, 5], [3, 5]])
lineThing.markUpdate().get("vertices").push([3, 3])
```

How will properties be stored? Should there be such thing as property nesting? Perhaps adding styling information later on would work, sort of "presets". What are the benefits of property nesting? It could simplify the interface and inheritance. Let's be clear what I mean. Suppose we want to make a polyline that's orange and dashed. We could do this:

```js
// Option 1
lineThing.set("lineStyle", new LineStyle2D({ color: "orange", dashPattern: "pattern" }))

// Option 2
lineThing.set({ color: "orange", dashPattern: "pattern" })
```

In the first case, lineStyle could be directly inherited, whereas in the second, you'd have to inherit color and dashPattern, which is annoying and the first would affect things like text. But maybe this is where classes and CSS-style styling would come to the rescue. Like what if you could add ".graph { color: 'orange' }" in some way. That seems far more elegant. And the keys could be complex values, like arrays and stuff. Okay, that's cool. We should use flat properties. We'll use `elem.set(propName, value)` for setting properties. For each property we also store whether it's changed, whether it's inheritable and whether it's overrideable. Should this be stored with three booleans? Or would a little bit flag thing be nice. Hm... it depends how much metadata we're storing. We could store quite a bit with a bit flag. Haha. 31, in fact. Eh, smells like premature optimization. We could also store the previous value... I think that sounds nice too, but it's only useful in a few cases. I think that stuff can be manually stored for certain classes.

There will be several rendering stages, because this is complicated as hell. We want to be able to dynamically place plots in a scene. Take this code:

```js
const scene = new Grapheme.InteractiveScene()
const plot1 = new Grapheme.InteractivePlot()
const plot2 = new Grapheme.InteractivePlot()

plot1.centerOn(0, 0).requireAspectRatio(1).setWidth(5) // Changes the properties of the plot transformation. If it was previously updated, set updateStage to 0
plot2.centerOn(0, 0).requireAspectRatio(1).setWidth(0.0001)

const pointCloud = new Grapheme.PointCloud()
pointCloud.set({
  points: [4, 5, 1, 4, 8, 9],
  pointGlyph: Grapheme.Glyphs.Cross,
  color: "#005012"
})

const fplot = new Grapheme.FunctionPlot()
fplot.set({
  function: "x^3",
  thickness: 2,
  endcap: "dynamic"
})

const gridlines = new Grapheme.Gridlines()
plot2.add(gridlines)

plot1.setPadding(20)

const plotLabels = new Grapheme.PlotLabels()
plot1.add(plotLabels)

plotLabels.set({
  xaxis: "Real",
  yaxis: "Imag",
  color: "gray",
  font: "Helvetica"
})

plot1.add(pointCloud)
plot2.add(fplot)

scene.add(plot1, plot2) // Plot 1 and Plot 2 are both, say, positioned at (0,0) and have a size of 640x480 pixels, whatever the defaults are.
```

I guess computedProps is kind of the place where the ultimate props are put. But at the inheritance stage, we have to inherit from the computedProps. This is confusing as hell. How are the positions of labels going to be calculated? Ugh, this is so confusing. And how can there be continuity of labels on certain plots? Probably label objects should be kept as constant as possible.

Okay, let's figure out computedProps and inheritance first. Maybe the updating logic will include all the "special" things, like label occlusion and legends and all that.

### Properties and inheritance

See this code.
```js
const group = new Grapheme.Group()
const subgroup = new Grapheme.Group()
const elem = new Grapheme.Element()

group.set({ cow: 0, chicken: 1}, { inherit: 1 }) // 1 means inherit properties
subgroup.set({ chicken: "chicken", sheep: "sheep" })
elem.set({ goat: "goat" })

group.add(subgroup.add(elem))

elem.get("goat")  // -> "goat"
elem.get("sheep") // -> undefined
elem.get("cow") // -> undefined

elem.getComputedProp("cow") // -> 0 ?
```

What about things like auto-placing plots and legends and stuff? That stuff needs to go into computedProps, since props should be untouched. So the computed prop... isn't guaranteed to be valid until after the updating? I think that's the cleanest solution. And props/computedProps aren't marked as unchanged until updating is finished. The annoying thing is that there's no way to really encapsulate the needed data to update something from scratch, which makes consistent beasting difficult. But I think that's okay; we'll just create specialized jobs. Cool.

Okay so this is how the properties work. There is a Map with keys of the property names and values of {value, inherit: 0/1/2, changed: true/false}. The value is the current value of the property; easy enough. Inherit is the method in which that property cascades to children. The default of 0 means no inheritance. 1 means it inherits, and 2 means it inherits and cannot be overridden.

Here's how this might work in practice:

Scene: { sceneWidth: 1280, sceneHeight: 760, screenDPI: 2, canvasWidth: 2560, canvasHeight: 1520 } (all inherit 2); { boundingBox: [0, 0, 2560, 1520], interactive: true } (all inherit 0)
child of Scene, Plot: { plotTransform: PlotTransformLogLog2D( ... ), plotBoundingBox: [ 0, 0, 2560, 1520 ] } (all inherit 1), { boundingBox: [ ... same as plotBoundingBox, unless some labels escape ... ], interactive: true,  } (all inherit 0)

What are the benefits of this pure prop system, and inheritance? There is a degree of encapsulation, where the computedProps are all that's necessary to know exactly how an object is going to be rendered. It also helps us keep track of what has changed so that we can update much more quickly. If FunctionPlot2D sees that color has changed, but nothing else, it doesn't have to recompute anything. It also lends itself to a CSS-like style sheet, where you can specify the various styling of objects beforehand. It also lets us use elements out of their "natural habitat": we can freely plop a function plot in a place without a plot by giving it a suitable plotTransform, rather than "faking" a plot or something. Indeed, all the FunctionPlot2D cares about—apart from its own styling information—is the plotTransform. What are some drawbacks? It's pretty inefficient. They say no premature optimization, but I worry the complexity is just too high. Grapheme is supposed to be very fast. Plus, only a few types of properties actually NEED to be inherited. Plot transforms, canvas sizes... and what else? And only some need to be specially tracked when they change for optimization.

But why not give it a try. Let's see, step by step, how a Grapheme scene's properties will be rendered.

Stage 0: It begins. We first sort every group's children by their ordering.
Stage 1: We now arrange the things like Plot2D, PieChart, et cetera, in two stages. Their positions can be partially or completely specified, but the arranging happens at a higher level. This stage only applies to certain elements; those which take up a definite box position like a <div> or something. As an example, it's conceivable that scene.get("display") === "flex", plot1.get("minWidth") === plot2.get("minWidth") === 50, plot1.get("flex-grow") === 2, plot2.get("flex-grow") === 1. Perhaps Plot2D, PieChart etc. will have some tag on their constructors indicating they need to be arranged this way. In the first stage they'll be asked via some function getPositionStance() which will be used by the arranger. It might return something like { maxWidth: 1000, minWidth: 100, aspectRatioMin: 0.5, aspectRatioMax: 2, margins: [10, 10, 10, 10] }. I dunno. That's for future consideration.
Stage 2: We change the corresponding plotBoundingBox for these arranged things, telling each where they will continue to graph.
Stage 3: We calculate all the props according to inheritance, etc, marking what has changed in the meantime.
Stage 4: We update all the elements according to these changed props, saving appropriate data for rendering into an internal storage. Elements like FunctionPlot2D can add information about themselves to a legend registry, which can be inherited from a scene or from a plot or something.
Stage 5: We calculate the positions of all the smartly positioned things (labels, legends) using a label registry thing... oof. Complex.
Stage 6: We update all smartly positioned things.
Stage 7: We compute all bounding boxes; we are done.

Element creation is going to be annoyingly expensive, because it's going to inherit a bunch of properties it doesn't really need. That's annoying as hell. In that earlier example, adding a label and legend registry, a label would inherit eight properties, only one of which it would use. In this case I think the best option is to create a LabelSet or something like that... still annoying. But premature optimization, premature optimization... maybe it's fine. Or... an element without children can have the optimization that it only inherits/looks for properties it can actually use. I think that works.

This is still so annoying. I can't believe how complicated this problem is. Maybe I need to back up and be more restrictive, be simpler.

One of the main benefits of inheritance is that we can keep track of what has changed since the last completed update computation. Consider an EquationPlot2D for instance, that may be using a rather expensive plot. If we keep track of the change in plotTransform since the last one, we can just compute the surrounding data. If we have a simple color change, we don't have to recompute anything; if we change the dash pattern, we just have to recompute the triangulation vertices. Hm... would this be amenable to an in-progress thing? Maybe... if we throw away correctness. Even still... I fear this is too complicated. I'm having a deja vu moment here for some reason.

Maybe the answer is a combination of inheritance and explicitness? I think the question depends on what people (or me) actually WANT out of Grapheme. Velar, sure, but the primary focus is making nice graphs of functions and complex data for my projects. There is already d3.js; that's done and dusted. But d3 can't do mathematical things, and definitely can't do very complex graphs without slowing down massively due to SVG. Let me write out some recent tasks I've wanted:

* Plot a given sample on a graph which can be horizontally zoomed on, with a title "Sample" and axis labels "Time (s)" and "Amplitude"
* Plot the real and complex parts of the FFT spectrum of a given sample, using blue and orange polylines on a graph with a title "FFT of Given Signal", x-axis label "Frequency (Hz)", and a two-part legend
* Plot an FFT spectrum as a heat map, a la FL Studio (I've done that before)
* Plot a Reuleaux triangle and rotate it between two stationary lines
* Plot a general curve of constant width and rotate it in an animation, tracing its center
* Plot a point cloud and be able to drag points around
* Automatically label the two extrema of x^3-x with points, which can be clicked on for their values (Desmos does this)
* Custom label the eight extreme points on a supercircle of radius 1

This gives some motivation, and some clues. Inheritance is probably helpful... but it also causes some confusion. Perhaps the most confusing is the case of automatic labels. How should they be styled? Through inheritance? Through the class system? Or through a bunch of annoying extra props on the parent element, like "labelColor", ... ? This was already a point of confusion in the first Grapheme, so the problem has cropped up again. The class system is probably most sensible here. So I guess we'll get to that later!

# April 4

Okay, so we have coordinate spaces. We should give them names! How about graph space, clip space, pixel space, and CSS/canvas space. Graph space is, well, the points in a given plot. 

# April 16

The prop storing is starting to make sense, although inheritance seems complicated. One long-term advantage of these fancy prop stores, storing prop metadata, is that animations could be done.

# April 25

Man. Gnuplot is scary. Grapheme would therefore be scarier, since it does caching and all kinds of weird stuff. I see why Desmos doesn't expose much of their API at all. Horrifying. There's no clean way to abstractify all this shit.

I want Grapheme to be powerful enough for my personal projects and such, but I'm not sure if it can be. Simplicity is needed, but complexity is needed. My head is in such a state of abstract horror. For updating to occur, for rendering to occur, a complex dance must occur between the plots and their children, deciding how exactly things are to be drawn, creating primitives of various types. Certain interfaces must be defined abstracting the information necessary to draw things. I am genuinely horrified.

Let's implement props and inheritance, then keep talking.

Well, that's done and dusted. What's next? Well, we need to understand state at some point.

Currently we have this very abstract setup where  (computedProps) -> render() for any given element. It's a nice symbol of purity, but... it's not truly pure. It is deflowered by the addition of children and in general, other elements outside of computedProps. Looking back, it's not even clear why such an abstraction is so desirable. I mean, I guess it could be used for Beast type rendering, but I'd presume most of those tasks be done asynchronously in more fundamental calls.

Consider something like this:

```
scene.add(plot)

dataset1 = ...
dataset2 = ...

dataset1Elem = new DatasetLjeofwij(dataset1)
dataset2Elem = ...

plot.add(dataset1Elem, dataset2Elem)

plot.fit(dataset1, dataset2)
```

I guess you could pass it the data instead of the element. Hm, didn't think of that one. So maybe that's a bad example. But basically the problem is things are entirely asynchronous here. To know the value of a computed prop you have to do the whole update sequence, which is just not a vibe. And yet the computed prop is what determines everything's behavior. I mean if we give a FunctionPlot2D some property function: "x^2", and internally it stores some mathFunction: GraphemeFunctionHorrrificBeast(), then we don't have access to mathFunction until the whole thing updates. So these elements either become opaque, or we have to update them every time we request some information from them. And because update isn't even local, we have to do the top-level update every time.

That just sucks. I mean... it just sucks. The problem is: while the computed props system is good at providing some sort of uniform interface, AND being performant, it doesn't provide a way of synchronously querying the elements of that interface.

You could imagine doing some sort of reduced interface which is only dependent on the props. But even that... I don't know. Suppose we have some element  DraggablePoint, where we give it some props x and y. Then, on event drag, we are given in the event the start x and y and end x and y. We set the element's x and y props to these new values. But then, suppose we want the element's boundingBox. You'd have to call update, and then get the bounding box, because it's probably cached. And even if it's not cached it would have to be specially recomputed.

I guess these elements are just not intended for handling state. So do we handle state with local variables, and then forward these local variables to computed props? That's definitely a possibility. I don't know. I designed this element system with the goals of performance and purity, but it proves to be somewhat limiting, in that all of its operations are fundamentally asynchronous and then resolved at the end in a single monolithic update() call, so that the computed results cannot technically be known until the whole update sequence has been done. To be fair, it might not take that long, but it's still frustrating, and it's kind of a nightmare to think that an element's update() function might be being called while we're handling a synchronous event listener for the element, AND it might be updating all kinds of other things in the background.

It's hard to design a good element system, because there's no way to really satisfy all three concerns. We don't want unnecessary computations, we don't want it to be hard to use, and we don't want it to be limiting. The three constantly opposing features of any complex system. I mean, looking at tikz, yeah it's pretty cool, but it fails the unnecessary computations part hands down.

Hm... how can we operate on elements statically in a consistent way? We can't really operate on the computed props... unless the computed props are made simple enough where they are never modified directly by external forces. Then we can define a specific function called computeProps() which will compute the props of the element, if needed, and do so in a locally consistent way: inheritance + personal transformations. That way it can be accessed somewhat statically?

The other thing to consider is how exactly this is a problem. It's a problem in that when we do something like  cow.setFunction("function", "x^2") and it used to be "x^3", we can't do something like cow.evaluateFunction(2) and expect to get 4; we might get 8. And we can't exactly do cow.update() either.

This is where abstraction has gotten you, Tim. It is like flattening a Mobius strip, solving a Rubik's cube with a flipped edge, building a perpetual motion machine. There is no end. The three cycles repeat, and repeat, and repeat, and as you make advances in each, the others fall flat. You are trying to stretch a rubber band around three axles, a rubber band that simply is too small, and as you stretch it further—as your ambitions for Grapheme grow higher and higher—it breaks. You don't think someone has tried to make an online graphing calculator before? They did. It's called Desmos. Yeah, it's not customizable. Yeah, it cost more than a million dollars. You want customizability, performance, and ease of use, and you have peanuts in your savings account.

There simply is no simple, consistent way of storing all the information in a plot or other system in some basic abstract form of "parents", "children who know select things about their parents". It simply will not work, even if it has excellent purity. Yes, it allows you to draw a random whatever in isolation. So what? Why is that property useful?

Children know things about their parents and they should know it synchronously. Is that not common sense? Yes, you can have some form of update stages, but... what? What is this inheritance bullshit?

Hm. You could also have computed properties update synchronously. That's a bit cursed though, and probably inefficient. Probably the best way of holding state IS local variables or props—which are basically equivalent—and then just rolling with it. Calling update() or maybe some updateLite() when you need it. I think that's... okay? The abstraction becomes a bit more gnarly when we try to actually use these elements as not just *elements*, but *mathematical or statistical tools*. That's... where it breaks down, because I don't want to have to do a whole update() sequence to calculate some stddev on this data. Again, maybe updateLite() solves that conundrum, but ideally such things would be represented in a way that is not AN ELEMENT. Yeah. Querying the element should be done for graphical stuff, mainly. This is all rather abstract though.

I'm pretty happy with most of the ideas, though. Inheritance and a few other things are annoying but it makes sense; even the update stages might have some future significance. This system is not fundamentally broken, or even that limited. It's just not that static, or pure. Purity needs to be conjured, to be annotated. (I feel like that statement is going to prove prescient.)


## PRINCIPLES

0. Grapheme will live some day.
    * I readily admit that this project has existed for over two years, and some of the project's basic ideas were conjured up in the sixth grade. But I am slowly learning—if only by brute force trial and error.
    * The definition of her being "alive" is vague, like asking whether a virus is alive, or an iPhone is alive. But I have specific, achievable goals in mind, which I believe will steer the project towards long-term success.
1. A Grapheme scene is an abstract object, not *necessarily* tied to a specific on- or off-screen canvas.
    * Apart from permitting rendering to an SVG, mostly operating on this simplification reflects how things are actually graphed.
    * Scenes *can* render to a specific DOM element and receive interactive inputs from it, but this abstraction happens externally to the scene.
2. A Grapheme scene is not static, not pure, and not simple.
    * What makes Grapheme so difficult is the intersection of three interests that are often orthogonal: performance, simplicity and usability, and capability.
    * Balancing these three interests is often a game of whack-a-mole. Generally, the simplicity mole is less harassed—we are okay with *some* complexity.
    * Consider some other graphing libraries.
        * The Desmos API is relatively performant and is very simple to use, but has little customizability and capability beyond the default 2D plot, line graphs and inequalities.
        * The tikz LaTeX library is exceedingly versatile, but does not render dynamically and is often hard to use.
        * D3.js is an incredible feat of balancing these three interests, and is probably the best substitute graphing calculator. I couldn't create 10% of it in my lifetime. Nonetheless, SVG is not well-suited to more intense geometries and animations, and lacks support for shaders and textures. Many of D3's ideas translate well to Grapheme, though.
        * Matplotlib is ... a counterexample. It does pretty much everything, besides the accurate graphing algorithms that I'm after. I'm jelly. Eh, whatever. Programming's fun anyways!
    * Really, I just want an open-source version of Desmos. Is that too much to ask for?
2. Defining a scene are its width in CSS pixels, height in CSS pixels, and the device pixel ratio. 
    * The inclusion of the dpr seems arbitrary, but it's definitely important from a rendering perspective. Basically, how accurately do I have to calculate this, so that it looks right on a high DPI monitor.
    * Of course, the DPR could be set to 1 for consistency; it'll just look somewhat pixelated.
3. A scene is a special kind of element, which is a thing that has properties, can be rendered, and can be a child of another element.
    * In general, I'm following a three.js-like structure. Elements can be grouped and rendered in various ways.
    * By default they are not especially stateful, except that they store an internal object which 1. provides the necessary information for that element to be rendered, and 2. if desired, a cache of previously calculated information to be used for optimization.
    * The main issue of state is the element's updateStage, which is simply a number representing how far along it is on the rendering cycle.
    * An updateStage of 0 means the element needs to be updated. An updateStage of -1 means the element is finished updating.
    * Elements also store their parent, their scene, and a randomly generated id of the form abcd-abcd.
4. Elements have properties and computed properties.
    * Explain...
5. Elements are not tied to a specific renderer.
    * yada yada.

# April 30

In a static sense, all these props and computed props techniques make sense. I wrote about it in my physical journal yesterday. Yet, there remain key challenges to the model. Consider a scene and a figure with some 2D transformation. Supposedly, we'd know the actual plot transformation AFTER the update() function is called, because the figure doesn't know its position until after the "resolve positions" stage of rendering.

It honestly makes sense. If we change the scene size, or something within the figure that affects its margins, we will only know the figure transform after the update has completed. Yet that seems preposterous and wildly inefficient. Is there no way to, for example, directly set the plot transform? We can't operate on it, which makes it rather opaque. You *could* update it and then work on it... but ugh. It's a really difficult problem because there is no real answer. After all, the plot transform is not entirely up to you; the aspect ratio requirement will enforce it, and the change is important in case something else in the figure changes.

What it really shows is the fragility of the old system, in the sense that it makes lots of assumptions which need not hold. That being said, there may be some event-based method of handling these things which is more elegant. Consider the following propositions:

* The graph transform can only truly be known after the figure has updated, either entirely or partially
* The transform thus cannot be manipulated directly, unless the figure has updated

It would be really cool to do something like   figure.setCenter(0, 0).setWidth(5). Yet there are two barriers to doing that. One is, we don't even know the to-be plot transform. Two is, we have no way of storing state. Props is a very static system. It's good at being static, but bad at being dynamic.

The asynchronous part of updating is more or less nonnegotiable. But perhaps updating could be designed in a way so that a given element can be updated in place, without much controversy? I don't know. I don't know. I'm kinda pissed at this point. Ah, whatever. Might as well get the basics down first. Let's get to programming.  

# May 2

I've been dreaming about state longer than Karl Marx. Some things just aren't computable until after an element has finished updating. That's just the reality of it. You could add some sort of event listener like "after finished updating this time, do these extra steps," but that's just gross! The problem is fundamentally intractable because by definition you can't have synchronous access to an asynchronously computed property. You *can* have synchronous access to a property that has already been computed. But then, of course, treating a given property as just a variable requires recomputation of the property in question every single time it is to be queried (and its dependencies have changed).

Let's be extremely concrete about a specific, but relatively simple, problem. We have a scene, which the user has specified to have dimensions 640 x 480 pixels. For now, let's say this is specified through properties. We have a figure as a child of this scene.

# May 4

Notes from today's thinking session: Props will store *some* user related data and some *setters* which actually manipulate things instead of setting a particular value. What is manipulated is basically the computedProps. In the case of a plot and zoom setup, centerOn and zoomOn will directly affect the internal computedProps, which is really the "state" of the whole system. This frees up a lot of annoying abstraction and stuff.

props: {
    "width": { value: 560, changed: true, lastUserValue: undefined, isUserValue: true },
    "height": { value: ... },
    "dpr": { ... }
}

# May 7

Progress continues! The properties and update system may be so far considered as follows.

1. Elements follow a tree structure, with the scene at the top.
2. Each element has an updateStage, with -1 indicating the element has just been created, added or removed as a child, or needs deep recomputation for some reason. 0 indicates an update is needed. 100 (for now) indicates that an update is complete.
3. Each element has a props object, which is mostly meant for internal use. It generally stores the internal properties of an object, as a key-value dict.
4. A props object's main purpose is rather simple: it maps property names to their values. A scene may have, for example, a "width" property with the value 1280. We can say `props.getPropertyValue("width")` to obtain the value.
5. Props can be any value, except undefined. A prop that does not exist has the value undefined; `props.getPropertyValue("nonexistent")` returns undefined.
6. Deleting a property is equivalent to setting its value to undefined. `props.setPropertyValue("width", undefined)` is equivalent to saying `props.deleteProperty("width")`.
7. Each property tracks whether it has changed since the last time the element either processed the property, so that its behavior is equivalent, or the last time the element fully updated.
8. Properties can also be inheritable, which means their value is copied into the property stores of all the elements below it. The actual copying is done by the element, because the element may not even want some of the inheritable properties.
9. Inheritable properties cascade down all the way, unless some obstinate group decides otherwise and doesn't copy the properties to itself. In other words, groups should generally inherit props no matter what, while elements with no children can just inherit what they want.
10. Internally, a property has an inherit value of 2 if the property is defined in the element in question. It has an inherit value of 1 if the property is inherited from an element above. If the property is not inheritable, inherit is 0.
11. Therefore, an element can interrupt the default inheriting of a property from above by setting the inheritance value in the current element to 0 or 2, which would indicate that the element is not to be inherited.
12. 

# May 14

I'm slightly concerned about the perf impact of the actual set and get functions, and the memory footprint of the props system in general. I'm not sure exactly how object shape optimization will help. Certain properties which are always associated with each other (say, marginLeft ... marginTop) could be bundled into a single "margins" object and then destructured or restructured as necessary, but then you can't specify a specific left margin while letting the program specify the rest. Eh, premature optimization. I'm sure there are ways around it, including the primitives concept. Again, most of the time will be spent in updating and in rendering, so keeping track of changes like a hawk allows serious gains there. Jesus/V8 take the wheel!

Interface design. The only kind of UI I'll ever want to work on. Okay, so, the user has setters and getters of various names, each of which may or may not map on directly to an internal property. Hm. Deleting a property is essentially setting a property to undefined. Eventually there will be a bit more functionality but this makes sense for now. When we are given set (name, value), what should we do?

Some important functionalities on setters:
- type checking
- validity checking
- storage (with potentially a different name)
- destructuring
- type conversion

Some important functionalities on getters:
- restructuring
- retrieval (with potentially a different name)

I'm not sure how sophisticated this should be. I'll keep the interfaces relatively simple for now.

# May 16

I think a more capable renderer is in order. Currently it basically accepts a bunch of instructions, rearranges them by zIndex, compacts them and draws them, reusing the same buffers over and over. I suppose that makes sense in a static draw scenario but I think we should really make formal how the renderer works.

In a static draw, the renderer goes through all elements in a scene in order, calling the function `getRenderingInstructions()` on each. Each element may return a list of rendering instructions (bet you didn't guess that). In exactly what format, I'm not sure, but I don't think a single array is sufficient in some cases. The simplest example is a plot, which must call gl.scissor before letting its elements draw, and then releasing the scissor after. That can't be expressed in a simple "list", and even more problematically, the zIndex cannot be honored *within* a scissor. So the scissor could create its own little "zIndex bubble" in which elements are simply drawn in the global zIndex of the parent but in the order within the bubble. An example of this: Suppose you wanted to make a little "zoom" thing with a circle and a graph inside containing a smaller view of the plot. How would you do that? Well, you'd have a subelement of the plot called "magnifying glass" or whatever with a zIndex of, say, 2 (above the plot) and containing another plot, zoomed to the correct coordinates and containing a copy of each relevant element in the main plot so that the zoom looks natural. The magnifying glass would have a special instruction (somehow) saying "stencil circle at (300, 400) with radius 200".

Should all this information be captured within getRenderingInstructions() ? I think so, because it provides the best balance of abstraction to simplicity and optimizability. Okay, here is the specification:

1. At the lowest, abstract level, the renderer takes a list of instructions and returns a canvas.
2. The renderer traverses each element in the scene, recursively, calling `getRenderingInstructions()` on each.
3. An element who returns `undefined` is basically a no-op. An element may return a single instruction or an array of instructions, and a group may additionally return instructions to render before, context instructions, and instructions to render after.
4. Renderers can *accept* instructions like the following: `{ type: "polyline", vertices: [ 30, 40, 100, 500 ], pen: "black" }`. If an instruction has no type, it is invalid.
* Example return values: `{ type: "text", text: "Hello", font: "Comic Sans", position: { x: 4, y: 500 }, align: "baseline" }`
* `[{ type: "rectangle", x: 4, y: 100, w: 30, h: 80, zIndex: 1 }, {type: "text", ..., zIndex: Infinity}]`
* `{ beforeChildren: [{type: "rectangle", x: 3, y: 8, w: 254, h: 254}], instructions: [... goes inside context, at the beginning ...], context: [{ type: "scissor", x: 5, y: 10, w: 250, h: 250}], afterChildren: [] }`
5. The determination of instruction order is a bit complex. Instructions may specify a zIndex which will reorder them into a "layer" above or below that of other elements. The default zIndex is 0. A background image might have a zIndex of -Infinity, while a highlighted function plot might be 1.
6. The default zIndex of "text" instructions is Infinity.
7. If a group defines a context instruction like { scissor: ... }, its children are not sorted into the normal zIndex system, *unless* they are configured to escape the context with "escapeContext: true".
8. The default escapeContext of "text" instructions is true.
9. Renderers may combine instructions into larger instructions to minimize the number of bufferData and drawArrays calls.

I think the context stuff will use a similar system to the "popping" of canvas 2d contexts after save. Seems natural. But I'm going to ignore contexts for now and focus on the elements. Elements can do a bunch of funky stuff, like moving between groups, reordering, being added or being deleted. That's complicated and annoying. We could use a "diff" type system, but if the scene completely changes it will be useless.

Okay, ignore contexts for now. All the instructions are split up into their zIndexes... now, we can keep track of which instructions came from which element. The order of the instructions in each zIndex is exactly the order of the elements in the tree. Most of the instructions will be in the same zIndex.


# June 3

BigFloats have consumed my mind. They aren't actually as bad as I previously thought. It's just math, some simple primitive operations, and error bounding. At least, until we get to division. I'm scared of division. Oh well, let's focus on addition, subtraction and multiplication.

We store a big float as m * (2^30)^e, where m is interpreted as a number in [2^-30, 1) and stored as a series of 30-bit words, with the first word being the largest.

Converting from a double to a big float is relatively straightforward; we just insert and shift the mantissa as appropriate. Converting the other way is also pretty easy; we truncate to 53 bits precision and convert. Mathematical operations, however, are not so simple. We start with addition.

To add two floats together, we have to add two mantissas m1 and m2, where m2 is potentially shifted some words to the right. (We assume that m1 is more or as significant as m2 wlog.) The addition should be stored at certain *precision* with a certain *rounding mode*.

Currently, precision is given as a number of *bits*, not as a number of *words*, which is a bit confusing but just means truncating a couple bits of the last word. In the WHATEVER rounding mode we don't even bother truncating the last bits, which often gives a more precise result, but isn't "technically correct". The thing is that numbers will otherwise have varying precisions depending on their size relative to 2^30, so we implement affirmative action. Unless we throw up our hands and say "WHATEVER" to the problem.

There are seven rounding modes: NEAREST, TIES_AWAY, DOWN, UP, TOWARD_INF, TOWARD_ZERO, WHATEVER. NEAREST is ties to even; ties--results which lay exactly half way between representable numbers--are rounded so the least significant bit is even. TIES_AWAY always ties results towards the infinities. DOWN and UP are self-explanatory; TOWARD_INF and TOWARD_ZERO are towards the infinities and towards zero, respectively.


# June 12

BigFloats are going reasonably well, but I'm setting myself a pretty difficult goal of having a relatively functional Mandelbrot viewer by June 18. Not really achievable, I know, but if I really put my mind to it ... ?

I'm going to partially rewrite the elements code to include stuff about instructions and contexts so the elements have richer control over what the renderer does. A lot of the code can still work; I'll just start with a simple text element and rewrite the renderer code.

# June 15

Progress made on the renderer; using VAOs now and in a way that will be eventually optimizable. Excited about that. Next focus is the prop system; it'd be annoying to have to recode a bunch of elements when the prop system changes. I've deliberated on this issue for many hours, but the overall approach is relatively simple. Each property has a *value*, a *changed* status, and potentially an *inherit* value, a *userValue*, and a *programValue*. *changed* contains a bitset of what has changed; the first bit is whether the value has changed, the second bit is whether the user value has changed, and the third bit is whether the program value has changed.

The *value* of a certain property depends on many factors. Some properties have a very simple rule: default value of 0, user can set it to any value, and it will remain that way. When the user sets the value to *undefined*, it sets the value to the default of 0. Some properties may not even have a default value, and will be deleted when the user sets its value to undefined.
