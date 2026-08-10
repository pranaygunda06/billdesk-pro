import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore'
import { auth, db } from '../firebase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasAnyAdmin, setHasAnyAdmin] = useState(null)

  useEffect(() => {
    checkAdmins()
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const snap = await getDoc(doc(db, 'admins', u.uid))
        setIsAdmin(snap.exists())
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    })
  }, [])

  async function checkAdmins() {
    try {
      const q = query(collection(db, 'admins'), limit(1))
      const snap = await getDocs(q)
      setHasAnyAdmin(!snap.empty)
    } catch {
      setHasAnyAdmin(false)
    }
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    const snap = await getDoc(doc(db, 'admins', cred.user.uid))
    if (!snap.exists()) {
      await signOut(auth)
      throw new Error('Not an admin account')
    }
    setIsAdmin(true)
  }

  async function registerAdmin(email, password, name) {
    if (hasAnyAdmin) throw new Error('Admin already exists. Please login.')
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    await setDoc(doc(db, 'admins', cred.user.uid), {
      email: email.trim(),
      name: name || 'Admin',
      createdAt: new Date().toISOString(),
    })
    await setDoc(doc(db, 'settings', 'business'), {
      name: 'My Business',
      address: '',
      phone: '',
      gstNumber: '',
      upiId: '',
      invoicePrefix: 'INV',
      footer: 'Thank you for your business.',
      terms: '',
    }, { merge: true })
    setHasAnyAdmin(true)
    setIsAdmin(true)
  }

  async function logout() {
    await signOut(auth)
    setIsAdmin(false)
  }

  return (
    <Ctx.Provider value={{ user, isAdmin, loading, hasAnyAdmin, login, registerAdmin, logout, checkAdmins }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside provider')
  return v
}
