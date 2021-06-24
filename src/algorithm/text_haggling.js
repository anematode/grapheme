
// The concept of text haggling is quite simple: we want to put text labels in optimal locations where they are not
// covering up or clashing with important elements, or just being put in odd locations. We also don't want the labels
// themselves to interact too much. The solution is a somewhat physics-based system of text, which are modeled as simple
// rectangles, being "pushed" away from certain obstacles in the scene, be they functions, other text labels, or abstract
// regions where they generally shouldn't be. They will also be "pulled" towards where they desire to be so that they
// aren't positioned too far away.
