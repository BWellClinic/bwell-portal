import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

export default function Home() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [clinicDoc, setClinicDoc] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const docId = (u.email || '').replace(/\./g, '__');
        const userRef = doc(db, 'users', docId);
        const unsubUser = onSnapshot(userRef, snap => {
          if (snap.exists()) {
            setUserDoc(snap.data());
            const clinicId = (snap.data().clinic || 'Unknown')
              .replace(/\s+/g, '_')
              .replace(/[^\w\-]/g, '');
            const clinicRef = doc(db, 'clinics', clinicId);
            const unsubClinic = onSnapshot(clinicRef, csnap =>
              setClinicDoc(csnap.exists() ? csnap.data() : null)
            );
            const q = query(collection(db, 'activity'), where('owner_email', '==', u.email));
            const unsubAct = onSnapshot(q, s => {
              const items = s.docs.map(d => d.data()).sort((a, b) => b.ts - a.ts);
              setActivity(items);
            });
            return () => {
              unsubClinic && unsubClinic();
              unsubAct && unsubAct();
            };
          } else {
            setUserDoc(null);
            setClinicDoc(null);
            setActivity([]);
          }
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setUserDoc(null);
        setClinicDoc(null);
        setActivity([]);
      }
    });
    return () => unsubAuth();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      alert('Login error: ' + err.message);
    }
  }

  if (!user) {
    return (
      <div style={{ padding: 28, maxWidth: 760, margin: '0 auto' }}>
        <h2>BWell Bucks — Sign in</h2>
        <form onSubmit={handleLogin}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ width: '100%', padding: 10, margin: '8px 0' }}
          />
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Password"
            style={{ width: '100%', padding: 10, margin: '8px 0' }}
          />
          <button style={{ padding: '10px 14px' }}>Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>{userDoc?.account_name || user.email}</h2>
          <div style={{ color: '#666' }}>{userDoc?.clinic}</div>
        </div>
        <div>
          <div>Your Points: <strong>{userDoc?.points ?? 0}</strong></div>
          <div>Clinic Points: <strong>{clinicDoc?.points ?? 0}</strong></div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => signOut(auth)}>Logout</button>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Recent Activity</h3>
      <ul>
        {activity.map((a, i) => (
          <li key={i}>
            <strong>{a.bwbs}</strong> — {a.description}{' '}
            <small>({new Date(a.ts).toLocaleString()})</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
