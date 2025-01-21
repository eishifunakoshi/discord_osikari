import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json" assert { type: "json" };

// Firebase Admin SDK の初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
const TOKEN_DOC_PATH = "tokens/freee_refresh_token";

export async function getStoredRefreshToken() {
  const docRef = firestore.doc(TOKEN_DOC_PATH);
  const docSnap = await docRef.get(); // ドキュメントを取得
  if (docSnap.exists) {
    return docSnap.data().refresh_token;
  } else {
    console.warn("No refresh token found in Firestore. Using env variable.");
    return process.env.FREEE_REFRESH_TOKEN;
  }
}

export async function saveRefreshToken(newToken) {
  const docRef = firestore.doc(TOKEN_DOC_PATH);
  await docRef.set({ refresh_token: newToken }, { merge: true });
}

export async function initializeRefreshToken() {
  const docRef = firestore.doc(TOKEN_DOC_PATH);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    const initialToken = process.env.FREEE_REFRESH_TOKEN; // .env から初期トークンを取得
    await saveRefreshToken(initialToken);
  } else {
  }
}
