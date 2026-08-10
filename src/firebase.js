import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCZdufWRDk6MNmafTjSgWRJUJYZ6eMPouE',
  authDomain: 'billdesk-ps.firebaseapp.com',
  projectId: 'billdesk-ps',
  storageBucket: 'billdesk-ps.firebasestorage.app',
  messagingSenderId: '1094924748908',
  appId: '1:1094924748908:web:aaad56f683455920e9f049',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
