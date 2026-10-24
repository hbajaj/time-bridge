/* Persistent ordering for every World Clock card.
 * Local device time is a permanent first item; other locations can be rearranged.
 * Arrow buttons work with keyboard and touch; native drag-and-drop is progressive enhancement.
 */
export const CLOCK_ORDER_STORAGE_KEY='timebridge-clock-order-v1';
export function cleanClockOrder(raw,active){
  const allowed=new Set(Array.isArray(active)?active:[]);
  const result=[],seen=new Set();
  for(const value of Array.isArray(raw)?raw.slice(0,80):[]){
    if(typeof value!=='string'||!allowed.has(value)||seen.has(value))continue;
    seen.add(value);result.push(value);
  }
  for(const key of allowed)if(!seen.has(key)){result.push(key);seen.add(key)}
  return result;
}
export function shiftClock(order,zone,step){
  const list=order.slice(),from=list.indexOf(zone),to=from+step;
  if(from<0||to<0||to>=list.length||!Number.isInteger(step))return list;
  [list[from],list[to]]=[list[to],list[from]];
  return list;
}
export function positionClock(order,zone,before){
  const list=order.slice(),from=list.indexOf(zone),target=list.indexOf(before);
  if(from<0||target<0||from===target)return list;
  list.splice(from,1);
  list.splice(list.indexOf(before),0,zone);
  return list;
}
export function mountClockOrder({getParticipants,deviceZone,ZONES,canonicalZone,storage=localStorage}){
  const container=document.getElementById('clocks'),local=document.getElementById('card-local'),
    extra=document.getElementById('extra-clocks');
  const fixed=Object.entries(ZONES).map(([key,zone])=>({zone:canonicalZone(zone),card:document.getElementById('card-'+key)}));
  const canonical=value=>canonicalZone(value);
  let saved=[];
  try{const value=JSON.parse(storage.getItem(CLOCK_ORDER_STORAGE_KEY)||'[]');saved=Array.isArray(value)?value:[]}catch{}
  let current=[],dragging=null;
  const announce=(message)=>{const status=document.getElementById('clock-order-status');if(status)status.textContent=message};
  function save(){saved=current.slice();try{storage.setItem(CLOCK_ORDER_STORAGE_KEY,JSON.stringify(current))}catch{}}
  function move(zone,amount,label){
    const next=shiftClock(current,zone,amount);
    if(next.join('|')===current.join('|'))return;
    current=next;save();render();
    announce(`${label} moved to clock position ${current.indexOf(zone)+2}. Your local clock remains first.`);
    const card=[...container.querySelectorAll('.clock-card')].find(node=>node.dataset.clockZone===zone);
    card?.querySelector(amount<0?'.clock-order-up':'.clock-order-down')?.focus();
  }
  function bindDrag(card){
    if(card.dataset.clockDragBound==='true')return;
    card.dataset.clockDragBound='true';card.draggable=true;
    card.addEventListener('dragstart',event=>{
      if(event.target.closest?.('button')){event.preventDefault();return}
      dragging=card.dataset.clockZone;
      if(!dragging){event.preventDefault();return}
      event.dataTransfer?.setData('text/plain',dragging);
      if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
      card.classList.add('clock-dragging');
    });
    card.addEventListener('dragover',event=>{
      if(!dragging||dragging===card.dataset.clockZone)return;
      event.preventDefault();
      if(event.dataTransfer)event.dataTransfer.dropEffect='move';
    });
    card.addEventListener('drop',event=>{
      event.preventDefault();
      const target=card.dataset.clockZone,source=dragging;
      if(!source||!target||source===target)return;
      const next=positionClock(current,source,target);
      if(next.join('|')!==current.join('|')){
        current=next;save();render();
        announce('Clock order updated. Your local clock remains first.');
      }
      dragging=null;
    });
    card.addEventListener('dragend',()=>{
      dragging=null;for(const el of container.querySelectorAll('.clock-dragging'))el.classList.remove('clock-dragging');
    });
  }
  function render(){
    // Collect all cards before repositioning. Extras are rebuilt by linked-clocks.
    const allExtra=[...container.querySelectorAll('.extra-clock-card'),...extra.querySelectorAll('.extra-clock-card')];
    const displayed=[];
    for(const participant of getParticipants()){
      const zone=canonical(participant.zone);
      if(!zone||zone===canonical(deviceZone))continue;
      let card=fixed.find(item=>item.zone===zone)?.card;
      if(!card)card=allExtra.find(item=>canonical(item.dataset.clockZone)===zone);
      if(!card||card.hidden)continue;
      displayed.push({zone,label:participant.name,card});
    }
    current=cleanClockOrder(saved,displayed.map(x=>x.zone));
    saved=current.slice();
    const byZone=new Map(displayed.map(item=>[item.zone,item]));
    const visible=current.map(zone=>byZone.get(zone)).filter(Boolean);
    for(const [index,item] of visible.entries()){
      const card=item.card;card.dataset.clockZone=item.zone;
      card.querySelector('.clock-order-controls')?.remove();
      const controls=document.createElement('div');controls.className='clock-order-controls';
      controls.setAttribute('role','group');controls.setAttribute('aria-label',`Reorder ${item.label} clock`);
      const up=document.createElement('button');up.type='button';up.className='clock-order-up';
      up.textContent='↑';up.title=`Move ${item.label} up`;up.setAttribute('aria-label',`Move ${item.label} up`);
      up.disabled=index===0;up.addEventListener('click',()=>move(item.zone,-1,item.label));
      const down=document.createElement('button');down.type='button';down.className='clock-order-down';
      down.textContent='↓';down.title=`Move ${item.label} down`;down.setAttribute('aria-label',`Move ${item.label} down`);
      down.disabled=index===visible.length-1;down.addEventListener('click',()=>move(item.zone,1,item.label));
      controls.append(up,down);card.append(controls);
      bindDrag(card);
    }
    // Hidden defaults remain connected to original IDs for restore/remove behavior.
    const used=new Set(visible.map(item=>item.card));
    const hiddenFixed=fixed.map(x=>x.card).filter(card=>card&&!used.has(card));
    container.replaceChildren(local,...visible.map(item=>item.card),...hiddenFixed,extra);
    extra.hidden=true;
    local.draggable=false;
  }
  function reset(){saved=[];current=[];try{storage.removeItem(CLOCK_ORDER_STORAGE_KEY)}catch{}}
  return {render,reset,getOrder:()=>current.slice()};
}
