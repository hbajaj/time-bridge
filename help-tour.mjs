/* TimeBridge: optional, reversible, accessible in-app help and guided walkthrough.
 * Never edits clocks, participants, storage preferences, or saved teams.
 */
export const TOUR_COMPLETED_KEY='timebridge-tour-completed-v1';
export const TOUR_STEPS=Object.freeze([
 {tab:'clocks',target:'#card-local',title:'Your time stays first',body:'Your device time zone is detected automatically. The first clock always shows your local time, including daylight saving changes.'},
 {tab:'clocks',target:'#clock-add-toggle',title:'Add any city',body:'Choose Add Clock to browse 250 countries and their states, provinces and cities, or search a city name. Adding a clock also adds a meeting location.'},
 {tab:'clocks',target:'.clock-order-controls',fallback:'#clock-restore',title:'Put clocks in your order',body:'Use the ↑ and ↓ controls to rearrange any non-local clock, including added cities. On desktop, you can also drag cards. Order is saved on this device.'},
 {tab:'meetings',target:'#participant-list',title:'Choose who is meeting',body:'Clocks and meeting locations share one list. Open a participant to customize working hours and use the remove controls when needed.'},
 {tab:'meetings',target:'#priority',title:'Set the meeting rules',body:'Choose a meeting duration and a preference: best balance, earliest available or strictly inside working hours.'},
 {tab:'meetings',target:'#best',fallback:'#recommend-date',title:'Compare the suggestions',body:'TimeBridge recommends holiday-aware meeting windows in each location’s local time. Review the recommended slot, other options and any trade-offs before inviting people.'},
 {tab:'meetings',target:'#teams-disclosure',title:'Save a team for next time',body:'You can save and reload familiar sets of meeting participants on this device. No account is required.'},
 {tab:'holidays',target:'#holiday-year',title:'Review public holidays',body:'Browse the calendar for your selected locations, choose a year and check the source notes. Holiday coverage varies by country, and last-minute or local holidays may be missing.'},
]);
export function mountHelpTour({tabs,doc=document,win=window,storage=null}={}){
 const $=id=>doc.getElementById(id);
 const help=$('tb-help-dialog'),tour=$('tb-tour'),open=$('tb-help-open');
 const helpClose=$('tb-help-close'),start=$('tb-help-start-tour');
 const tourClose=$('tb-tour-close'),tourBack=$('tb-tour-back'),tourNext=$('tb-tour-next');
 const tourLabel=$('tb-tour-progress'),tourTitle=$('tb-tour-title'),tourText=$('tb-tour-body');
 const helpFocusables=()=>[...help.querySelectorAll('button,a[href],input,select')].filter(el=>!el.disabled&&!el.hidden);
 let index=-1,highlight=null,returnTab='clocks',helpReturn=null,tourReturn=null;
 const active=()=>tabs.getActive?.()||'clocks';
 function focusHelp(event){
  if(event.key==='Escape'){event.preventDefault();closeHelp();return}
  if(event.key!=='Tab')return;
  const f=helpFocusables();if(!f.length)return;
  if(event.shiftKey&&doc.activeElement===f[0]){event.preventDefault();f.at(-1).focus()}
  if(!event.shiftKey&&doc.activeElement===f.at(-1)){event.preventDefault();f[0].focus()}
 }
 function openHelp(){
  if(index>=0)closeTour(false);
  helpReturn=doc.activeElement;
  help.hidden=false;helpClose.focus();
 }
 function closeHelp({restoreFocus=true}={}){
  help.hidden=true;
  if(restoreFocus)(helpReturn?.isConnected?helpReturn:open)?.focus();
 }
 function clearHighlight(){
  if(highlight){highlight.classList.remove('tb-tour-highlight');highlight=null}
 }
 function displayStep(){
  clearHighlight();
  const step=TOUR_STEPS[index];
  if(!step)return;
  tabs.activate(step.tab,{save:false,hash:false,focus:false,scroll:false});
  let target=doc.querySelector(step.target);
  if(!target||target.hidden||target.getClientRects().length===0)target=doc.querySelector(step.fallback||'#tab-'+step.tab);
  highlight=target;
  highlight?.classList.add('tb-tour-highlight');
  tourLabel.textContent='Step '+(index+1)+' of '+TOUR_STEPS.length;
  tourTitle.textContent=step.title;
  tourText.textContent=step.body;
  tourBack.disabled=index===0;
  tourNext.textContent=index===TOUR_STEPS.length-1?'Finish tour':'Next →';
  if(highlight && typeof highlight.scrollIntoView==='function')
   highlight.scrollIntoView({block:'center',behavior:'instant'});
  tourNext.focus({preventScroll:true});
 }
 function closeTour(completed=false){
  if(index<0)return;
  clearHighlight();tour.hidden=true;index=-1;
  if(completed){try{storage?.setItem(TOUR_COMPLETED_KEY,'true')}catch{}}
  tabs.activate(returnTab,{save:false,hash:false,focus:false,scroll:false});
  const next=tourReturn?.isConnected?tourReturn:open;next?.focus({preventScroll:true});
 }
 function openTour(){
  returnTab=active();
  tourReturn=help.hidden?doc.activeElement:open;
  if(!help.hidden)closeHelp({restoreFocus:false});
  index=0;tour.hidden=false;displayStep();
 }
 open?.addEventListener('click',openHelp);
 helpClose?.addEventListener('click',()=>closeHelp());
 start?.addEventListener('click',openTour);
 tourClose?.addEventListener('click',()=>closeTour(false));
 tourBack?.addEventListener('click',()=>{if(index>0){index--;displayStep()}});
 tourNext?.addEventListener('click',()=>{if(index>=TOUR_STEPS.length-1)closeTour(true);else{index++;displayStep()}});
 help?.addEventListener('keydown',focusHelp);
 doc.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(index>=0){event.preventDefault();closeTour(false)}
  else if(!help.hidden){event.preventDefault();closeHelp()}
 });
 const helpHint=$('tb-help-hint');
 if(helpHint){
  const isCompleted=()=>{try{return storage?.getItem(TOUR_COMPLETED_KEY)==='true'}catch{return false}};
  helpHint.hidden=Boolean(isCompleted());
  start?.addEventListener('click',()=>helpHint.hidden=true);
  tourNext?.addEventListener('click',()=>{if(index===-1)helpHint.hidden=true});
 }
 return {openHelp,openTour,closeHelp,closeTour,getStep:()=>index};
}
