"use strict";

const SLOT_PASSWORDS={
  1:"38423",
  2:"39099",
  3:"02833",
  4:"82731",
  5:"29373",
  6:"63742",
  7:"92382",
  8:"92842",
  9:"93832"
};

const PUBLIC_LIMIT=5000;
const PRIVATE_LIMIT=10000;

const PUBLIC_USED="barmaan_cloud_public_used";
const PRIVATE_USED="barmaan_cloud_private_used";
const FILES="barmaan_cloud_files";
const LOCK_COUNT="barmaan_cloud_lock_count";
const LOCK_START="barmaan_cloud_lock_start";
const LOCK_DURATION="barmaan_cloud_lock_duration";
const PERMANENT="barmaan_cloud_permanent";
const SYNC="barmaan_cloud_sync";

const POSTS_URL="posts.json";

const LOCK_TIMES=[
  600000,
  1800000,
  3600000,
  5400000,
  7200000,
  86400000,
  604800000,
  31536000000
];

let currentSlot=0;
let cloudPosts=[];

const pages=[
  "homePage",
  "publicPage",
  "loginPage",
  "privatePage",
  "checkPage",
  "fullPage",
  "noSpacePage",
  "lockPage"
];

function $(id){
  return document.getElementById(id);
}

function show(id){
  pages.forEach(page=>{
    const element=$(page);
    if(element){
      element.classList.add("hidden");
    }
  });

  const target=$(id);

  if(target){
    target.classList.remove("hidden");
  }
}

/* =========================================
   FULL STORAGE FLASHING RED
========================================= */

(function installStorageFlashStyle(){
  if(document.getElementById("barmaanStorageFlashStyle")){
    return;
  }

  const style=document.createElement("style");
  style.id="barmaanStorageFlashStyle";

  style.textContent=`
    @keyframes barmaanStorageFlashRed{
      0%,100%{
        background-color:red !important;
        color:white !important;
        box-shadow:0 0 5px red;
      }

      50%{
        background-color:#700000 !important;
        color:white !important;
        box-shadow:0 0 20px red;
      }
    }

    .barmaan-full-storage-flashing{
      animation:barmaanStorageFlashRed 0.7s infinite;
      color:white !important;
      background-color:red !important;
      border-color:red !important;
    }

    .barmaan-full-storage-text{
      animation:barmaanStorageFlashRed 0.7s infinite;
      color:white !important;
      background-color:red !important;
      padding:2px 5px;
      border-radius:4px;
    }
  `;

  document.head.appendChild(style);
})();

function setFullState(element,full){
  if(!element){
    return;
  }

  if(full){
    element.classList.add("barmaan-full-storage-flashing");
    element.setAttribute("data-storage-status","FULL");
  }else{
    element.classList.remove("barmaan-full-storage-flashing");
    element.removeAttribute("data-storage-status");

    element.style.backgroundColor="";
    element.style.color="";
    element.style.boxShadow="";
  }
}

function setFullTextState(element,full){
  if(!element){
    return;
  }

  if(full){
    element.classList.add("barmaan-full-storage-text");
  }else{
    element.classList.remove("barmaan-full-storage-text");
  }
}

/* =========================================
   LOCK SYSTEM
========================================= */

function isLocked(){
  if(localStorage.getItem(PERMANENT)==="1"){
    return true;
  }

  const start=Number(
    localStorage.getItem(LOCK_START)||0
  );

  const duration=Number(
    localStorage.getItem(LOCK_DURATION)||0
  );

  if(!start||!duration){
    return false;
  }

  if(Date.now()-start<duration){
    return true;
  }

  localStorage.removeItem(LOCK_START);
  localStorage.removeItem(LOCK_DURATION);

  return false;
}

function home(){
  if(isLocked()){
    showLock();
    return;
  }

  show("homePage");
  updateStats();
}

/* =========================================
   PUBLIC STORAGE - FILE COUNT
========================================= */

function getPublicUsed(){
  return Number(
    localStorage.getItem(PUBLIC_USED)||0
  );
}

function setPublicUsed(value){
  value=Math.max(
    0,
    Math.min(PUBLIC_LIMIT,value)
  );

  localStorage.setItem(
    PUBLIC_USED,
    String(value)
  );
}

function publicFull(){
  return getPublicUsed()>=PUBLIC_LIMIT;
}

function publicPercent(){
  return Math.min(
    100,
    getPublicUsed()/PUBLIC_LIMIT*100
  );
}

function publicAvailable(){
  return Math.max(
    0,
    PUBLIC_LIMIT-getPublicUsed()
  );
}

function updatePublic(){
  const used=getPublicUsed();
  const available=publicAvailable();
  const percent=publicPercent();
  const full=used>=PUBLIC_LIMIT;

  if($("publicUsed")){
    $("publicUsed").textContent=
      available.toLocaleString()+" files available";
  }

  if($("publicPercent")){
    $("publicPercent").textContent=
      percent.toFixed(1)+"%";
    setFullTextState(
      $("publicPercent"),
      full
    );
  }

  if($("publicProgress")){
    $("publicProgress").style.width=
      percent+"%";

    setFullState(
      $("publicProgress"),
      full
    );
  }

  if($("publicUsed2")){
    $("publicUsed2").textContent=
      available.toLocaleString()+" files available";

    setFullTextState(
      $("publicUsed2"),
      full
    );
  }

  if($("publicPercent2")){
    $("publicPercent2").textContent=
      percent.toFixed(1)+"%";

    setFullTextState(
      $("publicPercent2"),
      full
    );
  }

  if($("publicProgress2")){
    $("publicProgress2").style.width=
      percent+"%";

    setFullState(
      $("publicProgress2"),
      full
    );
  }

  if($("publicPercentText")){
    $("publicPercentText").textContent=
      percent.toFixed(1)+"%";

    setFullTextState(
      $("publicPercentText"),
      full
    );
  }

  if($("publicPercentText2")){
    $("publicPercentText2").textContent=
      percent.toFixed(1)+"%";

    setFullTextState(
      $("publicPercentText2"),
      full
    );
  }
}

/* =========================================
   PRIVATE STORAGE - FILE COUNT
========================================= */

function getPrivateUsage(){
  try{
    return JSON.parse(
      localStorage.getItem(
        PRIVATE_USED
      )||"{}"
    );
  }catch(error){
    return {};
  }
}

function privateUsed(slot){
  const data=getPrivateUsage();

  return Number(
    data[slot]||0
  );
}

function privatePercent(slot){
  return Math.min(
    100,
    privateUsed(slot)/
    PRIVATE_LIMIT*100
  );
}

function privateAvailable(slot){
  return Math.max(
    0,
    PRIVATE_LIMIT-privateUsed(slot)
  );
}

function updatePrivate(){
  for(let slot=1;slot<=9;slot++){

    const percent=privatePercent(slot);
    const available=privateAvailable(slot);
    const full=percent>=100;

    const element=$(
      "percent"+slot
    );

    if(element){
      element.textContent=
        percent.toFixed(1)+"%";

      setFullTextState(
        element,
        full
      );
    }

    const progress=$(
      "progress"+slot
    );

    if(progress){
      progress.style.width=
        percent+"%";

      setFullState(
        progress,
        full
      );
    }

    const text=$(
      "percentText"+slot
    );

    if(text){
      text.textContent=
        percent.toFixed(1)+"%";

      setFullTextState(
        text,
        full
      );
    }

    const usedElement=$(
      "used"+slot
    );

    if(usedElement){
      usedElement.textContent=
        available.toLocaleString()+
        " files available";

      setFullTextState(
        usedElement,
        full
      );
    }
  }
}

function updateStats(){
  updatePublic();
  updatePrivate();
}

/* =========================================
   POSTS
========================================= */

async function loadPosts(){
  try{
    const response=await fetch(
      POSTS_URL,
      {
        cache:"no-store"
      }
    );

    if(!response.ok){
      throw new Error(
        "posts.json unavailable"
      );
    }

    const data=
      await response.json();

    cloudPosts=
      Array.isArray(data)?
      data:
      [];

  }catch(error){
    cloudPosts=[];
  }

  return cloudPosts;
}

/* =========================================
   SLOT NORMALIZATION
========================================= */

function normalizeSlot(slot){

  if(
    String(slot).toLowerCase()==="public"
  ){
    return "public";
  }

  const text=String(
    slot||""
  );

  const match=text.match(
    /slot\s*([1-9])/i
  );

  if(match){
    return "slot"+match[1];
  }

  if(/^[1-9]$/.test(text)){
    return "slot"+text;
  }

  if(/^slot[1-9]$/i.test(text)){
    return text.toLowerCase();
  }

  return text.toLowerCase();
}

function postBelongsToSlot(post,slot){

  const wanted=
    normalizeSlot(slot);

  const actual=
    normalizeSlot(
      post.slot||
      post.space||
      post.storage
    );

  return actual===wanted;
}

function getPostsForSlot(slot){

  return cloudPosts.filter(
    post=>
      postBelongsToSlot(
        post,
        slot
      )
  );
}
/* =========================================
   POST FILE INFORMATION
========================================= */

function postFileName(post){

  return String(
    post.file||
    post.name||
    post.filename||
    ""
  ).trim();
}

function hasRestorableFile(post){
  return postFileName(post)!=="";
}

function findPostByFile(name,slot){

  const target=
    String(name||"")
    .trim()
    .toLowerCase();

  return getPostsForSlot(slot).find(
    post=>
      postFileName(post)
      .toLowerCase()===target
  );
}

function getRestorePassword(post){

  return String(
    post.backupPassword||
    post.password||
    post.restorePassword||
    ""
  );
}

function getDownloadURL(post){

  const file=
    postFileName(post);

  return String(
    post.url||
    post.link||
    post.download||
    file
  );
}

/* =========================================
   RESTORE BUTTON
========================================= */

function renderRestoreButton(post){

  if(!hasRestorableFile(post)){
    return "";
  }

  const id=safe(
    String(
      post.id||
      postFileName(post)
    )
  );

  return `
    <button
      type="button"
      class="restoreButton"
      data-restore-id="${id}">
      Restore
    </button>
  `;
}

function renderPostFile(post,slot){

  const file=
    postFileName(post);

  const caption=
    post.caption||"";

  const type=
    getFileType(file);

  return `
    <div class="file ${type}">
      <b>${safe(file)}</b>
      <br>
      ${
        caption?
        "Caption: "+safe(caption)+"<br>":
        ""
      }
      ${renderRestoreButton(post)}
    </div>
  `;
}

function renderCloudPosts(slot){

  const posts=
    getPostsForSlot(slot)
    .filter(hasRestorableFile);

  if(!posts.length){
    return "";
  }

  return posts.map(
    post=>
      renderPostFile(
        post,
        slot
      )
  ).join("");
}

/* =========================================
   PUBLIC
========================================= */

async function openPublic(){

  if(isLocked()){
    showLock();
    return;
  }

  await loadPosts();

  if(publicFull()){
    show("fullPage");
    return;
  }

  show("publicPage");

  updatePublic();
  renderPublic();
}

function join(slot){

  if(isLocked()){
    showLock();
    return;
  }

  if(publicFull()){
    show("fullPage");
    return;
  }

  currentSlot=slot;

  if($("loginText")){
    $("loginText").textContent=
      "Enter password for Slot "+
      slot+".";
  }

  if($("slotPassword")){
    $("slotPassword").value="";
  }

  if($("loginError")){
    $("loginError").textContent="";
  }

  show("loginPage");
}

/* =========================================
   LOGIN
========================================= */

function login(){

  const password=
    $("slotPassword")?
    $("slotPassword").value:
    "";

  if(
    password!==SLOT_PASSWORDS[currentSlot]
  ){
    if($("loginError")){
      $("loginError").textContent=
        "Incorrect password.";
    }

    return;
  }

  if($("loginError")){
    $("loginError").textContent="";
  }

  openPrivate(currentSlot);
}

/* =========================================
   PRIVATE PAGE
========================================= */

async function openPrivate(slot){

  if(isLocked()){
    showLock();
    return;
  }

  currentSlot=slot;

  await loadPosts();

  if($("privateTitle")){
    $("privateTitle").textContent=
      "Slot "+slot;
  }

  const used=
    privateUsed(slot);

  const available=
    privateAvailable(slot);

  const percent=
    privatePercent(slot);

  const full=
    percent>=100;

  if($("privateInfo")){

    $("privateInfo").innerHTML=
      "<b>Slot "+slot+"</b><br>"+
      "10,000 files available total<br>"+
      available.toLocaleString()+
      " files available<br>"+
      percent.toFixed(1)+
      "% full"+
      '<div class="progress">'+
      '<div class="bar private" '+
      'style="width:'+
      percent+
      '%"></div>'+
      "</div>";

    const bar=
      $("privateInfo").querySelector(
        ".bar"
      );

    setFullState(
      bar,
      full
    );

    setFullTextState(
      $("privateInfo"),
      full
    );
  }

  renderPrivate(slot);

  show("privatePage");
}

/* =========================================
   LOCAL FILES
========================================= */

function getFiles(){

  try{

    return JSON.parse(
      localStorage.getItem(
        FILES
      )||"[]"
    );

  }catch(error){

    return [];
  }
}

/* =========================================
   TYPE LEGEND
========================================= */

function renderTypeLegend(){

  return `
    <div class="legend">

      <div class="type doc">
        DOC - Blue
      </div>

      <div class="type photo">
        Photo - Green
      </div>

      <div class="type video">
        Video - Red
      </div>

      <div class="type apk">
        APK / EXE - Yellow
      </div>

      <div class="type mobile">
        Mobile backup/config - Pink
      </div>

    </div>
  `;
}

/* =========================================
   PUBLIC FILE LIST
========================================= */

function renderPublic(){

  const localFiles=
    getFiles().filter(
      file=>
        normalizeSlot(
          file.slot
        )==="public"
    );

  const cloud=
    renderCloudPosts(
      "public"
    );

  if(
    !localFiles.length&&!cloud
  ){

    if($("publicFiles")){
      $("publicFiles").textContent=
        "No files in Public Slot.";
    }

    return;
  }

  if($("publicFiles")){

    $("publicFiles").innerHTML=
      renderTypeLegend()+
      localFiles.map(
        renderFile
      ).join("")+
      cloud;
  }

  bindRestoreButtons();
}

/* =========================================
   PRIVATE FILE LIST
========================================= */

function renderPrivate(slot){

  const localFiles=
    getFiles().filter(
      file=>
        Number(file.slot)===slot
    );

  const cloud=
    renderCloudPosts(
      "slot"+slot
    );

  if(
    !localFiles.length&&!cloud
  ){

    if($("privateFiles")){
      $("privateFiles").textContent=
        "No private files.";
    }

    return;
  }

  if($("privateFiles")){

    $("privateFiles").innerHTML=
      renderTypeLegend()+
      localFiles.map(
        renderFile
      ).join("")+
      cloud;
  }

  bindRestoreButtons();
}

/* =========================================
   FILE RENDER
========================================= */

function renderFile(file){

  const type=
    getFileType(
      file.name||
      file.type||
      ""
    );

  const post=
    findPostByFile(
      file.name,
      file.slot
    );

  return `
    <div class="file ${type}">

      <b>
        ${safe(
          file.name||
          "Backup"
        )}
      </b>

      <br>

      Type:
      ${safe(
        file.type||
        "Unknown"
      )}

      ${
        file.caption?
        "<br>Caption: "+
        safe(file.caption):
        ""
      }

      ${
        post?
        renderRestoreButton(post):
        ""
      }

    </div>
  `;
}

/* =========================================
   FILE TYPE
========================================= */

function getFileType(name){

  const n=
    String(name)
    .toLowerCase();

  if(
    n.endsWith(".jpg")||
    n.endsWith(".jpeg")||
    n.endsWith(".png")||
    n.endsWith(".gif")||
    n.endsWith(".webp")
  ){
    return "photoFile";
  }

  if(
    n.endsWith(".mp4")||
    n.endsWith(".mkv")||
    n.endsWith(".avi")||
    n.endsWith(".mov")
  ){
    return "videoFile";
  }

  if(
    n.endsWith(".apk")||
    n.endsWith(".exe")
  ){
    return "apkFile";
  }

  if(
    n.includes("mobileconfig")||
    n.includes("backup")||
    n.includes("config")
  ){
    return "mobileFile";
  }

  return "docFile";
}

/* =========================================
   CHECK PAGE
========================================= */

function openCheck(){

  if(isLocked()){
    showLock();
    return;
  }

  if($("checkSlot")){
    $("checkSlot").value="";
  }

  if($("checkPassword")){
    $("checkPassword").value="";
  }

  if($("checkError")){
    $("checkError").textContent="";
  }

  if($("checkResult")){
    $("checkResult")
      .classList
      .add("hidden");
  }

  show("checkPage");
}

function checkPrivate(){

  const slot=
    Number(
      $("checkSlot")?
      $("checkSlot").value:
      0
    );

  const password=
    $("checkPassword")?
    $("checkPassword").value:
    "";

  if(slot<1||slot>9){

    if($("checkError")){
      $("checkError").textContent=
        "Enter Slot 1 to Slot 9.";
    }

    return;
  }

  if(
    password!==SLOT_PASSWORDS[slot]
  ){

    if($("checkError")){
      $("checkError").textContent=
        "Incorrect password.";
    }

    return;
  }

  if($("checkError")){
    $("checkError").textContent="";
  }

  const files=
    getFiles().filter(
      file=>
        Number(file.slot)===slot
    );

  const posts=
    getPostsForSlot(
      "slot"+slot
    ).filter(
      hasRestorableFile
    );

  if(!$("checkResult")){
    return;
  }

  $("checkResult")
    .classList
    .remove("hidden");

  if(files.length||posts.length){

    $("checkResult").innerHTML=
      "<h3>Already owned</h3>"+
      "<p>Here's full please manage here</p>"+
      files.map(
        renderFile
      ).join("")+
      posts.map(
        post=>
          renderPostFile(
            post,
            "slot"+slot
          )
      ).join("");

    bindRestoreButtons();

  }else{

    $("checkResult").innerHTML=
      "<h3>No files.</h3>"+
      "<p>This Slot is empty.</p>";
  }
}
/* =========================================
   SYNC
========================================= */

function agree(){

  localStorage.setItem(
    SYNC,
    "1"
  );

  show("homePage");

  updateStats();
}

/* =========================================
   REFUSE / LOCK
========================================= */

function refuse(){

  let count=
    Number(
      localStorage.getItem(
        LOCK_COUNT
      )||0
    );

  count++;

  localStorage.setItem(
    LOCK_COUNT,
    String(count)
  );

  if(count>=9){

    localStorage.setItem(
      PERMANENT,
      "1"
    );

    localStorage.setItem(
      LOCK_START,
      String(Date.now())
    );

    showLock();
    return;
  }

  const duration=
    LOCK_TIMES[count-1];

  localStorage.setItem(
    LOCK_DURATION,
    String(duration)
  );

  localStorage.setItem(
    LOCK_START,
    String(Date.now())
  );

  showLock();
}

function showLock(){

  show("lockPage");

  updateTimer();
}

function updateTimer(){

  const button=
    $("sorryButton");

  if(
    localStorage.getItem(
      PERMANENT
    )==="1"
  ){

    if($("timer")){
      $("timer").textContent=
        "PERMANENTLY LOCKED";
    }

    if(button){
      button.disabled=true;
    }

    return;
  }

  const start=
    Number(
      localStorage.getItem(
        LOCK_START
      )||0
    );

  const duration=
    Number(
      localStorage.getItem(
        LOCK_DURATION
      )||0
    );

  const remaining=
    Math.max(
      0,
      duration-
      (Date.now()-start)
    );

  if(remaining<=0){

    if($("timer")){
      $("timer").textContent=
        "00:00:00";
    }

    if(button){
      button.disabled=false;
    }

    return;
  }

  if(button){
    button.disabled=true;
  }

  if($("timer")){
    $("timer").textContent=
      formatTime(remaining);
  }

  setTimeout(
    updateTimer,
    1000
  );
}

function formatTime(ms){

  let seconds=
    Math.ceil(
      ms/1000
    );

  const days=
    Math.floor(
      seconds/86400
    );

  seconds%=86400;

  const hours=
    Math.floor(
      seconds/3600
    );

  seconds%=3600;

  const minutes=
    Math.floor(
      seconds/60
    );

  seconds%=60;

  if(days){

    return days+"d "+
      String(hours)
        .padStart(2,"0")+":"+
      String(minutes)
        .padStart(2,"0")+":"+
      String(seconds)
        .padStart(2,"0");
  }

  return String(hours)
    .padStart(2,"0")+":"+
    String(minutes)
      .padStart(2,"0")+":"+
    String(seconds)
      .padStart(2,"0");
}

function sorry(){

  if(isLocked()){
    updateTimer();
    return;
  }

  localStorage.removeItem(
    LOCK_START
  );

  localStorage.removeItem(
    LOCK_DURATION
  );

  home();
}

function safe(value){

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

/* =========================================
   RESTORE BUTTON BINDING
========================================= */

function bindRestoreButtons(){

  document
    .querySelectorAll(
      ".restoreButton"
    )
    .forEach(button=>{

      button.onclick=()=>{

        const id=
          button.dataset
            .restoreId;

        restorePost(id);
      };

    });
}

function findPostById(id){

  return cloudPosts.find(
    post=>
      String(
        post.id||
        postFileName(post)
      )===
      String(id)
  );
}

/* =========================================
   RESTORE SYSTEM
========================================= */

async function restorePost(id){

  const post=
    findPostById(id);

  if(
    !post||
    !hasRestorableFile(post)
  ){
    return;
  }

  /*
   * PUBLIC:
   * Restore requires the backup password.
   *
   * PRIVATE:
   * The user already entered the Slot password,
   * so no second password is requested.
   */

  if(
    normalizeSlot(
      post.slot
    )==="public"
  ){

    const password=
      prompt(
        "Enter backup password:"
      );

    if(password===null){
      return;
    }

    if(
      password!==
      getRestorePassword(post)
    ){

      alert(
        "restore unsuccessful"
      );

      return;
    }
  }

  await runRestore(post);
}

async function runRestore(post){

  const file=
    postFileName(post);

  showRestorePage();

  const timer=
    $("restoreTimer");

  const title=
    $("restoreTitle");

  const progress=
    $("restoreProgress");

  if(title){
    title.textContent=
      "Restore in progress...";
  }

  if(progress){

    progress.style.width=
      "0%";

    progress.textContent=
      "0%";
  }

  let value=0;

  await new Promise(
    resolve=>{

      const interval=
        setInterval(()=>{

          value+=10;

          if(progress){

            progress.style.width=
              value+"%";

            progress.textContent=
              value+"%";
          }

          if(timer){

            timer.textContent=
              "Restoring "+
              file;
          }

          if(value>=100){

            clearInterval(
              interval
            );

            resolve();
          }

        },100);

    }
  );

  const url=
    getDownloadURL(post);

  const link=
    document.createElement(
      "a"
    );

  link.href=url;
  link.download=file;
  link.target="_blank";
  link.rel="noopener";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  showRestoreSuccess();
}

function showRestorePage(){

  let page=
    $("restorePage");

  if(!page){

    page=
      document.createElement(
        "div"
      );

    page.id=
      "restorePage";

    page.className=
      "restorePage";

    document.body.appendChild(
      page
    );
  }

  page.classList.remove(
    "hidden"
  );

  page.innerHTML=`
    <h1 id="restoreTitle">
      Restore in progress...
    </h1>

    <p id="restoreTimer">
      Preparing...
    </p>

    <div class="progress">
      <div
        id="restoreProgress"
        class="bar"
        style="width:0%">
        0%
      </div>
    </div>

    <div id="restoreResult"></div>
  `;

  pages.forEach(id=>{

    const element=$(id);

    if(element){

      element.classList.add(
        "hidden"
      );
    }

  });
}
function showRestoreSuccess(){

  const result=
    $("restoreResult");

  if(!result){
    return;
  }

  result.innerHTML=
    "<h2>restore suscsufull</h2>"+
    '<button type="button" id="restoreOk">'+
    "Ok</button>";

  $("restoreOk").onclick=()=>{

    const page=
      $("restorePage");

    if(page){

      page.classList.add(
        "hidden"
      );
    }

    home();
  };
}

function bindRestoreNavigation(){

  const button=
    $("restoreBack");

  if(button){
    button.onclick=home;
  }
}

function refreshRestoreButtons(){

  if(
    !$("publicFiles")&&
    !$("privateFiles")
  ){
    return;
  }

  bindRestoreButtons();
}

/* =========================================
   BUTTON EVENTS
========================================= */

if($("publicButton")){
  $("publicButton").onclick=
    openPublic;
}

if($("checkButton")){
  $("checkButton").onclick=
    openCheck;
}

if($("loginButton")){
  $("loginButton").onclick=
    login;
}

if($("checkPrivateButton")){
  $("checkPrivateButton").onclick=
    checkPrivate;
}

if($("agreeButton")){
  $("agreeButton").onclick=
    agree;
}

if($("refuseButton")){
  $("refuseButton").onclick=
    refuse;
}

if($("sorryButton")){
  $("sorryButton").onclick=
    sorry;
}

document
  .querySelectorAll(
    ".join"
  )
  .forEach(button=>{

    button.onclick=()=>{

      join(
        Number(
          button.dataset.slot
        )
      );

    };

  });

document
  .querySelectorAll(
    ".back"
  )
  .forEach(button=>{

    button.onclick=home;

  });

/* =========================================
   INITIALIZATION
========================================= */

loadPosts()
.then(()=>{

  updateStats();

  if(isLocked()){
    showLock();
  }else{
    show("homePage");
  }

})
.catch(()=>{

  updateStats();

  if(isLocked()){
    showLock();
  }else{
    show("homePage");
  }

});

setInterval(()=>{

  if(isLocked()){

    if(
      $("lockPage")&&
      !$("lockPage")
        .classList
        .contains("hidden")
    ){

      updateTimer();
    }

  }

},1000);

window.addEventListener(
  "pageshow",
  ()=>{

    loadPosts()
      .then(()=>{

        refreshRestoreButtons();
        updateStats();

      });

  }
);

/* =========================================
   PUBLIC API
========================================= */

window.BarmaanCloud={

  loadPosts,
  renderPublic,
  renderPrivate,
  restorePost,
  getPostsForSlot,
  updatePublic,
  updatePrivate,
  updateStats,
  getPublicUsed,
  privateUsed,
  publicPercent,
  privatePercent

};
