
sfile = "data/gamma.json"

function = Gamma
min = -20
max = 20
samples = 200

sampleX = Map[Random[Real, {min, max}] &, Range[0, samples]]

table = Map[function, sampleX]

Export[sfile, {"x" -> sampleX, "y" -> table}]
