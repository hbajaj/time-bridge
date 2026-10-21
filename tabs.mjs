/* TimeBridge workspace tabs. Progressive, keyboard-friendly, single-page scrolling.
 * Displays one section at a time without altering the underlying clock/meeting logic.
 */
export const TAB_STORAGE_KEY = 'timebridge-active-tab-v1';
export const TAB_NAMES = Object.freeze(['clocks', 'meetings', 'holidays']);
const targets = Object.freeze({clocks:'clocks-view',meetings:'meeting',holidays:'holidays'});
function isTab(name) { return Object.hasOwn(targets,name); }
function fromHash(hash) {
  const key = (hash || '').replace(/^#/, '');
  return TAB_NAMES.find(name=>targets[name]===key || name===key) || null;
}
export function chooseInitialTab({hash='',search='',stored=''}={}) {
  const hashTab=fromHash(hash);
  if(hashTab)return hashTab;
  if(new URLSearchParams(search).has('at'))return 'meetings';
  return isTab(stored)?stored:'clocks';
}
export function initTabs({doc=document,win=window,storage=null}={}) {
  if(!storage){ try{storage=win.localStorage;}catch{/* Private mode: tabs remain usable. */} }
  const buttons=Object.fromEntries(TAB_NAMES.map(name=>[name,doc.getElementById(`tab-${name}`)]));
  const panels=Object.fromEntries(TAB_NAMES.map(name=>[name,doc.getElementById(targets[name])]));
  let stored=''; try{stored=storage?.getItem(TAB_STORAGE_KEY)||'';}catch{}
  let active='clocks';
  function activate(name,{focus=false,save=true,hash=false,scroll=false}={}) {
    if(!isTab(name)) return;
    active=name;
    for(const key of TAB_NAMES) {
      const selected=key===name,button=buttons[key],panel=panels[key];
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
      panel.hidden=!selected;
    }
    if(save){try{storage?.setItem(TAB_STORAGE_KEY,name);}catch{}}
    if(hash){try{win.history.replaceState(win.history.state,'',`${win.location.pathname}${win.location.search}#${targets[name]}`);}catch{}}
    if(focus)buttons[name].focus();
    if(scroll && typeof win.scrollTo==='function')win.scrollTo({top:0,behavior:'instant'});
    doc.dispatchEvent(new CustomEvent('timebridge:tabchange',{detail:{tab:name}}));
  }
  const initial=chooseInitialTab({hash:win.location.hash,search:win.location.search,stored});
  activate(initial,{save:false});
  for(const [name,button] of Object.entries(buttons)) {
    button.addEventListener('click',()=>activate(name,{save:true,hash:true,scroll:true}));
    button.addEventListener('keydown',event=>{
      const index=TAB_NAMES.indexOf(name);
      const next=event.key==='ArrowRight'?TAB_NAMES[(index+1)%TAB_NAMES.length]
                :event.key==='ArrowLeft'?TAB_NAMES[(index+TAB_NAMES.length-1)%TAB_NAMES.length]
                :event.key==='Home'?TAB_NAMES[0]
                :event.key==='End'?TAB_NAMES.at(-1):null;
      if(next){event.preventDefault();activate(next,{focus:true,save:true,hash:true,scroll:true});}
    });
  }
  win.addEventListener('hashchange',()=>{
    const name=fromHash(win.location.hash);
    if(name && name!==active)activate(name,{save:true});
  });
  // The original skip link targets the meeting panel, which is normally hidden.
  const skip=doc.querySelector('.skip[href="#meeting"]');
  skip?.addEventListener('click',event=>{
    event.preventDefault();activate('meetings',{save:true,hash:true});
    panels.meetings.focus({preventScroll:true});
    panels.meetings.scrollIntoView({block:'start',behavior:'instant'});
  });
  return {activate,getActive:()=>active};
}
