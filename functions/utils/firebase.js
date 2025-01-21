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
  console.log("Document snapshot data:", docSnap.data());
  if (docSnap.exists) {
    console.log(
      "Stored refresh token retrieved:",
      docSnap.data().refresh_token
    );
    return docSnap.data().refresh_token;
  } else {
    console.warn("No refresh token found in Firestore. Using env variable.");
    return process.env.FREEE_REFRESH_TOKEN;
  }
}

export async function saveRefreshToken(newToken) {
  const docRef = firestore.doc(TOKEN_DOC_PATH);
  await docRef.set({ refresh_token: newToken }, { merge: true });
  console.log("Refresh token saved to Firestore:", newToken);
}

export async function initializeRefreshToken() {
  const docRef = firestore.doc(TOKEN_DOC_PATH);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.log(
      "Firestore にリフレッシュトークンが存在しません。初期トークンを登録します。"
    );
    const initialToken = process.env.FREEE_REFRESH_TOKEN; // .env から初期トークンを取得
    await saveRefreshToken(initialToken);
    console.log("初期トークンを Firestore に保存しました。");
  } else {
    console.log(
      "Firestore に既存のリフレッシュトークンがあります。初期化は不要です。"
    );
  }
}
