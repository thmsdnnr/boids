// Factors for calculating rules, adjusted by sliders
let COHESION_FACTOR = 1 / 10e3 // 1
let TOO_CLOSE_MAGNITUDE = 10e2 // 2
let VELOCITY_MATCH_FACTOR = 10e-3 // 3
let SPEED_DENOM = 48
let fpsInterval = 1000 / SPEED_DENOM

// Constants for simulation
const VELOCITY_LIMIT = 10
const FLINGBACK_VELOCITY = 1
const BOID_HEIGHT = 5
const BOID_WIDTH = 5
const BOID_START_CT = 100
const scaleFactor = window.devicePixelRatio
const MAX_X = window.innerWidth * scaleFactor - 100
const MAX_Y = window.innerHeight * scaleFactor - 100

// Handlers for canvas, canvas context, and animationframe
let c
let ctx
let boidList = []
let animFrameHandler

function Boid (initialPosition, initialVelocity) {
  this.position = initialPosition || new V2(0, 0)
  this.velocity = initialVelocity || new V2(0, 0)
  Boid.numInstances = (Boid.numInstances || 0) + 1
  this.id = Boid.numInstances // autoincrementing unique ID
  this.normalizePosition = (maxX, maxY) => {
    // If it's too far left or too far right
    if (this.position.x < BOID_WIDTH) {
      this.velocity.x += FLINGBACK_VELOCITY
    } else if (this.position.x > MAX_X - BOID_WIDTH) {
      this.velocity.x += -1 * FLINGBACK_VELOCITY
    }
    // Or too far up or too far down
    if (this.position.y < 5 - BOID_WIDTH) {
      this.velocity.y += FLINGBACK_VELOCITY
    } else if (this.position.y > MAX_Y - BOID_WIDTH) {
      this.velocity.y += -1 * FLINGBACK_VELOCITY
    }
  }
  this.draw = ctx => {
    ctx.fillStyle = 'gold'
    ctx.fillRect(
      (this.position.x + BOID_WIDTH / 2) / scaleFactor,
      (this.position.y + BOID_HEIGHT / 2) / scaleFactor,
      BOID_WIDTH,
      BOID_HEIGHT
    )
  }
}

function V2 (x, y) {
  // 2D vector class
  this.x = x || 0
  this.y = y || 0

  this.add = addedVector =>
    new V2(this.x + addedVector.x, this.y + addedVector.y)
  this.subtract = subtractedVector =>
    new V2(this.x - subtractedVector.x, this.y - subtractedVector.y)
  this.multiply = magnitude => new V2(this.x * magnitude, this.y * magnitude)
  this.magnitude = () => Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2))
}

function rule1 (boid, boidList) {
  // Boids try to align themselves with the average position of the flock
  let theOtherBoids = boidList.filter(boidId => boid.id != boidId.id)
  let avgPosition = new V2()
  theOtherBoids.forEach(boid => (avgPosition = avgPosition.add(boid.position)))
  return avgPosition
    .multiply(1 / theOtherBoids.length)
    .subtract(boid.position)
    .multiply(COHESION_FACTOR)
}

function rule2 (boid, boidList) {
  // Boids try to maintain a minimum distance between themselves and others
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
  // Boids try to match their velocity with that of the flock
  return boidList
    .filter(boidId => boid.id !== boidId.id)
    .map(otherBoid => otherBoid.velocity)
    .reduce((boidA, boidB) => boidA.add(boidB), new V2())
    .multiply(1 / boidList.length)
    .multiply(VELOCITY_MATCH_FACTOR)
}

const limitVelocity = v =>
  (v.magnitude() > VELOCITY_LIMIT ? v.multiply(1 / (v.magnitude() * VELOCITY_LIMIT)) : v)

function updateBoidPositions (boidList) {
  boidList.forEach(boid => {
    boid.velocity = limitVelocity(
      boid.velocity.add(
        rule1(boid, boidList)
          .add(rule2(boid, boidList))
          .add(rule3(boid, boidList))
      )
    )
    // Add the calculated ∆velocity to get the new position
    boid.position = boid.position.add(boid.velocity)
    // Make sure we aren't making the boids go off into the ether
    boid.normalizePosition(MAX_X, MAX_Y)
  })
}

const drawBoidList = (boidList, ctx) => boidList.forEach(boid => boid.draw(ctx))

function fillBoidList () {
  // Make some random boids
  let list = []
  for (var i = 0; i < BOID_START_CT; i++) {
    // Give a little randomization
    let dir = Math.random() > 0.5 ? 1 : -1
    list.push(
      new Boid(
        new V2(MAX_X / 2 + Math.random() * 25, MAX_Y / 2 + Math.random() * 25),
        new V2(5 * Math.random() * dir, 5 * Math.random() * dir)
      )
    )
  }
  return list
}

function setUpWindow () {
  // Listen to the button and sliders
  document
    .getElementById('reset')
    .addEventListener('click', resetBoidsAndStartAnimationFrames)
  document.getElementById('rule_1').addEventListener('change', e => {
    COHESION_FACTOR = 1 / Math.pow(10, e.target.value)
  })
  document.getElementById('rule_2').addEventListener('change', e => {
    TOO_CLOSE_MAGNITUDE = Math.pow(10, e.target.value)
  })
  document.getElementById('rule_3').addEventListener('change', e => {
    VELOCITY_MATCH_FACTOR = 1 / Math.pow(10, e.target.value)
  })
  document.getElementById('speed').addEventListener('change', e => {
    SPEED_DENOM = e.target.value
    fpsInterval = 1000 / SPEED_DENOM
  })
  // Set up the screen
  c = document.getElementById('birdflock')
  c.width = MAX_X
  c.height = MAX_Y
  c.style.width = `${c.width / scaleFactor}px`
  c.style.height = `${c.height / scaleFactor}px`
  ctx = c.getContext('2d')
  ctx.translate(0.5, 0.5)
  ctx.scale(scaleFactor, scaleFactor)
}

function resetBoidsAndStartAnimationFrames () {
  if (animFrameHandler) {
    window.cancelAnimationFrame(animFrameHandler)
  }
  boidList = fillBoidList()
  animFrameHandler = window.requestAnimationFrame(step)
}

function fly () {
  setUpWindow()
  resetBoidsAndStartAnimationFrames()
}

// How to know if we should draw in the next frame we're given
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
  drawBoidList(boidList, ctx)
}

// Kick off the simulation
document.addEventListener('DOMContentLoaded', fly)
