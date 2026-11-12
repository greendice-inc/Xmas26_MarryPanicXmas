import { initializeApp } from 'firebase/app'
import { collection, deleteDoc, doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore'
import type { Backend } from './backend'

export function createFirestoreBackend(): Backend {
  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  const db = getFirestore(app)

  return {
    kind: 'firestore',
    async set(col, id, data) {
      await setDoc(doc(db, col, id), data, { merge: true })
    },
    async remove(col, id) {
      await deleteDoc(doc(db, col, id))
    },
    watchDoc(col, id, cb) {
      return onSnapshot(doc(db, col, id), (s) => cb(s.exists() ? (s.data() as any) : null))
    },
    watchCol(col, cb) {
      return onSnapshot(collection(db, col), (s) => {
        const all: Record<string, any> = {}
        s.forEach((d) => (all[d.id] = d.data()))
        cb(all)
      })
    },
  }
}
