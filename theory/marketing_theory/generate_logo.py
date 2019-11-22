from math import sin,cos,pi,sqrt
centre = (100, 100)

inter_carbon = 30

simplified = True

thiqness = 7
spacing = -thiqness * sqrt(3) / 2
miter_deepness = thiqness / 2

if not simplified:
    thiqness = 4
    spacing = 2
    miter_deepness = 3

def proceed(angle, dist):
   return (centre[0] + dist * 50 * cos(angle * pi / 180), centre[1] + dist * 50 * sin(angle * pi / 180))

def get_vertex(x, y):
    if y % 2 == 0:
        return (centre[0] - inter_carbon * 3/2 * x + (0 if x % 2 != 0 else -inter_carbon/2), centre[1] + inter_carbon * sqrt(3) / 2 * y)
    else:
        return (centre[0] + 3 * inter_carbon / 2 - inter_carbon * 3/2 * x + (0 if x % 2 != 0 else -inter_carbon/2), centre[1] + inter_carbon * sqrt(3) / 2 * y)

res = 0

def cow():
    global res
    res += 1
    if res > 2 or res == 1:
        return False
    return True


def draw_vertex(vert):
    print("""<circle cx="%s" cy="%s" r="%s" stroke="%s" stroke-width="%s" fill="white" />""" % (vert[0], vert[1], 8.5 if (cow()) else 6, "gray", 2.6))

def draw_polygon(poly, style):
    print("""<polygon points="%s" style="%s" />""" % (" ".join(map(lambda p: ",".join(map(str, p)), poly)), style))

def mult(c, v):
    return [v[0] * c, v[1] * c]

def add(v1, v2):
    return [v1[0] + v2[0], v1[1] + v2[1]]

def dist(v1, v2):
    return sqrt((v1[0] - v2[0])**2 + (v1[1] - v2[1]) ** 2)


def draw_between_vertices(v1, v2):
    v = (v2[0] - v1[0], v2[1] - v1[1])

    lenv = dist(v1, v2)

    unitv = (v[0] / lenv, v[1] / lenv)
    perpuv = (-unitv[1], unitv[0])

    spmd = spacing + miter_deepness

    vertices = [add(v1, mult(spacing, unitv)), add(add(v1, mult(spmd, unitv)), mult(thiqness, perpuv)),
    add(add(v2, mult(-spmd, unitv)), mult(thiqness, perpuv)), add(v2, mult(-spacing, unitv)), add(add(v2, mult(-spmd, unitv)), mult(-thiqness, perpuv)),
    add(add(v1, mult(spmd, unitv)), mult(-thiqness, perpuv))]

    draw_polygon(vertices, "fill:#09c;")


vertices = map(lambda v: get_vertex(v[0], v[1]),
[
    [1, -3],
    [0, -2],
    [1, -2],
    [1, -1],
    [2, -1],
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 2],
    [1, 2]
])

for i in range(len(vertices) - 1):
    for j in range(i + 1, len(vertices)):
        if (dist(vertices[i], vertices[j]) < inter_carbon + 1):
            draw_between_vertices(vertices[i], vertices[j])


if not simplified:
    for vertex in vertices:
        draw_vertex(vertex)
