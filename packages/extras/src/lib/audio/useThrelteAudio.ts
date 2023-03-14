import { setThrelteUserContext, useThrelteUserContext } from '@threlte/core'
import { get } from 'svelte/store'
import type { AudioListener } from 'three'

export type ThrelteAudioContext = {
  audioListeners: Map<string, AudioListener>
  getAudioListener: (id?: string) => AudioListener | undefined
  addAudioListener: (listener: AudioListener, id?: string) => void
  removeAudioListener: (id?: string) => void
}

function createAudioContext(): ThrelteAudioContext {
  const audioCtx: ThrelteAudioContext = {
    audioListeners: new Map(),
    addAudioListener: (listener, id?: string) => {
      id = id ?? 'default'
      if (audioCtx.audioListeners.has(id)) {
        console.warn(`An AudioListener with the id "${id}" has already been added, aborting.`)
        return
      }
      audioCtx.audioListeners.set(id, listener)
    },
    removeAudioListener: (id?: string) => {
      id = id ?? 'default'
      if (!audioCtx.audioListeners.has(id)) {
        console.warn(`No AudioListener with the id "${id}" found, aborting.`)
        return
      }
      audioCtx.audioListeners.delete(id)
    },
    getAudioListener: (id?: string) => {
      id = id ?? 'default'
      if (!audioCtx.audioListeners.has(id)) {
        console.warn(`No AudioListener with the id "${id}" found, aborting.`)
        return
      }
      return audioCtx.audioListeners.get(id)
    }
  }
  setThrelteUserContext<ThrelteAudioContext>('threlte-audio', audioCtx)
  return audioCtx
}

export function useThrelteAudio(): ThrelteAudioContext {
  const audioCtxStore = useThrelteUserContext<ThrelteAudioContext>('threlte-audio')
  const audioCtx = get(audioCtxStore)
  if (!audioCtx) {
    return createAudioContext()
  } else {
    return audioCtx
  }
}
