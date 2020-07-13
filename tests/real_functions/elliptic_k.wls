
sfile = "data/elliptic_k.json"

function = EllipticK
min = -1
max = 1
samples = 200

sampleX = Map[Random[Real, {min, max}] &, Range[0, samples]]

table = Map[function, sampleX]

Export[sfile, {"x" -> sampleX, "y" -> table}]
