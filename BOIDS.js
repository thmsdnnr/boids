// Factors for calculating rules
const COM_FACTOR = 0.0001 // 1
const TOO_CLOSE_MAGNITUDE = 100000 // 2
const VELOCITY_MATCH_FACTOR = 0.0125 // 3
const VELOCITY_LIMIT = 2

const FLINGBACK_VELOCITY = 0.2

const BOID_HEIGHT = 5
const BOID_WIDTH = 5

const MAX_X = 2400
const MAX_Y = 1600

let c
let forcedAvg = null
const fpsInterval = 1000 / 36
let then = Date.now()

function Boid (initialPosition = new V2(0, 0), initialVelocity = new V2(0, 0)) {
  this.position = initialPosition
  this.velocity = initialVelocity
  Boid.numInstances = (Boid.numInstances || 0) + 1
  this.id = Boid.numInstances // an autoincrementing boid ID
  this.normalizePosition = function (maxX, maxY) {
    if (this.position.x < -25) {
      this.velocity.x = FLINGBACK_VELOCITY
    } else if (this.position.x > MAX_X * 0.95) {
      this.velocity.x = -1 * FLINGBACK_VELOCITY
    }
    if (this.position.y > MAX_Y * 0.95) {
      this.velocity.y = -1 * FLINGBACK_VELOCITY
    } else if (this.position.y < -25) {
      this.velocity.y = FLINGBACK_VELOCITY
    }
  }
  this.draw = function (ctx) {
    ctx.fillStyle = 'gold'
    ctx.fillRect(
      this.position.x + BOID_WIDTH / 2,
      this.position.y + BOID_HEIGHT / 2,
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
          .multiply(0.05)
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
    let dir = Math.random() > 0.5 ? 1 : -1
    list.push(
      new Boid(
        new V2(MAX_X / 5 + Math.random() * 25, MAX_Y / 5 + Math.random() * 25),
        new V2(2 * Math.random() * dir, 2 * Math.random() * dir)
      )
    )
  }
  return list
}

document.addEventListener('DOMContentLoaded', fly)

function fly () {
  c = document.getElementById('birdflock')
  c.width = MAX_X
  c.height = MAX_Y
  const scaleFactor = window.devicePixelRatio
  c.style.width = `${c.width / scaleFactor}px`
  c.style.height = `${c.height / scaleFactor}px`
  ctx = c.getContext('2d')
  ctx.translate(0.5, 0.5)
  ctx.scale(scaleFactor, scaleFactor)
  boidList = fillBoidList()
  window.requestAnimationFrame(step)
}

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
