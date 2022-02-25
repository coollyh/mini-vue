import { extend } from "../shared"

let activeEffect
let shouldTrack

class ReactiveEffect {
  public scheduler: Function | undefined
  public onStop?: () => void
  public deps = []
  private _fn

  private active = true

  constructor(fn, scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }
  run() {
    if (!this.active) {
      return this._fn()
    }
    activeEffect = this
    shouldTrack = true
    const result = this._fn()
    // reset
    shouldTrack = false
    return result
  }
  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  // _effect.onStop = options.onStop
  extend(_effect, options)

  _effect.run()
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}

const targetMap = new Map()
export function track(target, key) {
  // target->key->dep
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  if (!activeEffect) return
  if (!shouldTrack) return
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

export function trigger(target, key) {
  let depsMap = targetMap.get(target)
  let dep = depsMap.get(key)
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    }
    else {
      effect.run()
    }
  }
}

export function stop(runner) {
  runner.effect.stop()
}