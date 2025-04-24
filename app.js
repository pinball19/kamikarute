// ---------- Firebase 初期化 ----------
const firebaseConfig = {
  /* 同じ config をコピペ */
};
firebase.initializeApp(firebaseConfig);
const auth   = firebase.auth();
const db     = firebase.firestore();
const store  = firebase.storage().ref();

// ---------- DOM ----------
const list         = document.getElementById("list");
const searchInput  = document.getElementById("search");
const custDlg      = document.getElementById("custDlg");
const visitList    = document.getElementById("visitList");
const custNameHd   = document.getElementById("custName");

// ---------- ログイン確認 ----------
let uid = "";
auth.onAuthStateChanged(user => {
  if (!user) location.href = "index.html";
  else {
    uid = user.uid;
    listenCustomers();
  }
});
// ---------- 顧客リアルタイム取得 ----------
function listenCustomers(){
  db.collection("users").doc(uid).collection("customers")
    .orderBy("lastVisit","desc")
    .onSnapshot(ss => {
      renderCustomers(
        ss.docs.map(d => ({id:d.id, ...d.data()}))
      );
    });
}
// ---------- 顧客一覧描画 ----------
function renderCustomers(data){
  const kw = searchInput.value.trim().toLowerCase();
  list.innerHTML = "";
  data
    .filter(c => !kw ||
      c.name.toLowerCase().includes(kw) ||
      (c.tel||"").includes(kw))
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="avatar"></div>
        <div>
          <strong>${c.name}</strong><br>
          <small>${c.lastVisit||"初来店なし"}</small>
        </div>`;
      li.onclick = () => openCustomer(c);
      list.appendChild(li);
    });
}
// 検索
searchInput.oninput = () => listenCustomers();

// ---------- 顧客追加 ----------
addCustomer.onclick = async () => {
  const name = prompt("お名前");
  if(!name) return;
  const tel  = prompt("電話番号 (任意)") || "";
  await db.collection("users").doc(uid)
          .collection("customers")
          .add({name, tel, lastVisit:null});
};
// ---------- 顧客詳細表示 ----------
let currentId="";
function openCustomer(c){
  currentId = c.id;
  custNameHd.textContent = c.name;
  custDlg.showModal();
  db.doc(`users/${uid}/customers/${c.id}`)
    .collection("visits").orderBy("day","desc")
    .onSnapshot(ss => {
      visitList.innerHTML = "";
      ss.forEach(d => {
        const v = d.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <p><small>${v.day}</small></p>
          ${v.urls.map(u=>`<img src="${u}" />`).join("")}
          <p>${v.memo||""}</p>`;
        visitList.appendChild(li);
      });
    });
}
// ---------- 来店記録追加 ----------
addVisit.onclick = async () => {
  const files = photos.files;
  const memo  = memo.value.trim();
  const urls  = [];
  for (let f of files){
    const snap = await store.child(`${uid}/${currentId}/${Date.now()}_${f.name}`).put(f);
    urls.push(await snap.ref.getDownloadURL());
  }
  const day = new Date().toISOString().split("T")[0];
  await db.doc(`users/${uid}/customers/${currentId}`)
          .collection("visits").add({day,memo,urls});
  await db.doc(`users/${uid}/customers/${currentId}`)
          .update({lastVisit:day});
  photos.value=""; memo.value="";
};
// ---------- ログアウト ----------
logout.onclick = () => auth.signOut();
