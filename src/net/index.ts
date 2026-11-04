import type { Backend } from './backend'
import { createFirestoreBackend } from './firestoreBackend'
import { createLocalBackend } from './localBackend'

let instance: Backend | null = null

/** VITE_FIREBASE_API_KEY があれば Firestore、無ければローカル同期 */
export function getBackend(): Backend {
  if (!instance) {
    instance = import.meta.env.VITE_FIREBASE_API_KEY ? createFirestoreBackend() : createLocalBackend()
  }
  return instance
}
