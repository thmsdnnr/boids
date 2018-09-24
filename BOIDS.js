// Factors for calculating rules
const COM_FACTOR = 0.0001 // 1
const TOO_CLOSE_MAGNITUDE = 1000 // 2
const VELOCITY_MATCH_FACTOR = 0.0125 // 3
const POSITION_MULTIPLIER = 20
const VELOCITY_LIMIT = 0.1

const FLINGBACK_VELOCITY = 1

const BOID_HEIGHT = 3
const BOID_WIDTH = 3

const MAX_X = 1000
const MAX_Y = 500

function Boid (initialPosition = new V2(0, 0), initialVelocity = new V2(0, 0)) {
  this.position = initialPosition
  this.velocity = initialVelocity
  Boid.numInstances = (Boid.numInstances || 0) + 1
  this.id = Boid.numInstances // an autoincrementing boid ID
  this.normalizePosition = function (maxX, maxY) {
    if (this.position.x * POSITION_MULTIPLIER < 0) {
      this.velocity.x = FLINGBACK_VELOCITY
    } else if (this.position.x * POSITION_MULTIPLIER > MAX_X * POSITION_MULTIPLIER) {
      this.velocity.x = -1 * FLINGBACK_VELOCITY
    }
    if (this.position.y * POSITION_MULTIPLIER > MAX_Y * POSITION_MULTIPLIER) {
      this.velocity.y = -1 * FLINGBACK_VELOCITY
    } else if (
      this.position.y * POSITION_MULTIPLIER <
      -5 * POSITION_MULTIPLIER
    ) {
      this.velocity.y = FLINGBACK_VELOCITY
    }
  }
  this.draw = function (ctx) {
    ctx.fillStyle = 'gold'
    ctx.fillRect(
      this.position.x + BOID_WIDTH / 2 * POSITION_MULTIPLIER,
      this.position.y + BOID_HEIGHT / 2 * POSITION_MULTIPLIER,
      BOID_WIDTH,
      BOID_HEIGHT
    )
  }
}

function V2 (x = 0, y = 0) {
  this.x = x
  this.y = y

  this.add = function (addedVector) {
    return new V2(this.x + addedVector.x, this.y + addedVector.y)
  }

  this.subtract = function (subtractedVector) {
    return new V2(this.x - subtractedVector.x, this.y - subtractedVector.y)
  }

  this.multiply = function (magnitude) {
    return new V2(this.x * magnitude, this.y * magnitude)
  }

  this.magnitude = () => Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2))
}

function rule1 (boid, boidList) {
  let theOtherBoids = boidList.filter(boidId => boid.id != boidId.id)
  let avgPosition = new V2()
  theOtherBoids.forEach(boid => (avgPosition = avgPosition.add(boid.position)))
  return avgPosition
    .multiply(1 / theOtherBoids.length)
    .subtract(boid.position)
    .multiply(COM_FACTOR)
}

function rule2 (boid, boidList) {
  let newPositionVector = new V2()
  boidList
    .filter(boidId => boid.id !== boidId.id)
    .map(otherBoid => otherBoid.position)
    .filter(
      otherBoidPosition =>
        otherBoidPosition.subtract(boid.position).magnitude() <
        TOO_CLOSE_MAGNITUDE
    )
    .map(tooCloseBoid =>
      newPositionVector.subtract(tooCloseBoid.subtract(boid.position))
    )
  return newPositionVector
}

function rule3 (boid, boidList) {
  return boidList
    .filter(boidId => boid.id !== boidId.id)
    .map(otherBoid => otherBoid.velocity)
    .reduce((boidA, boidB) => boidA.add(boidB), new V2())
    .multiply(1 / boidList.length)
    .multiply(VELOCITY_MATCH_FACTOR)
}

const limitVelocity = v =>
  (v.magnitude > VELOCITY_LIMIT ? v / v.magnitude * VELOCITY_LIMIT : v)

function updateBoidPositions (boidList) {
  boidList.forEach(boid => {
    boid.velocity = limitVelocity(
      boid.velocity.add(
        rule1(boid, boidList)
          .add(rule2(boid, boidList))
          .add(rule3(boid, boidList))
      )
    )
    boid.position = boid.position.add(boid.velocity)
    boid.normalizePosition(MAX_X, MAX_Y)
  })
}

function drawSelf (boidList, ctx) {
  boidList.forEach(boid => boid.draw(ctx))
}

const BOID_START_CT = 100

let boidList = []
let ctx

function fillBoidList () {
  // Make some random boids
  let list = []
  for (var i = 0; i < BOID_START_CT; i++) {
    list.push(
      new Boid(
        new V2(
          Math.random() * POSITION_MULTIPLIER,
          Math.random() * POSITION_MULTIPLIER,
        ),
          new V2(Math.random(), Math.random())
        )
      )
  }
  return list
}

document.addEventListener('DOMContentLoaded', fly)

let c

function fly () {
  c = document.getElementById('birdflock')
  c.width = '1000'
  c.height = '900'
  c.style.width = '500px'
  c.style.height = '450px'
  ctx = c.getContext('2d')
  ctx.translate(0.5, 0.5)
  const scaleFactor = window.devicePixelRatio
  ctx.scale(scaleFactor, scaleFactor)
  boidList = fillBoidList()
  window.requestAnimationFrame(step)
}

const fpsInterval = 1000 / 24
let then = Date.now()

function step () {
  window.requestAnimationFrame(step)
  now = Date.now()
  elapsed = now - then
  if (elapsed < fpsInterval) {
    return
  }
  then = now - elapsed % fpsInterval
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, c.width, c.height)
  updateBoidPositions(boidList)
  drawSelf(boidList, ctx)
}