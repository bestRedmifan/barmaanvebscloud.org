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


/* =========================================
   STORAGE FLASH STYLE
========================================= */

(function installStorageFlashStyle(){

  if($("barmaanStorageFlashStyle")){
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


/* =========================================
   PAGE SYSTEM
========================================= */

function show(id){

  pages.forEach(pageId=>{

    const page=$(pageId);

    if(page){
      page.classList.add("hidden");
    }

  });

  const target=$(id);

  if(target){
    target.classList.remove("hidden");
  }

}


/* =========================================
   LOCK SYSTEM
========================================= */

function isLocked(){

  if(
    localStorage.getItem(PERMANENT)==="1"
  ){
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
   PUBLIC STORAGE
========================================= */

function getPublicUsed(){

  const value=Number(
    localStorage.getItem(PUBLIC_USED)||0
  );

  if(
    !Number.isFinite(value)||
    value<0
  ){
    return 0;
  }

  return Math.min(
    PUBLIC_LIMIT,
    Math.floor(value)
  );

}


function setPublicUsed(value){

  let number=Number(value);

  if(
    !Number.isFinite(number)||
    number<0
  ){
    number=0;
  }

  number=Math.min(
    PUBLIC_LIMIT,
    Math.floor(number)
  );

  localStorage.setItem(
    PUBLIC_USED,
    String(number)
  );

  updateStats();

}


function publicAvailable(){

  return Math.max(
    0,
    PUBLIC_LIMIT-getPublicUsed()
  );

}


function publicFull(){

  return getPublicUsed()>=PUBLIC_LIMIT;

}


function publicPercent(){

  return Math.min(
    100,
    (getPublicUsed()/PUBLIC_LIMIT)*100
  );

}


/* =========================================
   PRIVATE STORAGE
========================================= */

function getPrivateUsage(){

  try{

    const data=JSON.parse(
      localStorage.getItem(PRIVATE_USED)||"{}"
    );

    if(
      data&&
      typeof data==="object"&&
      !Array.isArray(data)
    ){
      return data;
    }

  }catch(error){}

  return {};

}


function savePrivateUsage(data){

  localStorage.setItem(
    PRIVATE_USED,
    JSON.stringify(data)
  );

}


function privateUsed(slot){

  const data=getPrivateUsage();

  const value=Number(
    data[String(slot)]||0
  );

  if(
    !Number.isFinite(value)||
    value<0
  ){
    return 0;
  }

  return Math.min(
    PRIVATE_LIMIT,
    Math.floor(value)
  );

}


function setPrivateUsed(slot,value){

  const data=getPrivateUsage();

  let number=Number(value);

  if(
    !Number.isFinite(number)||
    number<0
  ){
    number=0;
  }

  number=Math.min(
    PRIVATE_LIMIT,
    Math.floor(number)
  );

  data[String(slot)]=number;

  savePrivateUsage(data);

  updateStats();

}


function privateAvailable(slot){

  return Math.max(
    0,
    PRIVATE_LIMIT-privateUsed(slot)
  );

}


function privateFull(slot){

  return privateUsed(slot)>=PRIVATE_LIMIT;

}


function privatePercent(slot){

  return Math.min(
    100,
    (privateUsed(slot)/PRIVATE_LIMIT)*100
  );

}


/* =========================================
   FULL STORAGE STYLE
========================================= */

function setFullState(element,full){

  if(!element){
    return;
  }

  if(full){

    element.classList.add(
      "barmaan-full-storage-flashing"
    );

  }else{

    element.classList.remove(
      "barmaan-full-storage-flashing"
    );

  }

}


function setFullTextState(element,full){

  if(!element){
    return;
  }

  if(full){

    element.classList.add(
      "barmaan-full-storage-text"
    );

  }else{

    element.classList.remove(
      "barmaan-full-storage-text"
    );

  }

}


/* =========================================
   UPDATE ALL STATS
========================================= */

function updateStats(){

  const publicUsed=
    getPublicUsed();

  const publicRemain=
    publicAvailable();

  const publicPct=
    publicPercent();

  const publicFullState=
    publicFull();


  if($("publicUsed")){
    $("publicUsed").textContent=
      publicUsed+" files";
  }

  if($("publicAvailable")){
    $("publicAvailable").textContent=
      publicRemain+" files";
  }

  if($("publicPercent")){
    $("publicPercent").textContent=
      publicPct.toFixed(1)+"%";
  }

  if($("publicProgress")){

    $("publicProgress").style.width=
      publicPct+"%";

    $("publicProgress").textContent=
      publicPct.toFixed(1)+"%";

    setFullState(
      $("publicProgress"),
      publicFullState
    );

  }

  if($("publicPercentText")){

    $("publicPercentText").textContent=
      publicPct.toFixed(1)+"%";

    setFullTextState(
      $("publicPercentText"),
      publicFullState
    );

  }


  if($("publicUsed2")){
    $("publicUsed2").textContent=
      publicUsed+" files";
  }

  if($("publicTotal2")){
    $("publicTotal2").textContent=
      PUBLIC_LIMIT+" files";
  }

  if($("publicPercent2")){
    $("publicPercent2").textContent=
      publicPct.toFixed(1)+"%";
  }

  if($("publicProgress2")){

    $("publicProgress2").style.width=
      publicPct+"%";

    $("publicProgress2").textContent=
      publicPct.toFixed(1)+"%";

    setFullState(
      $("publicProgress2"),
      publicFullState
    );

  }

  if($("publicPercentText2")){

    $("publicPercentText2").textContent=
      publicPct.toFixed(1)+"%";

    setFullTextState(
      $("publicPercentText2"),
      publicFullState
    );

  }


  for(let slot=1;slot<=9;slot++){

    const remain=
      privateAvailable(slot);

    const pct=
      privatePercent(slot);

    const full=
      privateFull(slot);

    if($("available"+slot)){

      $("available"+slot).textContent=
        remain+" files available";

    }

    if($("percent"+slot)){

      $("percent"+slot).textContent=
        pct.toFixed(1)+"%";

    }

    if($("progress"+slot)){

      $("progress"+slot).style.width=
        pct+"%";

      $("progress"+slot).textContent=
        pct.toFixed(1)+"%";

      setFullState(
        $("progress"+slot),
        full
      );

    }

    if($("percentText"+slot)){

      $("percentText"+slot).textContent=
        pct.toFixed(1)+"%";

      setFullTextState(
        $("percentText"+slot),
        full
      );

    }

  }

}


/* =========================================
   PUBLIC UPDATE
========================================= */

function updatePublic(){

  const used=
    getPublicUsed();

  const remain=
    publicAvailable();

  const pct=
    publicPercent();

  const full=
    publicFull();


  if($("publicUsed")){
    $("publicUsed").textContent=
      used+" files";
  }

  if($("publicAvailable")){
    $("publicAvailable").textContent=
      remain+" files";
  }

  if($("publicPercent")){
    $("publicPercent").textContent=
      pct.toFixed(1)+"%";
  }

  if($("publicProgress")){

    $("publicProgress").style.width=
      pct+"%";

    $("publicProgress").textContent=
      pct.toFixed(1)+"%";

    setFullState(
      $("publicProgress"),
      full
    );

  }

  if($("publicPercentText")){

    $("publicPercentText").textContent=
      pct.toFixed(1)+"%";

    setFullTextState(
      $("publicPercentText"),
      full
    );

  }


  if($("publicUsed2")){
    $("publicUsed2").textContent=
      used+" files";
  }

  if($("publicTotal2")){
    $("publicTotal2").textContent=
      PUBLIC_LIMIT+" files";
  }

  if($("publicPercent2")){
    $("publicPercent2").textContent=
      pct.toFixed(1)+"%";
  }

  if($("publicProgress2")){

    $("publicProgress2").style.width=
      pct+"%";

    $("publicProgress2").textContent=
      pct.toFixed(1)+"%";

    setFullState(
      $("publicProgress2"),
      full
    );

  }

  if($("publicPercentText2")){

    $("publicPercentText2").textContent=
      pct.toFixed(1)+"%";

    setFullTextState(
      $("publicPercentText2"),
      full
    );

  }

}


/* =========================================
   PRIVATE UPDATE
========================================= */

function updatePrivate(slot){

  const used=
    privateUsed(slot);

  const remain=
    privateAvailable(slot);

  const pct=
    privatePercent(slot);

  const full=
    privateFull(slot);


  if($("privateInfo")){

    $("privateInfo").innerHTML=
      "<b>Slot "+slot+"</b><br>"+
      remain+" files available<br>"+
      used+" files used<br>"+
      pct.toFixed(1)+"% full"+
      '<div class="progress">'+
      '<div class="bar private" style="width:'+
      pct+
      '%">'+
      pct.toFixed(1)+
      "%</div></div>";


    const bar=
      $("privateInfo")
      .querySelector(".bar");


    setFullState(
      bar,
      full
    );

    setFullTextState(
      $("privateInfo"),
      full
    );

  }

}


/* =========================================
   POSTS
========================================= */

async function loadPosts(){

  try{

    const response=
      await fetch(
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

  const text=
    String(slot||"");

  const match=
    text.match(
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
   FIND POST
========================================= */

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
   FILE TYPE
========================================= */

function getFileType(name){

  const n=
    String(name||"")
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
    n.endsWith(".mov")||
    n.endsWith(".webm")
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
   LOCAL FILES
========================================= */

function getFiles(){

  try{

    const files=
      JSON.parse(
        localStorage.getItem(FILES)||"[]"
      );

    return Array.isArray(files)?
      files:
      [];

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
   RESTORE BUTTON
========================================= */

function renderRestoreButton(post){

  if(!hasRestorableFile(post)){
    return "";
  }

  const id=
    safe(
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


function bindRestoreButtons(){

  document
    .querySelectorAll(".restoreButton")
    .forEach(button=>{

      button.onclick=()=>{

        const id=
          button.dataset.restoreId;

        restorePost(id);

      };

    });

}


/* =========================================
   CLOUD POST RENDER
========================================= */

function renderCloudPosts(slot){

  const posts=
    getPostsForSlot(slot)
    .filter(hasRestorableFile);

  if(!posts.length){
    return "";
  }

  return posts
    .map(post=>
      renderPostFile(
        post,
        slot
      )
    )
    .join("");

}


function renderPostFile(post,slot){

  const file=
    postFileName(post);

  const caption=
    post.caption||
    "";

  const type=
    getFileType(file);

  return `
    <div class="file ${type}">
      <b>${safe(file)}</b>
      <br>
      ${
        caption?
        "Caption: "+
        safe(caption)+
        "<br>":
        ""
      }
      ${renderRestoreButton(post)}
    </div>
  `;

}


/* =========================================
   LOCAL FILE RENDER
========================================= */

function renderFile(file){

  const name=
    file.name||
    file.type||
    "Backup";

  const type=
    getFileType(name);

  const post=
    findPostByFile(
      name,
      file.slot
    );

  return `
    <div class="file ${type}">
      <b>${safe(name)}</b>
      <br>
      Type:
      ${safe(file.type||"Unknown")}
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
   PUBLIC RENDER
========================================= */

function renderPublic(){

  const localFiles=
    getFiles().filter(
      file=>
        normalizeSlot(file.slot)==="public"
    );

  const cloud=
    renderCloudPosts("public");


  if(
    !localFiles.length&&
    !cloud
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
      localFiles
        .map(renderFile)
        .join("")+
      cloud;

  }

  bindRestoreButtons();

}


/* =========================================
   PRIVATE RENDER
========================================= */

function renderPrivate(slot){

  const localFiles=
    getFiles().filter(
      file=>
        Number(file.slot)===
        Number(slot)
    );

  const cloud=
    renderCloudPosts(
      "slot"+slot
    );


  if(
    !localFiles.length&&
    !cloud
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
      localFiles
        .map(renderFile)
        .join("")+
      cloud;

  }

  bindRestoreButtons();

}


/* =========================================
   RESTORE PAGE
========================================= */

function showRestorePage(){

  let page=
    $("restorePage");

  if(!page){

    page=
      document.createElement("div");

    page.id=
      "restorePage";

    page.className=
      "restorePage hidden";

    document.body.appendChild(page);

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

    const element=
      $(id);

    if(element){
      element.classList.add(
        "hidden"
      );
    }

  });

}


/* =========================================
   RUN RESTORE
========================================= */

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


  await new Promise(resolve=>{

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
            "Restoring "+file;

        }


        if(value>=100){

          clearInterval(interval);

          resolve();

        }

      },100);

  });


  const url=
    getDownloadURL(post);


  if(url){

    const link=
      document.createElement("a");

    link.href=
      url;

    link.download=
      file;

    link.target=
      "_blank";

    link.rel=
      "noopener";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

  }


  showRestoreSuccess();

}


/* =========================================
   RESTORE PASSWORD
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


  const slot=
    normalizeSlot(
      post.slot
    );


  if(slot==="public"){

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


/* =========================================
   RESTORE SUCCESS
========================================= */

function showRestoreSuccess(){

  const result=
    $("restoreResult");

  if(!result){
    return;
  }


  result.innerHTML=
    "<h2>restore successful</h2>"+
    '<button type="button" id="restoreOk">'+
    "Ok</button>";


  const button=
    $("restoreOk");


  if(button){

    button.onclick=()=>{

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

}


function bindRestoreNavigation(){

  const button=
    $("restoreBack");

  if(button){
    button.onclick=
      home;
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
   PUBLIC / PRIVATE OPENING
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

  if(
    !Number.isInteger(slot)||
    slot<1||
    slot>9
  ){
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

  updatePrivate(slot);

  renderPrivate(slot);

  show("privatePage");

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
    $("checkResult").classList.add(
      "hidden"
    );
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
        Number(file.slot)===
        slot
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


  $("checkResult").classList.remove(
    "hidden"
  );


  if(
    files.length||
    posts.length
  ){

    $("checkResult").innerHTML=
      "<h3>Already owned</h3>"+
      "<p>Here's full please manage here</p>"+
      files
        .map(renderFile)
        .join("")+
      posts
        .map(post=>
          renderPostFile(
            post,
            "slot"+slot
          )
        )
        .join("");


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
   LOCK / BAN
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
    Math.ceil(ms/1000);


  const days=
    Math.floor(
      seconds/86400
    );


  seconds%=
    86400;


  const hours=
    Math.floor(
      seconds/3600
    );


  seconds%=
    3600;


  const minutes=
    Math.floor(
      seconds/60
    );


  seconds%=
    60;


  if(days){

    return days+
      "d "+
      String(hours)
        .padStart(2,"0")+
      ":"+
      String(minutes)
        .padStart(2,"0")+
      ":"+
      String(seconds)
        .padStart(2,"0");

  }


  return String(hours)
    .padStart(2,"0")+
    ":"+
    String(minutes)
      .padStart(2,"0")+
    ":"+
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


/* =========================================
   SAFE HTML
========================================= */

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
   FILE COUNT HELPERS
========================================= */

function countPublicFiles(){

  return getFiles().filter(
    file=>
      normalizeSlot(file.slot)==="public"
  ).length;

}


function countPrivateFiles(slot){

  return getFiles().filter(
    file=>
      Number(file.slot)===
      Number(slot)
  ).length;

}


/* =========================================
   STORAGE SYNCHRONIZATION
========================================= */

function syncLocalFileCounts(){

  const files=
    getFiles();


  const publicFiles=
    files.filter(
      file=>
        normalizeSlot(file.slot)==="public"
    ).length;


  if(
    !localStorage.getItem(
      PUBLIC_USED
    )
  ){

    localStorage.setItem(
      PUBLIC_USED,
      String(
        Math.min(
          PUBLIC_LIMIT,
          publicFiles
        )
      )
    );

  }


  const usage=
    getPrivateUsage();


  for(let slot=1;slot<=9;slot++){

    if(
      typeof usage[String(slot)]===
      "undefined"
    ){

      usage[String(slot)]=
        Math.min(
          PRIVATE_LIMIT,
          countPrivateFiles(slot)
        );

    }

  }


  savePrivateUsage(usage);

}


/* =========================================
   HOME REFRESH
========================================= */

function refreshCloud(){

  syncLocalFileCounts();

  updateStats();

  updatePublic();

  if(currentSlot>=1&&currentSlot<=9){
    updatePrivate(currentSlot);
  }

}


/* =========================================
   BACK BUTTON SUPPORT
========================================= */

function goHome(){

  home();

}


function goPublic(){

  openPublic();

}


function goPrivate(){

  if(
    currentSlot>=1&&
    currentSlot<=9
  ){

    openPrivate(
      currentSlot
    );

  }else{

    home();

  }

}


/* =========================================
   ERROR HANDLING
========================================= */

window.addEventListener(
  "error",
  event=>{

    if(
      event&&
      event.error
    ){
      console.error(
        event.error
      );
    }

  }
);


window.addEventListener(
  "unhandledrejection",
  event=>{

    if(
      event&&
      event.reason
    ){
      console.error(
        event.reason
      );
    }

  }
);
/* =========================================
   EVENT LISTENERS
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


/* =========================================
   PRIVATE SLOT BUTTONS
========================================= */

document
  .querySelectorAll(".join")
  .forEach(button=>{

    button.onclick=()=>{

      join(
        Number(
          button.dataset.slot
        )
      );

    };

  });


/* =========================================
   BACK BUTTONS
========================================= */

document
  .querySelectorAll(".back")
  .forEach(button=>{

    button.onclick=
      home;

  });


/* =========================================
   ENTER KEY SUPPORT
========================================= */

if($("slotPassword")){

  $("slotPassword").addEventListener(
    "keydown",
    event=>{

      if(event.key==="Enter"){
        login();
      }

    }
  );

}


if($("checkPassword")){

  $("checkPassword").addEventListener(
    "keydown",
    event=>{

      if(event.key==="Enter"){
        checkPrivate();
      }

    }
  );

}


/* =========================================
   INITIALIZATION
========================================= */

syncLocalFileCounts();

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


/* =========================================
   LOCK TIMER
========================================= */

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


/* =========================================
   PAGE SHOW REFRESH
========================================= */

window.addEventListener(
  "pageshow",
  ()=>{

    loadPosts()
      .then(()=>{

        refreshRestoreButtons();

        syncLocalFileCounts();

        updateStats();

      });

  }
);


/* =========================================
   VISIBILITY REFRESH
========================================= */

document.addEventListener(
  "visibilitychange",
  ()=>{

    if(
      document.visibilityState===
      "visible"
    ){

      syncLocalFileCounts();

      updateStats();

      if(
        $("publicPage")&&
        !$("publicPage")
          .classList
          .contains("hidden")
      ){

        updatePublic();

        renderPublic();

      }


      if(
        $("privatePage")&&
        !$("privatePage")
          .classList
          .contains("hidden")&&
        currentSlot>=1&&
        currentSlot<=9
      ){

        updatePrivate(
          currentSlot
        );

        renderPrivate(
          currentSlot
        );

      }

    }

  }
);


/* =========================================
   BROWSER STORAGE EVENT
========================================= */

window.addEventListener(
  "storage",
  event=>{

    if(
      event.key===PUBLIC_USED||
      event.key===PRIVATE_USED||
      event.key===FILES||
      event.key===LOCK_START||
      event.key===LOCK_DURATION||
      event.key===PERMANENT
    ){

      syncLocalFileCounts();

      updateStats();

      if(
        $("publicPage")&&
        !$("publicPage")
          .classList
          .contains("hidden")
      ){

        updatePublic();

        renderPublic();

      }


      if(
        $("privatePage")&&
        !$("privatePage")
          .classList
          .contains("hidden")&&
        currentSlot>=1&&
        currentSlot<=9
      ){

        updatePrivate(
          currentSlot
        );

        renderPrivate(
          currentSlot
        );

      }

    }

  }
);


/* =========================================
   GLOBAL API
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

  setPublicUsed,

  publicAvailable,

  publicFull,

  publicPercent,

  getPrivateUsage,

  privateUsed,

  setPrivateUsed,

  privateAvailable,

  privateFull,

  privatePercent,

  getFiles,

  countPublicFiles,

  countPrivateFiles,

  syncLocalFileCounts,

  refreshCloud,

  home,

  openPublic,

  openPrivate,

  openCheck,

  checkPrivate

};


/* =========================================
   FINAL STARTUP CHECK
========================================= */

(function finalStartupCheck(){

  updateStats();

  if(isLocked()){

    showLock();

  }else{

    show("homePage");

  }

})();
