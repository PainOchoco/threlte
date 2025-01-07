import { onDestroy } from 'svelte'
import { SvelteMap, SvelteSet } from 'svelte/reactivity'
import { staticStateMetaKey } from '../../config'
import type { StaticStateMeta } from '../../types'

export const register = Symbol('register')
export const unregister = Symbol('unregister')
export const accessors = Symbol('accessors')
export const cache = Symbol('cache')
export const setValue = Symbol('setValue')
export const getCachedValue = Symbol('getValue')
export const instances = Symbol('instances')

/**
 * An abstract class that can be used to create a **static state**, e.g. a
 * configuration container with properties that are automatically added to the
 * Studio UI. Changes of the state are automatically synced to the code.
 *
 * State declared in a static state should not be mutated but only consumed.
 *
 * This class can be used in `.svelte`, `.svelte.ts` and `.svelte.js` files.
 *
 * @example
 * ```ts
 * class SceneConfig extends StaticState {
 *   cameraPosition = $state({ x: 4, y: 5, z: 0 })
 *   color = $state('#fe3d00')
 * }
 * ```
 */
export abstract class StaticState {
  static [instances]: Map<Function, Set<StaticState>> = new SvelteMap()
  static [cache]: Map<Function, Record<string | symbol, any>> = new SvelteMap()

  readonly [staticStateMetaKey]!: StaticStateMeta;

  // All accessors of the class
  [accessors]: string[] = []

  constructor() {
    // get the descriptors of the prototype
    const descriptors = Object.getOwnPropertyDescriptors(this.constructor.prototype)

    // find pairs of getters and setters which are auto-generated by the svelte
    // compiler
    this[accessors] = Object.entries(descriptors)
      .filter(([_, descriptor]) => {
        return descriptor.get && descriptor.set
      })
      .map(([key]) => key)

    let isRegistered = false

    // populate from cached values
    queueMicrotask(() => {
      this[accessors].forEach((property) => {
        const value = StaticState[getCachedValue](this.constructor, property)
        if (value !== undefined) {
          this[property as keyof this] = value
        }
      })

      if (!this[staticStateMetaKey]) return

      // Add the state to the UI
      this[register]()
      isRegistered = true
    })

    // If we're part of a component lifecycle, we need to unregister when the
    // component is destroyed
    try {
      onDestroy(() => {
        if (isRegistered) this[unregister]()
      })
    } catch {
      // ignore
    }
  }

  [register]() {
    const i = StaticState[instances].get(this.constructor)
    if (i) {
      i.add(this)
    } else {
      StaticState[instances].set(this.constructor, new SvelteSet([this]))
    }
  }

  [unregister]() {
    const i = StaticState[instances].get(this.constructor)
    if (i) {
      i.delete(this)
    }
  }

  static [setValue](constructor: Function, property: string | symbol, value: any) {
    const c = StaticState[cache].get(constructor)
    if (c) {
      c[property] = value
    } else {
      StaticState[cache].set(constructor, { [property]: value })
    }

    // update all instances
    StaticState[instances].get(constructor)?.forEach((instance) => {
      instance[property as keyof Omit<StaticState, typeof staticStateMetaKey>] = value
    })
  }

  static [getCachedValue](constructor: Function, property: string) {
    StaticState[cache].forEach((_, cons) => {
      console.log(
        cons.name,
        constructor.name,
        cons === constructor,
        cons.prototype === constructor.prototype
      )
    })
    const c = StaticState[cache].get(constructor)
    return c?.[property]
  }
}
